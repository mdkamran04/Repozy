"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/trpc/react";
import React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

type FormInput = {
  repoUrl: string;
  projectName: string;
  githubToken?: string;
};
const CreatePage = () => {
  const { register, handleSubmit, reset } = useForm<FormInput>();
  const createProject = api.project.createProject.useMutation();
  function onSubmit(data: FormInput) {
    // window.alert(JSON.stringify(data, null, 2));
    createProject.mutate(
      {
        githubUrl: data.repoUrl,
        name: data.projectName,
        githubToken: data.githubToken,
      },
      {
        onSuccess: () => {
          toast.success("Project Created Successfully");
          reset();
        },
        onError: () => {
          toast.error("Failed to create project");
        },
      },
    );
    return true;
  }

  return (
    <div className="flex h-full items-center justify-center gap-12">
      <img src="/undraw_github.jpg" className="h-56 w-auto" />
      <div>
        <div>
          <h1 className="text-2xl font-semibold">
            Link your GitHub repository
          </h1>
          <p className="text-sm text-muted-foreground">
            Enter the URL of your repository to link it to GitOps.ai
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
            <div className="h-4"></div>
            <Button
              type="submit"
              disabled={createProject.isPending}
              className="w-full rounded-md bg-primary p-2 text-white"
            >
              Create Project
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreatePage;


