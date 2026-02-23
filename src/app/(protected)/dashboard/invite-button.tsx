"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import useProject from "@/hooks/use-project";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";

const InviteButton = () => {
  const { projectId } = useProject();
  const [open, setOpen] = useState(false);
  const [inviteLink, setInviteLink] = useState("");

  // Set invite link after component mounts
  useEffect(() => {
    if (typeof window !== "undefined" && projectId) {
      setInviteLink(`${window.location.origin}/join/${projectId}`);
    }
  }, [projectId]);

  // Don't render if no project selected
  if (!projectId) {
    return null;
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Members</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500">
            Team Members need to paste this link
          </p>

          <Input
            readOnly
            className="mt-4"
            onClick={() => {
              navigator.clipboard.writeText(inviteLink);
              toast.success("Link copied to clipboard");
            }}
            value={inviteLink}
          />
        </DialogContent>
      </Dialog>

      <Button size="sm" onClick={() => setOpen(true)}>
        Invite Members
      </Button>
    </>
  );
};

export default InviteButton;
