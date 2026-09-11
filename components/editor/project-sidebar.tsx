'use client';

import { Pencil, Plus, Trash2, X } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import type { Project, ProjectLists } from '@/lib/project-types';

interface ProjectSidebarProps extends ProjectLists {
  isOpen: boolean;
  onClose: () => void;
  activeProjectId?: string;
  workspace?: boolean;
  onCreate: () => void;
  onRename: (project: Project) => void;
  onDelete: (project: Project) => void;
}

export function ProjectSidebar({
  isOpen,
  onClose,
  ownedProjects,
  sharedProjects,
  activeProjectId,
  workspace = false,
  onCreate,
  onRename,
  onDelete,
}: ProjectSidebarProps) {
  function projectList(isOwner: boolean) {
    const items = isOwner ? ownedProjects : sharedProjects;
    if (!items.length)
      return (
        <p className="m-auto text-center text-sm text-copy-muted">
          {isOwner ? 'No projects yet.' : 'No shared projects.'}
        </p>
      );
    return (
      <ul className="w-full space-y-1 py-2">
        {items.map((project) => (
          <li
            key={project.id}
            className={cn('flex min-w-0 items-center gap-1 rounded-xl border border-transparent px-2 py-2 text-sm text-copy-primary', project.id === activeProjectId && 'border-surface-border bg-accent-dim')}
          >
            <Link
              href={`/editor/${encodeURIComponent(project.id)}`}
              onClick={onClose}
              aria-current={project.id === activeProjectId ? 'page' : undefined}
              className="min-w-0 flex-1 wrap-anywhere hover:text-brand aria-[current=page]:text-brand"
            >
              {project.name}
            </Link>
            {project.isOwner && (
              <>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="cursor-pointer"
                  aria-label={`Rename ${project.name}`}
                  title="Rename project"
                  onClick={() => onRename(project)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="cursor-pointer text-error"
                  aria-label={`Delete ${project.name}`}
                  title="Delete project"
                  onClick={() => onDelete(project)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <>
      {isOpen && (
        <button
          type="button"
          aria-label="Close project sidebar"
          onClick={onClose}
          className={cn('fixed inset-x-0 top-14 bottom-0 z-30 cursor-pointer bg-base opacity-70', workspace ? 'lg:hidden' : 'md:hidden')}
        />
      )}
      <aside
        inert={!isOpen}
        className={cn(
          workspace
            ? 'fixed top-20 bottom-3 left-3 z-40 flex w-64 max-w-[calc(100%-1.5rem)] flex-col overflow-hidden rounded-3xl border border-surface-border bg-surface lg:static lg:max-w-none lg:shrink-0'
            : 'fixed top-14 bottom-0 left-0 z-40 flex w-72 flex-col border-r border-surface-border bg-surface/95 transition-transform duration-200 ease-in-out',
          workspace ? (isOpen ? 'flex' : 'hidden') : (isOpen ? 'translate-x-0' : '-translate-x-full'),
        )}
      >
        <div className="flex items-center justify-between border-b border-surface-border px-4 py-3">
          <h2 className="text-sm font-medium text-copy-primary">Projects</h2>
          <Button
            variant="ghost"
            size="icon-sm"
            className="cursor-pointer"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <Tabs
          defaultValue="my-projects"
          className="flex flex-1 flex-col overflow-hidden px-4 pt-3"
        >
          <TabsList className="w-full">
            <TabsTrigger value="my-projects" className="flex-1 cursor-pointer">
              My Projects
            </TabsTrigger>
            <TabsTrigger value="shared" className="flex-1 cursor-pointer">
              Shared
            </TabsTrigger>
          </TabsList>
          <TabsContent
            value="my-projects"
            className="flex flex-1 overflow-y-auto"
          >
            {projectList(true)}
          </TabsContent>
          <TabsContent value="shared" className="flex flex-1 overflow-y-auto">
            {projectList(false)}
          </TabsContent>
        </Tabs>

        <div className="border-t border-surface-border p-4">
          <Button className="w-full cursor-pointer" onClick={onCreate}>
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        </div>
      </aside>
    </>
  );
}
