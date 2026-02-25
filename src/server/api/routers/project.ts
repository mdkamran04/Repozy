import { pollCommits } from "@/lib/github";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { z } from "zod";
import { clerkClient } from "@clerk/clerk-sdk-node";
import { checkCredits, indexGithubRepo } from "@/lib/github-loader";


export const projectRouter = createTRPCRouter({
  createProject: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        githubUrl: z.string(),
        githubToken: z.string().optional(),
        geminiApiKey: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {

      if (!ctx.user?.userId) throw new Error("User not authenticated");

      // Fetch full user from Clerk
      const clerkUser = await clerkClient.users.getUser(ctx.user.userId);

      const primaryEmailId = clerkUser.primaryEmailAddressId;
      const primaryEmail = clerkUser.emailAddresses.find(e => e.id === primaryEmailId);
      const email = primaryEmail?.emailAddress;

      if (!email) throw new Error("User email not found");

      // Find user by email first to avoid unique constraint errors
      let user = await ctx.db.user.findUnique({ where: { emailAddress: email } });

      if (!user) {
        // Create new user if not found
        user = await ctx.db.user.create({
          data: {
            id: ctx.user.userId,
            emailAddress: email,
          },
        });
      } else if (user.id !== ctx.user.userId) {
        // Optional: update user id if it differs from session id
        user = await ctx.db.user.update({
          where: { emailAddress: email },
          data: { id: ctx.user.userId },
        });
      }
      
      const fileCount = await checkCredits(input.githubUrl, input.githubToken);
      if (user.credits < fileCount) {
        throw new Error("Not enough credits");
      }

      const project = await ctx.db.$transaction(async (tx) => {
        const createdProject = await tx.project.create({
          data: {
            githubUrl: input.githubUrl,
            name: input.name,
            creditsUsed: fileCount,
            userToProjects: { create: { userId: user.id } },
          },
        });

        await tx.user.update({
          where: { id: user.id },
          data: { credits: { decrement: fileCount } },
        });

        return createdProject;
      });

      indexGithubRepo(project.id, input.githubUrl, input.githubToken, input.geminiApiKey)
        .then(() => pollCommits(project.id))
        .catch((err) => {
          console.error("Project indexing failed:", err);
        });

      return project;
    }),

  getProjects: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.db.project.findMany({
      where: {
        userToProjects: { some: { userId: ctx.user.userId! } },
        deletedAt: null,
      },
    });
  }),
  getCommits: protectedProcedure.input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Verify user has access to this project
      const userProject = await ctx.db.userToProject.findFirst({
        where: {
          projectId: input.projectId,
          userId: ctx.user.userId!,
        },
      });

      if (!userProject) {
        throw new Error("Unauthorized: You don't have access to this project");
      }

      pollCommits(input.projectId).then().catch(console.error);
      return await ctx.db.commit.findMany({
        where: { projectId: input.projectId },
        orderBy: { commitDate: "desc" },
      });
    }),

  saveAnswer: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      question: z.string(),
      answer: z.string(),
      filesReferences: z.any()

    }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.question.create({
        data: {
          answer: input.answer,
          question: input.question,
          projectId: input.projectId,
          filesReferences: input.filesReferences,
          userId: ctx.user?.userId!
        },
      });
    }),
  getQuestions: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Verify user has access to this project
      const userProject = await ctx.db.userToProject.findFirst({
        where: {
          projectId: input.projectId,
          userId: ctx.user.userId!,
        },
      });

      if (!userProject) {
        throw new Error("Unauthorized: You don't have access to this project");
      }

      return await ctx.db.question.findMany({
        where: { projectId: input.projectId },
        include: { user: true },
        orderBy: { createdAt: "desc" },
      });
    }),
  uploadMeeting: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      meetingUrl: z.string(),
      name: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const meeting = await ctx.db.meeting.create({
        data: {
          meetingUrl: input.meetingUrl,
          projectId: input.projectId,
          name: input.name,
          status: "PROCESSING",
        }
      });
      return meeting;
    }),

  getMeetings: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Verify user has access to this project
      const userProject = await ctx.db.userToProject.findFirst({
        where: {
          projectId: input.projectId,
          userId: ctx.user.userId!,
        },
      });

      if (!userProject) {
        throw new Error("Unauthorized: You don't have access to this project");
      }

      return await ctx.db.meeting.findMany({
        where: { projectId: input.projectId },
        include: { issues: true },
      });
    }),
  deleteMeeting: protectedProcedure
    .input(z.object({ meetingId: z.string() }))
    .mutation(async ({ ctx, input }) => {

      return await ctx.db.meeting.delete({
        where: { id: input.meetingId }
      });

    }),
  getMeetingById: protectedProcedure
    .input(z.object({ meetingId: z.string() }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.meeting.findUnique({
        where: { id: input.meetingId },
        include: { issues: true },
      });
    }),
  archiveProject: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.project.update({
        where: { id: input.projectId },
        data: { deletedAt: new Date() },
      });
    }),
  getTeamMembers: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Verify user has access to this project
      const userProject = await ctx.db.userToProject.findFirst({
        where: {
          projectId: input.projectId,
          userId: ctx.user.userId!,
        },
      });

      if (!userProject) {
        throw new Error("Unauthorized: You don't have access to this project");
      }

      return await ctx.db.userToProject.findMany({
        where: { projectId: input.projectId },
        include: { user: true },
      });
    }),
  getMyCredits: protectedProcedure
    .query(async ({ ctx }) => {
      return await ctx.db.user.findUnique({
        where: { id: ctx.user.userId! },
        select: { credits: true },
      });

    }),
  checkCredits: protectedProcedure
    .input(z.object({ githubUrl: z.string(), githubToken: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const fileCount = await checkCredits(input.githubUrl, input.githubToken);
      const userCredits = await ctx.db.user.findUnique({
        where: { id: ctx.user.userId! },
        select: { credits: true },
      });
      return { fileCount, userCredits: userCredits?.credits || 0 };

    }),

  getTransactionHistory: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.user.userId!;

      // Get credit purchases
      const purchases = await ctx.db.cashfreeTransaction.findMany({
        where: { userId, status: "SUCCESS" },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          credits: true,
          createdAt: true,
          status: true,
        },
      });

      // Get projects created (credits spent)
      const projects = await ctx.db.project.findMany({
        where: {
          userToProjects: { some: { userId } },
          deletedAt: null,
        },
        select: {
          id: true,
          name: true,
          createdAt: true,
          creditsUsed: true,
        },
        orderBy: { createdAt: "desc" },
      });

      // Map to transaction format
      const transactions = [
        ...purchases.map((p) => ({
          id: p.id,
          type: "PURCHASE" as const,
          amount: p.credits,
          description: `Credits purchased`,
          date: p.createdAt,
          projectName: null as string | null,
        })),
        ...projects
          .filter((p) => p.creditsUsed > 0) // Only show projects where credits were actually spent
          .map((p) => ({
            id: p.id,
            type: "SPENT" as const,
            amount: p.creditsUsed,
            description: `Credits used for project indexing`,
            date: p.createdAt,
            projectName: p.name,
          })),
      ];

      // Sort by date descending
      return transactions.sort((a, b) => b.date.getTime() - a.date.getTime());
    }),


});
