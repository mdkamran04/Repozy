"use client";

import React from "react";

import useProject from "@/hooks/use-project";
import { ExternalLink, Github } from "lucide-react";
import Link from "next/link";
import CommitLog from "./commit-log";
import AskQuestionCard from "./ask-question-card";
import MeetingCard from "./meeting-card";
import ArchiveButton from "./archive-button";
import InviteButton from "./invite-button";
import TeamMembers from "./team-members";
import { useIndexingProgress } from "@/hooks/use-indexing-progress";
import { ProjectIndexingLoader } from "@/components/project-indexing-loader";

const DashboardPage = () => {
  const { project } = useProject();
  const { progress, isIndexing } = useIndexingProgress(project?.id ?? null);

  return (
    <div>
      {project && (
        <div className="mb-4">
          <ProjectIndexingLoader progress={progress} isIndexing={isIndexing} />
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-y-4">
        <div className="w-fit items-center rounded-md bg-primary px-2 py-3">
          <div className="flex items-center">
            <Github className="size-5 text-white" />
            <div className="ml-2">
              <p className="text-sm font-medium text-white">
                This project is linked to{" "}
                <Link
                  href={project?.githubUrl ?? ""}
                  target="_blank"
                  className="iten-center inline-flex text-white/80 underline"
                >
                  {project?.githubUrl}
                  <ExternalLink className="ml-1 size-4" />
                </Link>
              </p>
            </div>
          </div>
        </div>
        <div className="h-4"></div>
        <div className="flex items-center gap-4">
          <TeamMembers/>
          <InviteButton/>
          <ArchiveButton />
        </div>
      </div>
      <div className="mt-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-5">
          <AskQuestionCard />
          <MeetingCard />
        </div>
      </div>
      <div className="mt-8"></div>
      <CommitLog />
    </div>
  );
};

export default DashboardPage;
