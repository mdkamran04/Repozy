import { db } from "@/server/db";
import { Octokit } from "@octokit/rest";
import axios from "axios";
import { aiSummariseCommit } from "./gemini";

export const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

type Response = {
  commitHash: string;
  commitMessage: string;
  commitAuthorName: string;
  commitAuthorAvatar: string;
  commitDate: string;
};

export const getCommitHashes = async (githubUrl: string): Promise<Response[]> => {
  const [owner, repo] = githubUrl.split("/").slice(-2);

  if (!owner || !repo) {
    throw new Error("Invalid Github URL");
  }

  try {
    const { data } = await octokit.rest.repos.listCommits({
      owner,
      repo,
    });

    const sortedCommits = data.sort(
      (a: any, b: any) =>
        new Date(b.commit.author.date).getTime() -
        new Date(a.commit.author.date).getTime()
    ) as any[];

    return sortedCommits.slice(0, 10).map((commit: any) => ({
      commitHash: commit.sha as string,
      commitMessage: commit.commit.message ?? "",
      commitAuthorName: commit.commit?.author?.name ?? "",
      commitAuthorAvatar: commit?.author?.avatar_url ?? "",
      commitDate: commit.commit?.author?.date ?? "",
    }));
  } catch (error: any) {
    console.error(`GitHub API error fetching commits from ${githubUrl}:`, error.message);
    
    // Handle specific error codes
    if (error.status === 502 || error.status === 503) {
      console.warn('GitHub API temporarily unavailable (502/503). Returning empty commits.');
      return [];
    }
    
    if (error.status === 403) {
      console.error('GitHub API rate limit exceeded or authentication failed.');
      throw new Error('GitHub API rate limit exceeded. Please try again later or add a GitHub token.');
    }
    
    if (error.status === 404) {
      throw new Error('Repository not found. Please check the GitHub URL.');
    }
    
    // Re-throw other errors
    throw error;
  }
};


export const pollCommits = async (projectId: string) => {
  try {
    const { githubUrl } = await fetchProjectGithubUrl(projectId);
    const commitHashes = await getCommitHashes(githubUrl);

    // If no commits fetched (e.g., GitHub API failure), return early
    if (commitHashes.length === 0) {
      console.log(`No commits to process for project ${projectId}`);
      return [];
    }

    const unprocessedCommits = await filterUnprocessedCommits(projectId, commitHashes);

    if (unprocessedCommits.length === 0) {
      console.log(`No new commits for project ${projectId}`);
      return [];
    }

    const summaryResponses = await Promise.allSettled(
      unprocessedCommits.map((commit) => summariseCommit(githubUrl, commit.commitHash))
    );

    const summaries = summaryResponses.map((response) => {
      if (response.status === "fulfilled") return response.value as string;
      return "";
    });

    await db.commit.createMany({
      data: summaries.map((summary, index) => {
        console.log(`Processing commit ${index} :`);
        const commit = unprocessedCommits[index]!;
        return {
          projectId,
          commitHash: commit.commitHash,
          commitMessage: commit.commitMessage,
          commitAuthorName: commit.commitAuthorName,
          commitAuthorAvatar: commit.commitAuthorAvatar,
          commitDate: commit.commitDate,
          summary,
        };
      }),
    });

    return unprocessedCommits;
  } catch (error) {
    console.error(`Failed to poll commits for project ${projectId}:`, error);
    // Don't throw - allow the app to continue even if commit polling fails
    return [];
  }
};


async function summariseCommit(githubUrl: string, commitHash: string) {
  const { data } = await axios.get(`${githubUrl}/commit/${commitHash}.diff`, {
    headers: {
      Accept: "application/vnd.github.v3.diff",
      Authorization: `token ${process.env.GITHUB_TOKEN}`, 
    },
  });

  return (await aiSummariseCommit(data)) || "";
}


async function fetchProjectGithubUrl(projectId: string) {
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { githubUrl: true },
  });

  if (!project) throw new Error("Project not found");

  return { githubUrl: project.githubUrl };
}

async function filterUnprocessedCommits(projectId: string, commitHashes: Response[]) {
  const processedCommits = await db.commit.findMany({
    where: { projectId },
    select: { commitHash: true },
  });

  return commitHashes.filter(
    (commit) =>
      !processedCommits.some((processed) => processed.commitHash === commit.commitHash)
  );
}
