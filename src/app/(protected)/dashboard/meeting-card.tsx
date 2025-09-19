"use cleint";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { uploadFile } from "@/lib/firebase";
import { Presentation, Upload } from "lucide-react";
import React from "react";
import { useDropzone } from "react-dropzone";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";

const MeetingCard = () => {
  const [isUploading, setIsUploading] = React.useState(false);
  const [progess, setProgress] = React.useState(0);
  const { getRootProps, getInputProps } = useDropzone({
    accept: { "audio/*": [".mp3", ".wav", ".ogg", ".m4a"] },
    multiple: false,
    maxSize: 50_000_000,
    onDrop: async (acceptedFiles) => {
      setIsUploading(true);
      console.log(acceptedFiles);
      const file = acceptedFiles[0];
      const downloadURL = await uploadFile(file as File, setProgress);
      window.alert("File uploaded successfully: " + downloadURL);
      setIsUploading(false);
    },
  });

  return (
    <Card
      className="col-span-2 flex flex-col items-center justify-center p-10"
      {...getRootProps()}
    >
      {!isUploading && (
        <>
          <Presentation className="h-10 w-10 animate-bounce" />
          <h3 className="mt-2 text-sm font-semibold text-gray-800">
            Create a new meeting
          </h3>
          <p className="mt-1 text-center text-sm text-gray-500">
            Analyse your meetings and get insights with GitOps
            <br />
            Powered by AI
          </p>
          <div className="mt-6">
            <Button disabled={isUploading}>
              <Upload className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
              Upload Meeting
              <input className="hidden" {...getInputProps()} />
            </Button>
          </div>
        </>
      )}
      {isUploading && (
        <div>
          <CircularProgressbar
            className="size-20"
            value={progess}
            text={`${progess}%`}
            styles={buildStyles({
              pathColor: "#22c55e",
              textColor: "#22c55e",
            })}
          />
          <p className="mt-2 text-center text-sm text-gray-500">
            Uploading meeting...
          </p>
        </div>
      )}
    </Card>
  );
};

export default MeetingCard;
