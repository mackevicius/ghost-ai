'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { EditorNavbar } from '@/components/editor/editor-navbar';
import { ProjectSidebar } from '@/components/editor/project-sidebar';
import { ProjectDialogs } from '@/components/editor/project-dialogs';
import { Button } from '@/components/ui/button';
import { useProjectActions } from '@/hooks/use-project-actions';
import type { Project, ProjectLists } from '@/lib/project-types';

interface EditorHomeProps extends ProjectLists {
  activeProject?: Project;
}

export function EditorHome({ ownedProjects, sharedProjects, activeProject }: EditorHomeProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const projectActions = useProjectActions(activeProject?.id);

  return (
    <div className="flex flex-1 flex-col">
      <EditorNavbar
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen((open) => !open)}
      />
      <ProjectSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        ownedProjects={ownedProjects}
        sharedProjects={sharedProjects}
        activeProjectId={activeProject?.id}
        onCreate={projectActions.openCreate}
        onRename={(project) => projectActions.openProjectDialog('rename', project)}
        onDelete={(project) => projectActions.openProjectDialog('delete', project)}
      />
      <main className="flex min-w-0 flex-1 flex-col items-center justify-center gap-4 bg-base px-6 py-12 text-center">
        <h1 className="max-w-full text-2xl font-medium wrap-anywhere text-copy-primary">
          {activeProject?.name ?? 'Create a project or open an existing one'}
        </h1>
        {activeProject ? (
          <p className="max-w-full break-all font-mono text-sm text-copy-muted">
            Room ID: {activeProject.id}
          </p>
        ) : (
          <>
            <p className="text-sm text-copy-muted">
              Start a new architecture workspace, or choose a project from the sidebar.
            </p>
            <Button onClick={projectActions.openCreate}>
              <Plus className="h-4 w-4" />
              New Project
            </Button>
          </>
        )}
      </main>
      <ProjectDialogs controller={projectActions} />
    </div>
  );
}