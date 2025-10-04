"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import useProject from "@/hooks/use-project";
import Image from "next/image";
import React from "react";
import { askQuestion } from "./actions";
import { set } from "date-fns";
import { readStreamableValue } from "ai/rsc";
import MDEditor from "@uiw/react-md-editor";
import { Code } from "lucide-react";
import CodeReferences from "./code-references";
import { StreamableValue } from "ai/rsc";
import { api } from "@/trpc/react";
import { on } from "events";
import { toast } from "sonner";
import useRefetch from "@/hooks/use-refetch";

const AskQuestionCard = () => {
  const { project } = useProject();
  const [question, setQuestion] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [filesReferences, setFilesReferences] = React.useState<
    { fileName: string; sourceCode: string; summary: string }[]
  >([]);
  const [answer, setAnswer] = React.useState("");
  const saveAnswer = api.project.saveAnswer.useMutation();

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    setAnswer("");
    setFilesReferences([]);
    e.preventDefault();
    if (!project?.id) return;
    setLoading(true);

    const { output, filesReferences } = await askQuestion(question, project.id);
    setOpen(true);
    setFilesReferences(filesReferences);

    for await (const delta of readStreamableValue(output)) {
      if (delta) {
        setAnswer((ans) => ans + delta);
      }
    }
    setLoading(false);
  };
  const refetch=useRefetch();     // used to refresh the page automatically(VERY USEFUL)
  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[80vh] flex-col overflow-y-auto sm:max-w-[80vw]">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <DialogTitle>
                <Image src="/repozy_crop.png" alt="logo" width={40} height={40} />
              </DialogTitle>
              <Button
                disabled={saveAnswer.isPending}
                variant="outline"
                onClick={() =>
                  saveAnswer.mutate(
                    {
                      projectId: project?.id!,
                      question,
                      answer,
                      filesReferences,
                    },
                    {
                      onSuccess: () => {
                        toast.success("Answer saved successfully");
                        refetch();
                      },
                      onError: () => {
                        toast.error("Failed to save answer");
                      },
                    },
                  )
                }
              >
                Save Answer
              </Button>
            </div>
          </DialogHeader>
          <div className="scroll-bar-none space-y-4 overflow-scroll">
            <MDEditor.Markdown
              source={answer}
              style={{ backgroundColor: "white", color: "black" }}
              className="prose max-w-none rounded-md p-4"
            />
            <CodeReferences filesReferences={filesReferences} />
          </div>

          <Button
            type="button"
            onClick={() => {
              (setOpen(false), setAnswer(""));
            }}
          >
            Close
          </Button>
        </DialogContent>
      </Dialog>
      <Card className="relative col-span-3">
        <CardHeader>
          <CardTitle>Ask a Question</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit}>
            <Textarea
              placeholder={`Which files were changed to implement the home page `}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
            <div className="h-4"></div>
            <Button type="submit" disabled={loading}>
              Ask Repozy{" "}
            </Button>
          </form>
        </CardContent>
      </Card>
    </>
  );
};

export default AskQuestionCard;
