import { notFound } from 'next/navigation';
import { EditorHome } from '@/components/editor/editor-home';
import { getProjects } from '@/lib/project-data';

interface WorkspacePageProps {
  params: Promise<{ projectId: string }>;
}

export default async function WorkspacePage({ params }: WorkspacePageProps) {
  const { projectId } = await params;
  const projects = await getProjects();
  const activeProject = [...projects.ownedProjects, ...projects.sharedProjects]
    .find((project) => project.id === projectId);
  if (!activeProject) notFound();

  return <EditorHome {...projects} activeProject={activeProject} />;
}