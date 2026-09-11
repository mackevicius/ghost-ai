# Progress Tracker

Update this file whenever the current phase, active feature, or implementation state changes.
Completed section: 2-3 sentences per feature, max. Summarize what exists now, not the steps taken to build it — keep it short even if that means dropping detail.

## Current Phase

- Feature: 05 - Prisma Schema And Data Layer (complete)

## Current Goal

- Prisma data layer is ready; choose the next feature specification.

## Completed

- **01-design-system**: shadcn/ui (Button, Card, Dialog, Input, Tabs, Textarea, ScrollArea) installed in `components/ui/` with `lucide-react` and a `cn()` helper. `app/globals.css` carries the dark theme tokens and Geist fonts; `<html>` is forced dark. Verified in-browser, no light-theme leaks.
- **02-editor**: Base editor chrome — `editor-navbar.tsx` (sidebar toggle, three sections) and `project-sidebar.tsx` (floating overlay with tabs and New Project button) — wired together in `app/page.tsx`. Verified in-browser, no errors.
- **03-auth**: Clerk wired in via `proxy.ts` (protects all routes except sign-in/sign-up, built from the Clerk env vars) and `ClerkProvider` (dark theme + CSS-variable overrides) in the root layout. Editor chrome now lives at `app/editor`; `app/page.tsx` redirects based on auth state, and `/sign-in` / `/sign-up` use a shared two-panel `AuthLayout`. `UserButton` sits in the navbar. Verified: build passes, in-browser checks confirm redirects and the responsive two-panel layout.

- **04-project-dialogs**: Editor home and sidebar create controls open the Create Project dialog with a live slug preview; owned mock projects have rename/delete dialogs and mobile has an outside-click scrim. A dedicated hook manages local projects, forms, dialogs, and loading without API calls or persistence. TypeScript and state-transition checks pass; lint has no errors (one existing Clerk skill-template warning), with authenticated browser verification still pending.

- **05-prisma**: `prisma/models/project.prisma` defines Project and ProjectCollaborator with the requested status, relations, and indexes; `lib/prisma.ts` exports a development-cached singleton selecting Accelerate or the PostgreSQL adapter by URL. Migration `20260909134838_create_projects` was applied successfully and the client generated. Schema validation, TypeScript, singleton lint, and `npm run build` pass.

## In Progress

- Feature 04 authenticated browser verification: focus, Enter submission, and responsive layout checks remain pending.

## Next Up

- Finish authenticated browser verification for feature 04 before starting canvas / React Flow integration.

## Open Questions

- Add unresolved product or implementation questions here.

## Architecture Decisions

- The `base` background token (`--bg-base`) is exposed as a standalone `@utility bg-base { background-color: var(--bg-base); }` in `app/globals.css` rather than a generic `--color-base` theme entry. Registering `base` as a Tailwind `--color-*` key collides with Tailwind's built-in font-size scale key `base` (used by `text-base`, e.g. in shadcn's `Input`/`CardTitle`), silently replacing font-size with a color declaration on the same `.text-base` class. All other tokens (`surface`, `elevated`, `subtle`, `copy-*`, `brand`, `accent-dim`, `ai`, `ai-text`, `error`, `success`, `warning`) don't collide with any built-in Tailwind scale key and are defined as normal `--color-*` theme entries.

## Session Notes

- Feature 04 still uses in-memory mock projects; no editor persistence was added in feature 05. Browser verification remains blocked by sign-in, and the port 3001 dev server is stopped.
- Prisma uses the existing `prisma7.config.ts` with the `prisma/` schema directory. Accelerate support adds `@prisma/extension-accelerate`; `ownerId` stores the Clerk user ID without adding a local User model.
- The execution shell uses Node 23.11.0, outside Prisma 7's supported engine range; use Node 24 LTS. Installation reported 17 dependency vulnerabilities (13 moderate, 4 high); no unrelated dependency upgrades were performed.
