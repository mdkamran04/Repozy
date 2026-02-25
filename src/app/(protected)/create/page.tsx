"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import useRefetch from "@/hooks/use-refetch";
import { api } from "@/trpc/react";
import { Info } from "lucide-react";
import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useIndexingProgress } from "@/hooks/use-indexing-progress";
import { ProjectIndexingLoader } from "@/components/project-indexing-loader";


type FormInput = {
  repoUrl: string;
  projectName: string;
  githubToken?: string;
  geminiApiKey?: string;
};
const CreatePage = () => {
  const { register, handleSubmit, reset, watch } = useForm<FormInput>();
  const createProject = api.project.createProject.useMutation();
  const checkCredits = api.project.checkCredits.useMutation();
  const refetch = useRefetch();
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);
  const [showIndexing, setShowIndexing] = useState(true);
  const { progress, isIndexing } = useIndexingProgress(createdProjectId);

  // Watch for changes to repoUrl and reset credits check
  const repoUrl = watch("repoUrl");
  useEffect(() => {
    if (checkCredits.data) {
      checkCredits.reset();
    }
  }, [repoUrl]);

  function onSubmit(data: FormInput) {
    const mutationData = {
      githubUrl: data.repoUrl,
      name: data.projectName,
      githubToken: data.githubToken,
      geminiApiKey: data.geminiApiKey,
    };

    if (!!checkCredits.data) {
      createProject.mutate(
        mutationData,
        {
          onSuccess: (data) => {
            toast.success("Project Created Successfully");
            setCreatedProjectId(data.id);
            setShowIndexing(true); // Show indexing progress
            refetch();
            reset();
          },
          onError: () => {
            toast.error("Failed to create project");
          },
        },
      );
    } else {
      checkCredits.mutate({
        githubUrl: data.repoUrl,
        githubToken: data.githubToken,
      });
    }

    return true;
  }

  const hasEnoughCredits = checkCredits?.data?.userCredits
    ? checkCredits.data?.fileCount <= checkCredits.data.userCredits
    : true;

  return (
    <div className="flex h-full items-center justify-center gap-12">
      <img src="/undraw_github.jpg" className="h-56 w-auto" />
      <div className="w-full max-w-md">
        {createdProjectId && showIndexing && (
          <div className="mb-4">
            <ProjectIndexingLoader 
              progress={progress} 
              isIndexing={isIndexing}
              onClose={() => setShowIndexing(false)}
            />
          </div>
        )}
        <div>
          <h1 className="text-2xl font-semibold">
            Link your GitHub repository
          </h1>
          <p className="text-sm text-muted-foreground">
            Enter the URL of your repository to link it to Repozy
          </p>
        </div>
        <div className="h-4"></div>
        <div>
          <form onSubmit={handleSubmit(onSubmit)}>
            <Input
              {...register("projectName", { required: true, minLength: 1 })}
              placeholder="Project Name"
            />
            <div className="h-2"></div>
            <Input
              required
              {...register("repoUrl", { required: true, minLength: 1 })}
              type="url"
              placeholder="https://github.com/owner/repo"
            />
            <div className="h-2"></div>
            <Input
              {...register("githubToken")}
              placeholder="GitHub Token (Optional)"
            />
            <div className="h-2"></div>
            <Input
              {...register("geminiApiKey")}
              placeholder="Gemini API Key (Optional)"
              type="password" // Use type="password" for sensitive inputs
            />
            {!!checkCredits.data && (
              <>
                <div className="mt-4 rounded-md border border-orange-200 bg-orange-100 px-4 py-2 text-orange-700">
                  <div className="flex items-center gap-2">
                    <Info className="size-4" />
                    <p className="text-sm">
                      You will be charged{" "}
                      <strong>{checkCredits.data?.fileCount}</strong> credits
                      for this repository!
                    </p>
                  </div>
                  <p className="ml-6 text-xs text-purple-600">
                    You have <strong>{checkCredits.data?.userCredits}</strong>{" "}
                    credits remaining.
                  </p>
                </div>
              </>
            )}
            <div className="h-4"></div>
            <Button
              type="submit"
              disabled={createProject.isPending || checkCredits.isPending || (!hasEnoughCredits)}
              className="w-full rounded-md bg-primary p-2 text-white"
            >
              {!!checkCredits.data ? `Create Project` : "Check Credits"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreatePage;