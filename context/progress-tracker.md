# Progress Tracker

Update this file whenever the current phase, active feature, or implementation state changes.
Completed section: 2-3 sentences per feature, max. Summarize what exists now, not the steps taken to build it — keep it short even if that means dropping detail.

## Current Phase

- Feature: 07 - Wire Editor Home (implemented; authenticated browser verification pending)

## Current Goal

- Complete authenticated browser verification of the server-loaded sidebar and project mutations before canvas work.

## Completed

- **01-design-system**: shadcn/ui (Button, Card, Dialog, Input, Tabs, Textarea, ScrollArea) installed in `components/ui/` with `lucide-react` and a `cn()` helper. `app/globals.css` carries the dark theme tokens and Geist fonts; `<html>` is forced dark. Verified in-browser, no light-theme leaks.
- **02-editor**: Base editor chrome — `editor-navbar.tsx` (sidebar toggle, three sections) and `project-sidebar.tsx` (floating overlay with tabs and New Project button) — wired together in `app/page.tsx`. Verified in-browser, no errors.
- **03-auth**: Clerk wired in via `proxy.ts` (protects all routes except sign-in/sign-up, built from the Clerk env vars) and `ClerkProvider` (dark theme + CSS-variable overrides) in the root layout. Editor chrome now lives at `app/editor`; `app/page.tsx` redirects based on auth state, and `/sign-in` / `/sign-up` use a shared two-panel `AuthLayout`. `UserButton` sits in the navbar. Verified: build passes, in-browser checks confirm redirects and the responsive two-panel layout.

- **04-project-dialogs**: Editor home and sidebar create controls open the Create Project dialog with a live slug preview; owned mock projects have rename/delete dialogs and mobile has an outside-click scrim. A dedicated hook manages local projects, forms, dialogs, and loading without API calls or persistence. TypeScript and state-transition checks pass; lint has no errors (one existing Clerk skill-template warning), with authenticated browser verification still pending.

- **05-prisma**: `prisma/models/project.prisma` defines Project and ProjectCollaborator with the requested status, relations, and indexes; `lib/prisma.ts` exports a development-cached singleton selecting Accelerate or the PostgreSQL adapter by URL. Migration `20260909134838_create_projects` was applied successfully and the client generated. Schema validation, TypeScript, singleton lint, and `npm run build` pass.

- **06-project-apis**: Added GET/POST `/api/projects` and PATCH/DELETE `/api/projects/[projectId]` with Clerk owner IDs, default `Untitled Project` naming, existing CUID generation, and owner-only mutations. Project API requests use handler-level JSON `401` responses; non-owner mutations return `403`, invalid input returns `400`, and missing projects return `404`. Nine mocked backend tests, focused TypeScript/lint checks, and `npm run build` pass; live authenticated database verification is pending and the UI remains unchanged.

- **07-wire-editor-home**: Editor home loads owned/shared projects server-side and wires `useProjectActions` to the sidebar and dialogs for create navigation, rename refresh, and delete refresh/redirect. Validated slug/suffix room IDs match project IDs; an access-checked `/editor/[projectId]` shell provides the approved destination without canvas features. All 21 mocked API/action/data tests, TypeScript, focused lint, and `npm run build` pass; authenticated live verification remains pending.

## In Progress

- Feature 07 authenticated browser verification remains pending: `/editor` redirects to sign-in in the available browser session. Create, rename, delete, and shared-project behavior are covered by mocked tests, not a live database/browser run.
- Feature 04 authenticated browser verification: focus, Enter submission, and responsive layout checks remain pending.
- Feature 06 live authenticated database verification remains pending; route behavior is covered with mocked Clerk and Prisma dependencies.

## Next Up

- Verify the feature 07 create/rename/delete flows, shared tab, dialog focus, and mobile layout with a signed-in session.
- Choose the next feature specification after authenticated verification; canvas / React Flow integration remains out of scope for feature 07.

## Open Questions

- None for feature 07. The user approved the missing data helper, minimal workspace route, and validated room-ID support in POST.

## Architecture Decisions

- The `base` background token (`--bg-base`) is exposed as a standalone `@utility bg-base { background-color: var(--bg-base); }` in `app/globals.css` rather than a generic `--color-base` theme entry. Registering `base` as a Tailwind `--color-*` key collides with Tailwind's built-in font-size scale key `base` (used by `text-base`, e.g. in shadcn's `Input`/`CardTitle`), silently replacing font-size with a color declaration on the same `.text-base` class. All other tokens (`surface`, `elevated`, `subtle`, `copy-*`, `brand`, `accent-dim`, `ai`, `ai-text`, `error`, `success`, `warning`) don't collide with any built-in Tailwind scale key and are defined as normal `--color-*` theme entries.

## Session Notes

- `/implement-spec` is saved as a VS Code user-profile prompt, available across projects. It reads the active editor spec, implements it under repository rules, runs required checks, and updates the progress tracker.
- Development server is available at `http://localhost:3001`; the production build completed before starting it. Signed-out browser verification confirms `/editor` redirects to sign-in.
- Feature 07 regression checks: `node --test tests/project-actions.test.mjs tests/project-api.test.mjs` (21 passing tests). Focused lint and production build pass with the existing Rosetta and parent-lockfile warnings.
- Feature 07 replaces feature 04's in-memory mock projects with server-loaded database projects. The workspace destination is a minimal shell, not a canvas implementation.
- Feature 06 returns a project array for GET, the project object for POST (201) and PATCH (200), and an empty DELETE response (204). JSON bodies must be objects; supplied names must be non-empty strings and are trimmed. Missing names default only on creation; raw client-supplied `id` and ownership are ignored. Feature 07 adds optional validated `roomId` (up to 100 lowercase alphanumeric/hyphen characters) and a `409` collision response.
- API regression checks run with `node --test tests/project-api.test.mjs`; they do not write to the database. The Prisma singleton exposes the standard client type consistently across its Accelerate and PostgreSQL branches.
- Prisma uses the existing `prisma7.config.ts` with the `prisma/` schema directory. Accelerate support adds `@prisma/extension-accelerate`; `ownerId` stores the Clerk user ID without adding a local User model.
- Feature 06 checks ran on Node 24.21.0. Build warnings report Rosetta translation and an ignored parent-directory lockfile; the build passes. The prior installation reported 17 dependency vulnerabilities (13 moderate, 4 high); no unrelated dependency upgrades were performed.
