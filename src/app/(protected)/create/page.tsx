"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import useRefetch from "@/hooks/use-refetch";
import { api } from "@/trpc/react";
import { Info } from "lucide-react";
import React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";


type FormInput = {
  repoUrl: string;
  projectName: string;
  githubToken?: string;
  geminiApiKey?: string;
};
const CreatePage = () => {
  const { register, handleSubmit, reset } = useForm<FormInput>();
  const createProject = api.project.createProject.useMutation();
  const checkCredits = api.project.checkCredits.useMutation();
  const refetch = useRefetch();

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
          onSuccess: () => {
            toast.success("Project Created Successfully");
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
      <div>
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