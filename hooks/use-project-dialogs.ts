'use client';

import { useState, useTransition } from 'react';

export interface Project {
  id: string;
  name: string;
  slug: string;
  isOwner: boolean;
}

type ProjectDialog =
  | { type: 'create' }
  | { type: 'rename' | 'delete'; project: Project };

const mockProjects: Project[] = [
  { id: 'storefront', name: 'Storefront', slug: 'storefront', isOwner: true },
  {
    id: 'shared-platform',
    name: 'Shared Platform',
    slug: 'shared-platform',
    isOwner: false,
  },
];

export function useProjectDialogs() {
  const [projects, setProjects] = useState<Project[]>(mockProjects);
  const [dialog, setDialog] = useState<ProjectDialog | null>(null);
  const [name, setName] = useState('');
  const [isLoading, startTransition] = useTransition();
  const slug = name
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const canSubmit =
    dialog !== null && (dialog.type === 'delete' || slug.length > 0);

  function openCreate() {
    setName('');
    setDialog({ type: 'create' });
  }

  function openProjectDialog(type: 'rename' | 'delete', project: Project) {
    if (!project.isOwner) return;
    setName(project.name);
    setDialog({ type, project });
  }

  function close() {
    if (!isLoading) setDialog(null);
  }

  function submit() {
    if (!dialog || !canSubmit || isLoading) return;
    if (dialog.type !== 'create' && !dialog.project.isOwner) return;

    const id =
      dialog.type === 'create' ? crypto.randomUUID() : dialog.project.id;
    startTransition(() => {
      setProjects((current) => {
        if (dialog.type === 'create') {
          return [...current, { id, name: name.trim(), slug, isOwner: true }];
        }
        if (dialog.type === 'delete') {
          return current.filter(
            (project) => project.id !== id || !project.isOwner,
          );
        }
        return current.map((project) =>
          project.id === id && project.isOwner
            ? { ...project, name: name.trim(), slug }
            : project,
        );
      });
      setDialog(null);
    });
  }

  return {
    projects,
    dialog,
    name,
    setName,
    slug,
    isLoading,
    canSubmit,
    openCreate,
    openProjectDialog,
    close,
    submit,
  };
}
