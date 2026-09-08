import type { LucideIcon } from 'lucide-react';
import { FileText, Share2, Sparkles } from 'lucide-react';

interface AuthLayoutProps {
  children: React.ReactNode;
}

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
}

const FEATURES: Feature[] = [
  {
    icon: Sparkles,
    title: 'AI Architecture Generation',
    description: 'Describe your system, AI maps it to nodes and edges on a live canvas.',
  },
  {
    icon: Share2,
    title: 'Real-time Collaboration',
    description: 'Live cursors, presence indicators, and shared node editing across your team.',
  },
  {
    icon: FileText,
    title: 'Instant Spec Generation',
    description: 'Export a complete Markdown technical spec directly from the canvas graph.',
  },
];

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex flex-1">
      <div className="hidden w-1/2 flex-col justify-between border-r border-surface-border bg-surface px-16 py-12 lg:flex">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand text-sm font-bold text-primary-foreground">
            G
          </span>
          <span className="text-base font-semibold text-copy-primary">
            Ghost AI
          </span>
        </div>

        <div className="flex flex-col gap-10">
          <div className="flex flex-col gap-3">
            <h1 className="text-3xl font-semibold text-copy-primary">
              Design systems at the speed of thought.
            </h1>
            <p className="max-w-md text-sm text-copy-muted">
              Describe your architecture in plain English. Ghost AI maps it to
              a shared canvas your whole team can refine in real time.
            </p>
          </div>

          <ul className="flex flex-col gap-5">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <li key={title} className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-dim text-brand">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium text-copy-primary">
                    {title}
                  </span>
                  <span className="text-sm text-copy-muted">
                    {description}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-copy-faint">
          © 2026 Ghost AI. All rights reserved.
        </p>
      </div>

      <div className="flex w-full items-center justify-center bg-base px-6 lg:w-1/2">
        {children}
      </div>
    </div>
  );
}

