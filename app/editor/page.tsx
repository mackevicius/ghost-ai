'use client';

import { useState } from 'react';
import { EditorNavbar } from '@/components/editor/editor-navbar';
import { ProjectSidebar } from '@/components/editor/project-sidebar';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProjectDialogs } from '@/components/editor/project-dialogs';
import { useProjectDialogs } from '@/hooks/use-project-dialogs';

export default function EditorPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const projectDialogs = useProjectDialogs();

  return (
    <div className="flex flex-1 flex-col">
      <EditorNavbar
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen((open) => !open)}
      />
      <ProjectSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        projects={projectDialogs.projects}
        onCreate={projectDialogs.openCreate}
        onRename={(project) =>
          projectDialogs.openProjectDialog('rename', project)
        }
        onDelete={(project) =>
          projectDialogs.openProjectDialog('delete', project)
        }
      />
      <main className="flex flex-1 flex-col items-center justify-center gap-4 bg-base px-6 py-12 text-center">
        <h1 className="text-2xl font-medium text-copy-primary">
          Create a project or open an existing one
        </h1>
        <p className="text-sm text-copy-muted">
          Start a new architecture workspace, or choose a project from the
          sidebar.
        </p>
        <Button onClick={projectDialogs.openCreate}>
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </main>
      <ProjectDialogs controller={projectDialogs} />
    </div>
  );
}
