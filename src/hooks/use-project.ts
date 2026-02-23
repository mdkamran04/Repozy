import { api } from "@/trpc/react";
import { useLocalStorage } from "usehooks-ts";
import { useEffect } from "react";

const useProject = () => {
  const { data: projects } = api.project.getProjects.useQuery();
  const [projectId, setProjectId] = useLocalStorage('repozy-projectId', '');
  
  const project = projects?.find(project => project.id === projectId);

  // Clear invalid projectId if it doesn't exist in user's projects
  useEffect(() => {
    if (projects && projectId && !project) {
      // ProjectId exists but doesn't belong to current user - clear it
      setProjectId('');
    }
  }, [projects, projectId, project, setProjectId]);

  return {
    projects,
    project,
    projectId,
    setProjectId
  };
};

export default useProject;
