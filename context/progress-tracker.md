# Progress Tracker

Update this file whenever the current phase, active feature, or implementation state changes.
For completed section Do short, comprehensive. 2-3 sentence description per feature.

## Current Phase

- Feature: 02 - Editor (base chrome complete)

## Current Goal

- Ready for the next feature unit (canvas implementation).

## Completed

- **01-design-system**: Initialized shadcn/ui with Button, Card, Dialog, Input, Tabs, Textarea, and ScrollArea in `components/ui/`, plus `lucide-react` and a `cn()` helper in `lib/utils.ts`. Rewired `app/globals.css` to the dark theme tokens from `context/ui-context.md`, wired the Geist fonts, and forced the `dark` class on `<html>`. Verified in-browser — no errors, no light-theme styling.
- **02-editor**: Built the base editor chrome — `editor-navbar.tsx` (sidebar toggle, left/center/right sections) and `project-sidebar.tsx` (floating slide-in overlay with Projects header, My Projects/Shared tabs, New Project button) — wired together in `app/page.tsx`. The Dialog pattern needed no new code since `components/ui/dialog.tsx` already covers it. Verified in-browser: toggle and tabs work, no TypeScript or lint errors.

## In Progress

- None yet.

## Next Up

- Add the next planned feature unit here (canvas / React Flow integration).

## Open Questions

- Add unresolved product or implementation questions here.

## Architecture Decisions

- The `base` background token (`--bg-base`) is exposed as a standalone `@utility bg-base { background-color: var(--bg-base); }` in `app/globals.css` rather than a generic `--color-base` theme entry. Registering `base` as a Tailwind `--color-*` key collides with Tailwind's built-in font-size scale key `base` (used by `text-base`, e.g. in shadcn's `Input`/`CardTitle`), silently replacing font-size with a color declaration on the same `.text-base` class. All other tokens (`surface`, `elevated`, `subtle`, `copy-*`, `brand`, `accent-dim`, `ai`, `ai-text`, `error`, `success`, `warning`) don't collide with any built-in Tailwind scale key and are defined as normal `--color-*` theme entries.

## Session Notes

- Add context needed to resume work in the next session.
