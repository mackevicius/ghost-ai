'use client';

import Image from 'next/image';
import { Check, Copy, LoaderCircle, Trash2, UserRound, UserRoundPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useProjectSharing } from '@/hooks/use-project-sharing';

interface ShareDialogProps {
  projectId: string;
  projectName: string;
  onClose: () => void;
}

export function ShareDialog({ projectId, projectName, onClose }: ShareDialogProps) {
  const sharing = useProjectSharing(projectId);
  return (
    <Dialog open onOpenChange={(open) => { if (!open && !sharing.pending) onClose(); }}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-3xl bg-surface text-copy-primary">
        <DialogHeader className="min-w-0 pr-6">
          <DialogTitle className="wrap-anywhere">Share {projectName}</DialogTitle>
          <DialogDescription>Project collaborators</DialogDescription>
        </DialogHeader>
        {sharing.isOwner && (
          <form onSubmit={(event) => { event.preventDefault(); void sharing.invite(); }} className="grid gap-2">
            <label htmlFor="collaborator-email" className="text-sm text-copy-secondary">Email address</label>
            <div className="flex min-w-0 gap-2">
              <Input id="collaborator-email" type="email" autoComplete="email" required maxLength={254} value={sharing.email} onChange={(event) => sharing.setEmail(event.target.value)} disabled={sharing.pending || sharing.loading} className="min-w-0 flex-1 rounded-xl" />
              <Button type="submit" disabled={sharing.pending || sharing.loading || !sharing.email.trim()}>
                <UserRoundPlus className="h-4 w-4" />Invite
              </Button>
            </div>
          </form>
        )}
        {sharing.error && (
          <div className="grid gap-2">
            <p role="alert" className="text-sm wrap-anywhere text-error">{sharing.error}</p>
            <Button variant="outline" onClick={sharing.reload} disabled={sharing.pending || sharing.loading}>Retry</Button>
          </div>
        )}
        <div aria-busy={sharing.loading || sharing.pending} className="min-w-0">
          <h3 className="mb-2 text-sm font-medium text-copy-primary">People with access</h3>
          {sharing.loading ? (
            <p role="status" className="flex items-center gap-2 py-4 text-sm text-copy-muted"><LoaderCircle className="h-4 w-4 animate-spin" />Loading collaborators...</p>
          ) : (
            <ul className="max-h-72 space-y-3 overflow-y-auto py-2">
              {sharing.owner && (
                <li className="flex min-w-0 items-center gap-3">
                  {sharing.owner.imageUrl ? <Image src={sharing.owner.imageUrl} alt="" width={32} height={32} unoptimized className="h-8 w-8 shrink-0 rounded-full object-cover" /> : <UserRound className="h-8 w-8 shrink-0 text-copy-muted" aria-hidden="true" />}
                  <div className="min-w-0 flex-1 text-sm wrap-anywhere">
                    <p className="font-medium">{sharing.owner.displayName || sharing.owner.email || 'Project owner'}{sharing.isOwner ? ' (you)' : ''}</p>
                    {sharing.owner.email && <p className="text-copy-muted">{sharing.owner.email}</p>}
                  </div>
                  <span className="shrink-0 text-xs text-copy-muted">Owner</span>
                </li>
              )}
              {sharing.collaborators.map((person) => (
                <li key={person.id} className="flex min-w-0 items-center gap-3">
                  {person.imageUrl ? (
                    <Image src={person.imageUrl} alt="" width={32} height={32} unoptimized className="h-8 w-8 shrink-0 rounded-full object-cover" />
                  ) : <UserRound className="h-8 w-8 shrink-0 text-copy-muted" aria-hidden="true" />}
                  <div className="min-w-0 flex-1 text-sm wrap-anywhere">
                    {person.displayName && <p className="font-medium">{person.displayName}</p>}
                    <p className="text-copy-muted">{person.email}</p>
                  </div>
                  {sharing.isOwner && <Button variant="ghost" size="icon-sm" title={`Remove ${person.email}`} aria-label={`Remove ${person.email}`} disabled={sharing.pending} onClick={() => void sharing.remove(person.id)} className="shrink-0 text-error"><Trash2 className="h-4 w-4" /></Button>}
                </li>
              ))}
            </ul>
          )}
        </div>
        {sharing.isOwner && <Button variant="outline" onClick={() => void sharing.copyLink()} className="w-full"><span aria-live="polite" className="inline-flex items-center gap-2">{sharing.copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{sharing.copied ? 'Copied!' : 'Copy project link'}</span></Button>}
      </DialogContent>
    </Dialog>
  );
}