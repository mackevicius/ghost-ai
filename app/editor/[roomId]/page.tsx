import { AccessDenied } from '@/components/editor/access-denied';
import { EditorWorkspace } from '@/components/editor/editor-workspace';
import { getCurrentIdentity, getProjectAccess } from '@/lib/project-access';
import { getProjects } from '@/lib/project-data';

interface WorkspacePageProps {
  params: Promise<{ roomId: string }>;
}

export default async function WorkspacePage({ params }: WorkspacePageProps) {
  const identity = await getCurrentIdentity();
  const { roomId } = await params;
  const activeProject = await getProjectAccess(roomId, identity);
  if (!activeProject) return <AccessDenied />;

  const projects = await getProjects(identity);
  return <EditorWorkspace {...projects} activeProject={activeProject} />;
}