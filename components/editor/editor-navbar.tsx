'use client';

import { PanelLeftClose, PanelLeftOpen, Share2, Sparkles } from 'lucide-react';
import { UserButton } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';

interface EditorNavbarProps {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  workspace?: {
    projectName: string;
    isAiSidebarOpen: boolean;
    onToggleAiSidebar: () => void;
    onShare: () => void;
  };
}

export function EditorNavbar({
  isSidebarOpen,
  onToggleSidebar,
  workspace,
}: EditorNavbarProps) {
  return (
    <header className="flex h-14 shrink-0 items-center border-b border-surface-border bg-surface px-3">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          aria-label={isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          title={isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          aria-expanded={isSidebarOpen}
        >
          {isSidebarOpen ? (
            <PanelLeftClose className="h-5 w-5" />
          ) : (
            <PanelLeftOpen className="h-5 w-5" />
          )}
        </Button>
        {workspace && (
          <div className="min-w-0">
          <h1 className="truncate text-sm font-medium text-copy-primary" title={workspace.projectName}>
            {workspace.projectName}
          </h1>
          <p className="text-xs text-copy-muted">Workspace</p>
          </div>
        )}
      </div>
      <div className="flex shrink-0 items-center justify-end gap-2 pl-2">
        {workspace && (
          <>
              <Button variant="ghost" size="icon" onClick={workspace.onShare} title="Share project" aria-label="Share project">
                <Share2 className="h-5 w-5" />
              </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={workspace.onToggleAiSidebar}
              aria-label={workspace.isAiSidebarOpen ? 'Close AI sidebar' : 'Open AI sidebar'}
              title={workspace.isAiSidebarOpen ? 'Close AI sidebar' : 'Open AI sidebar'}
              aria-expanded={workspace.isAiSidebarOpen}
              aria-controls={workspace.isAiSidebarOpen ? 'workspace-ai-sidebar' : undefined}
              className="text-ai-text"
            >
              <Sparkles className="h-5 w-5" />
            </Button>
          </>
        )}
        <UserButton />
      </div>
    </header>
  );
}
