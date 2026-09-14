import Link from 'next/link';
import { ArrowLeft, LockKeyhole } from 'lucide-react';

export function AccessDenied() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-base px-6 py-12 text-center">
      <LockKeyhole className="h-8 w-8 text-copy-muted" aria-hidden="true" />
      <h1 className="text-2xl font-medium text-copy-primary">Access denied</h1>
      <p className="max-w-sm text-sm text-copy-muted">
        This project is unavailable or you do not have access.
      </p>
      <Link
        href="/editor"
        className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-brand hover:underline focus-visible:outline-2 focus-visible:outline-brand"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to projects
      </Link>
    </main>
  );
}
