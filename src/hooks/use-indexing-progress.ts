"use client";

import { api } from "@/trpc/react";
import { useEffect, useState } from "react";

export function useIndexingProgress(projectId: string | null) {
    const [isPolling, setIsPolling] = useState(false);
    const { data: projects, refetch } = api.project.getProjects.useQuery();

    const project = projects?.find((p) => p.id === projectId);
    const progress = project?.indexingProgress ?? 0;
    const isIndexing = progress > 0 && progress < 100;

    useEffect(() => {
        if (projectId && isIndexing) {
            setIsPolling(true);
            const interval = setInterval(() => {
                refetch();
            }, 2000); // Poll every 2 seconds

            return () => clearInterval(interval);
        } else {
            setIsPolling(false);
        }
    }, [projectId, isIndexing, refetch]);

    return {
        progress,
        isIndexing,
        project,
    };
}
