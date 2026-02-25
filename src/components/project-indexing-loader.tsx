"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProjectIndexingLoaderProps {
    progress: number;
    isIndexing: boolean;
    onClose?: () => void;
}

export function ProjectIndexingLoader({ progress, isIndexing, onClose }: ProjectIndexingLoaderProps) {
    if (!isIndexing && progress === 0) return null;

    const isComplete = progress === 100;

    return (
        <Card className="border-blue-200 bg-blue-50 relative">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {isIndexing && <Loader2 className="h-5 w-5 animate-spin text-blue-600" />}
                        <CardTitle className="text-lg text-blue-900">
                            {isComplete ? "Indexing Complete!" : "Indexing Repository..."}
                        </CardTitle>
                    </div>
                    {isComplete && onClose && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 rounded-full hover:bg-blue-200"
                            onClick={onClose}
                        >
                            <X className="h-4 w-4 text-blue-900" />
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    <Progress value={progress} className="h-2" />
                    <p className="text-sm text-blue-700">
                        {progress}% complete
                        {isIndexing && " - Please wait while we process your repository"}
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
