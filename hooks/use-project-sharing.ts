'use client';

import { useEffect, useRef, useState } from 'react';
import type { Collaborator } from '@/lib/collaborator-types';

async function responseError(response: Response) {
  const body: unknown = await response.json().catch(() => null);
  return new Error(typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string'
    ? body.error : 'Unable to update sharing. Please try again.');
}

function isCollaborator(value: unknown): value is Collaborator {
  if (typeof value !== 'object' || value === null) return false;
  return 'id' in value && typeof value.id === 'string' &&
    'email' in value && typeof value.email === 'string' &&
    'displayName' in value && (value.displayName === null || typeof value.displayName === 'string') &&
    'imageUrl' in value && (value.imageUrl === null || typeof value.imageUrl === 'string');
}

export function useProjectSharing(projectId: string) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [owner, setOwner] = useState<Collaborator | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [revision, setRevision] = useState(0);
  const busy = useRef(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const endpoint = `/api/projects/${encodeURIComponent(projectId)}/collaborators`;

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(endpoint, { signal: controller.signal, cache: 'no-store' });
        if (!response.ok) throw await responseError(response);
        const body: unknown = await response.json();
        if (typeof body !== 'object' || body === null || !('collaborators' in body) ||
          !Array.isArray(body.collaborators) || !body.collaborators.every(isCollaborator) ||
          !('isOwner' in body) || typeof body.isOwner !== 'boolean' ||
          !('owner' in body) || !isCollaborator(body.owner)) throw new Error('Invalid sharing response');
        if (controller.signal.aborted) return;
        setCollaborators(body.collaborators);
        setOwner(body.owner);
        setIsOwner(body.isOwner);
      } catch (error) {
        if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Unable to load collaborators');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [endpoint, revision]);

  useEffect(() => () => {
    if (copyTimer.current) clearTimeout(copyTimer.current);
  }, []);

  function reload() {
    setError(null);
    setLoading(true);
    setRevision((value) => value + 1);
  }

  async function mutate(method: 'POST' | 'DELETE', body: { email: string } | { collaboratorId: string }) {
    if (!isOwner || busy.current || loading) return;
    busy.current = true;
    setPending(true);
    setError(null);
    try {
      const response = await fetch(endpoint, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!response.ok) throw await responseError(response);
      if (method === 'POST') setEmail('');
      reload();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to update sharing');
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  async function copyLink() {
    if (!isOwner) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/editor/${encodeURIComponent(projectId)}`);
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Unable to copy the link. Please check clipboard permissions.');
    }
  }

  return { collaborators, owner, isOwner, email, setEmail, loading, pending, error, copied, reload,
    invite: () => mutate('POST', { email: email.trim() }),
    remove: (collaboratorId: string) => mutate('DELETE', { collaboratorId }), copyLink };
}