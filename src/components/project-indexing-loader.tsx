"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";

interface ProjectIndexingLoaderProps {
    progress: number;
    isIndexing: boolean;
}

export function ProjectIndexingLoader({ progress, isIndexing }: ProjectIndexingLoaderProps) {
    if (!isIndexing && progress === 0) return null;

    return (
        <Card className="border-blue-200 bg-blue-50">
            <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                    {isIndexing && <Loader2 className="h-5 w-5 animate-spin text-blue-600" />}
                    <CardTitle className="text-lg text-blue-900">
                        {progress === 100 ? "Indexing Complete!" : "Indexing Repository..."}
                    </CardTitle>
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
