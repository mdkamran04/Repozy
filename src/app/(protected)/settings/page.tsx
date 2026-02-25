"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { Trash2, Eye, EyeOff, Check } from "lucide-react";

export default function SettingsPage() {
  const [showGemini, setShowGemini] = useState(false);
  const [showGithub, setShowGithub] = useState(false);
  const [geminiKey, setGeminiKey] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { data: keyStatus, refetch } = api.project.getUserApiKeysStatus.useQuery();
  const saveKeysMutation = api.project.saveUserApiKeys.useMutation();
  const deleteKeyMutation = api.project.deleteUserApiKey.useMutation();

  const handleSaveKeys = async () => {
    if (!geminiKey && !githubToken) {
      toast.error("Please provide at least one API key");
      return;
    }

    setIsLoading(true);
    try {
      await saveKeysMutation.mutateAsync({
        geminiApiKey: geminiKey || undefined,
        githubToken: githubToken || undefined,
      });

      toast.success("API keys saved successfully");
      setGeminiKey("");
      setGithubToken("");
      await refetch();
    } catch (error) {
      console.error("Error saving keys:", error);
      toast.error("Failed to save API keys");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteKey = async (keyType: "gemini" | "github") => {
    try {
      await deleteKeyMutation.mutateAsync({ keyType });
      toast.success(`${keyType === "gemini" ? "Gemini" : "GitHub"} key deleted`);
      await refetch();
    } catch (error) {
      console.error("Error deleting key:", error);
      toast.error("Failed to delete API key");
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-2">Settings</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Manage your API keys for testing purposes
      </p>

      <Card className="p-6 space-y-6">
        <div>
          <h2 className="text-lg font-semibold mb-4">API Keys</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            Provide your own API keys to avoid hitting rate limits during testing. 
            Your keys are encrypted and stored securely.
          </p>

          {/* Gemini API Key */}
          <div className="space-y-3 pb-6 border-b">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium">
                Google Gemini API Key
              </label>
              {keyStatus?.hasGeminiKey && (
                <div className="flex items-center gap-2 text-green-600 text-sm">
                  <Check className="w-4 h-4" />
                  Saved
                </div>
              )}
            </div>
            <div className="relative">
              <Input
                type={showGemini ? "text" : "password"}
                placeholder="sk-proj-..."
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowGemini(!showGemini)}
                className="absolute right-3 top-3 text-gray-500 hover:text-gray-700"
              >
                {showGemini ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            {keyStatus?.hasGeminiKey && (
              <button
                onClick={() => handleDeleteKey("gemini")}
                className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
                Delete saved key
              </button>
            )}
          </div>

          {/* GitHub Token */}
          <div className="space-y-3 pt-6">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium">GitHub Token</label>
              {keyStatus?.hasGithubToken && (
                <div className="flex items-center gap-2 text-green-600 text-sm">
                  <Check className="w-4 h-4" />
                  Saved
                </div>
              )}
            </div>
            <div className="relative">
              <Input
                type={showGithub ? "text" : "password"}
                placeholder="ghp_..."
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowGithub(!showGithub)}
                className="absolute right-3 top-3 text-gray-500 hover:text-gray-700"
              >
                {showGithub ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            {keyStatus?.hasGithubToken && (
              <button
                onClick={() => handleDeleteKey("github")}
                className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
                Delete saved key
              </button>
            )}
          </div>
        </div>

        <Button
          onClick={handleSaveKeys}
          disabled={isLoading || (!geminiKey && !githubToken)}
          className="w-full"
        >
          {isLoading ? "Saving..." : "Save API Keys"}
        </Button>

        <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Note:</strong> These API keys are optional. If you don't provide them, 
            the app will use its default rate-limited keys. Your keys are encrypted before 
            being stored and are never shared or displayed.
          </p>
        </div>
      </Card>
    </div>
  );
}
