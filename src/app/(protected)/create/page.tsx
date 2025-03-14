"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import React from "react";
import { useForm } from "react-hook-form";

type FormInput = {
  repoUrl: string;
  projectName: string;
  githubToken?: string;
};
const CreatePage = () => {
  const { register, handleSubmit, reset } = useForm<FormInput>();
  function onSubmit(data: FormInput) {
    window.alert(JSON.stringify(data, null, 2));
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
          <p className="test-sm text-muted-foreground">
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
              className="w-full bg-primary text-white rounded-md p-2"
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
