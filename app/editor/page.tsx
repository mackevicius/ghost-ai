import { EditorHome } from '@/components/editor/editor-home';
import { getProjects } from '@/lib/project-data';

export default async function EditorPage() {
  const projects = await getProjects();
  return <EditorHome {...projects} />;
}
