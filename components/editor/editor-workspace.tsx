'use client';

import { useState, useSyncExternalStore } from 'react';
import { MessageSquare, Workflow, X } from 'lucide-react';
import { EditorNavbar } from '@/components/editor/editor-navbar';
import { ProjectSidebar } from '@/components/editor/project-sidebar';
import { ProjectDialogs } from '@/components/editor/project-dialogs';
import { ShareDialog } from '@/components/editor/share-dialog';
import { Button } from '@/components/ui/button';
import { useProjectActions } from '@/hooks/use-project-actions';
import type { Project, ProjectLists } from '@/lib/project-types';

interface EditorWorkspaceProps extends ProjectLists {
  activeProject: Project;
}

function subscribeToViewport(callback: () => void) {
  const query = window.matchMedia('(min-width: 1024px)');
  query.addEventListener('change', callback);
  return () => query.removeEventListener('change', callback);
}

const desktopSnapshot = () => window.matchMedia('(min-width: 1024px)').matches;
const serverSnapshot = () => true;

export function EditorWorkspace({
  ownedProjects,
  sharedProjects,
  activeProject,
}: EditorWorkspaceProps) {
  const [desktopProjectsOpen, setDesktopProjectsOpen] = useState(true);
  const [desktopAiOpen, setDesktopAiOpen] = useState(true);
  const [mobilePanel, setMobilePanel] = useState<'projects' | 'ai' | null>(
    null,
  );
  const isDesktop = useSyncExternalStore(
    subscribeToViewport,
    desktopSnapshot,
    serverSnapshot,
  );
  const isSidebarOpen = isDesktop
    ? desktopProjectsOpen
    : mobilePanel === 'projects';
  const isAiSidebarOpen = isDesktop ? desktopAiOpen : mobilePanel === 'ai';
  function setIsSidebarOpen(open: boolean) {
    if (isDesktop) setDesktopProjectsOpen(open);
    else setMobilePanel(open ? 'projects' : null);
  }
  function setIsAiSidebarOpen(open: boolean) {
    if (isDesktop) setDesktopAiOpen(open);
    else setMobilePanel(open ? 'ai' : null);
  }
  const actions = useProjectActions(activeProject.id);
  const [isShareOpen, setIsShareOpen] = useState(false);

  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-base">
      <EditorNavbar
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => {
          setIsSidebarOpen(!isSidebarOpen);
        }}
        workspace={{
          projectName: activeProject.name,
          onShare: () => setIsShareOpen(true),
          isAiSidebarOpen,
          onToggleAiSidebar: () => {
            setIsAiSidebarOpen(!isAiSidebarOpen);
          },
        }}
      />
      <div className="relative flex min-h-0 flex-1 gap-3 p-3">
        <ProjectSidebar
          workspace
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          ownedProjects={ownedProjects}
          sharedProjects={sharedProjects}
          activeProjectId={activeProject.id}
          onCreate={actions.openCreate}
          onRename={(project) => actions.openProjectDialog('rename', project)}
          onDelete={(project) => actions.openProjectDialog('delete', project)}
        />
        <main
          aria-label="Project canvas"
          className="flex min-w-0 flex-1 flex-col items-center justify-center gap-5 overflow-auto rounded-3xl border border-surface-border bg-base p-6 text-center"
          style={{
            backgroundImage:
              'linear-gradient(var(--border-default) 1px, transparent 1px), linear-gradient(90deg, var(--border-default) 1px, transparent 1px), radial-gradient(ellipse at top, var(--accent-primary-dim), transparent 65%)',
            backgroundSize: '64px 64px, 64px 64px, 100% 100%',
            backgroundBlendMode: 'soft-light, soft-light, normal',
          }}
        >
          <div className="rounded-2xl border border-surface-border bg-elevated p-4">
            <Workflow className="h-8 w-8 text-brand" aria-hidden="true" />
          </div>
          <h2 className="max-w-md text-2xl font-medium text-copy-primary">
            Your canvas will appear here.
          </h2>
        </main>
        {isAiSidebarOpen && (
          <aside
            id="workspace-ai-sidebar"
            aria-label="AI assistant"
            className="absolute inset-y-3 right-3 z-20 flex w-72 max-w-[calc(100%-1.5rem)] flex-col overflow-hidden rounded-3xl border border-surface-border bg-surface lg:static lg:max-w-none lg:shrink-0"
          >
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-surface-border px-4">
              <h2 className="text-sm font-medium text-copy-primary">
                AI Copilot
              </h2>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Close AI sidebar"
                title="Close AI sidebar"
                onClick={() => setIsAiSidebarOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex min-h-0 flex-1 flex-col items-center gap-3 overflow-auto p-6 text-center">
              <MessageSquare
                className="h-8 w-8 text-ai-text"
                aria-hidden="true"
              />
              <p className="text-sm text-copy-muted">AI chat is coming soon.</p>
            </div>
          </aside>
        )}
      </div>
      <ProjectDialogs controller={actions} />
      {isShareOpen && (
        <ShareDialog
          key={activeProject.id}
          projectId={activeProject.id}
          projectName={activeProject.name}
          onClose={() => setIsShareOpen(false)}
        />
      )}
    </div>
  );
}
