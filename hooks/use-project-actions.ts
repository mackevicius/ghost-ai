'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Project } from '@/lib/project-types';

type ProjectDialog =
  | { type: 'create' }
  | { type: 'rename' | 'delete'; project: Project };

export function useProjectActions(activeProjectId?: string) {
  const router = useRouter();
  const [dialog, setDialog] = useState<ProjectDialog | null>(null);
  const [name, setName] = useState('');
  const [suffix, setSuffix] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, startTransition] = useTransition();
  const submitting = useRef(false);
  const slug = name.trim().toLowerCase().normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 87)
    .replace(/^-+|-+$/g, '');
  const roomId = suffix ? `${slug || 'project'}-${suffix}` : '';
  const canSubmit = dialog !== null && (dialog.type === 'delete' || name.trim().length > 0);

  function openCreate() {
    if (submitting.current) return;
    setName('');
    setSuffix(crypto.randomUUID().replaceAll('-', '').slice(0, 12));
    setError(null);
    setDialog({ type: 'create' });
  }

  function openProjectDialog(type: 'rename' | 'delete', project: Project) {
    if (submitting.current || !project.isOwner) return;
    setName(project.name);
    setError(null);
    setDialog({ type, project });
  }

  function close() {
    if (!submitting.current && !isLoading) setDialog(null);
  }

  function submit() {
    if (!dialog || !canSubmit || isLoading || submitting.current) return;
    if (dialog.type !== 'create' && !dialog.project.isOwner) return;
    submitting.current = true;
    setError(null);

    startTransition(async () => {
      try {
        const isCreate = dialog.type === 'create';
        const response = await fetch(
          isCreate ? '/api/projects' : `/api/projects/${encodeURIComponent(dialog.project.id)}`,
          {
            method: isCreate ? 'POST' : dialog.type === 'rename' ? 'PATCH' : 'DELETE',
            ...(dialog.type !== 'delete' ? {
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: name.trim(), ...(isCreate ? { roomId } : {}) }),
            } : {}),
          },
        );
        if (!response.ok) {
          const body: unknown = await response.json().catch(() => null);
          throw new Error(
            typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string'
              ? body.error : 'Unable to save project. Please try again.',
          );
        }

        if (isCreate) {
          const project: unknown = await response.json();
          if (typeof project !== 'object' || project === null || !('id' in project) || project.id !== roomId) {
            throw new Error('The created project did not match the room ID. Refresh to check your projects.');
          }
          router.push(`/editor/${encodeURIComponent(roomId)}`);
        } else if (dialog.type === 'delete' && dialog.project.id === activeProjectId) {
          router.replace('/editor');
          router.refresh();
        } else {
          router.refresh();
        }
        setDialog(null);
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Unable to save project. Please try again.');
      } finally {
        submitting.current = false;
      }
    });
  }

  return { dialog, name, setName, roomId, error, isLoading, canSubmit, openCreate, openProjectDialog, close, submit };
}