'use client';

import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { useProjectActions } from '@/hooks/use-project-actions';

interface ProjectDialogsProps {
  controller: ReturnType<typeof useProjectActions>;
}

export function ProjectDialogs({ controller }: ProjectDialogsProps) {
  const { dialog, name, setName, roomId, error, isLoading, canSubmit, close, submit } =
    controller;
  const inputRef = useRef<HTMLInputElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const isDelete = dialog?.type === 'delete';
  const title =
    dialog?.type === 'create'
      ? 'Create Project'
      : isDelete
        ? 'Delete Project'
        : 'Rename Project';

  return (
    <Dialog
      open={dialog !== null}
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <DialogContent
        className="rounded-3xl bg-surface text-copy-primary"
        initialFocus={isDelete ? cancelRef : inputRef}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
          className="grid min-w-0 gap-4"
          aria-busy={isLoading}
        >
          <DialogHeader className="min-w-0 pr-6">
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription className="wrap-break-word text-copy-muted">
              {dialog?.type === 'create'
                ? 'Name your new project.'
                : isDelete
                  ? `Delete "${dialog?.project.name}"? This cannot be undone.`
                  : dialog && `Rename "${dialog.project.name}".`}
            </DialogDescription>
          </DialogHeader>
          {!isDelete && (
            <div className="grid min-w-0 gap-2">
              <label
                htmlFor="project-name"
                className="text-sm text-copy-secondary"
              >
                Project name
              </label>
              <Input
                ref={inputRef}
                id="project-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                disabled={isLoading}
                className="rounded-xl"
              />
              {dialog?.type === 'create' && (
                <p
                  className="break-all text-xs text-copy-muted"
                  aria-live="polite"
                >
                  Room ID: <span className="font-mono">{roomId || '...'}</span>
                </p>
              )}
            </div>
          )}
          {error && <p role="alert" className="text-sm wrap-anywhere text-error">{error}</p>}
          <DialogFooter className="rounded-b-3xl">
            <Button
              ref={cancelRef}
              type="button"
              variant="outline"
              onClick={close}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant={isDelete ? 'destructive' : 'default'}
              disabled={!canSubmit || isLoading}
            >
              {isLoading ? 'Saving...' : title}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
