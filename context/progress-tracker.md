# Progress Tracker

Update this file whenever the current phase, active feature, or implementation state changes.

## Current Phase

- Feature: 01 - Design System (complete)

## Current Goal

- Ready for the next feature unit.

## Completed

- 01-design-system: shadcn/ui initialized (`components.json`, style `base-nova`, `@base-ui/react` primitives). Added Button, Card, Dialog, Input, Tabs, Textarea, ScrollArea to `components/ui/`.
- 01-design-system: installed `lucide-react`.
- 01-design-system: `lib/utils.ts` created by shadcn init, re-exports `cn()` from the `cn` package (clsx + tailwind-merge behavior).
- 01-design-system: `app/globals.css` rewired to the dark theme tokens from `context/ui-context.md` (`--bg-*`, `--text-*`, `--accent-*`, `--state-*`) mapped to Tailwind utilities (`bg-surface`, `text-copy-*`, `border-surface-border`, `text-brand`, `bg-accent-dim`, etc.) via `@theme inline`. `bg-base` implemented as a standalone `@utility` to avoid colliding with Tailwind's built-in `text-base` font-size scale.
- 01-design-system: wired `--font-sans`/`--font-mono` to the Geist variables set in `app/layout.tsx`; added `dark` class to `<html>` so shadcn's `dark:` utility variants apply (dark-only theme, no light mode).
- 01-design-system: verified in-browser (dev server + screenshots) — components import without errors, `cn()` works, theme colors/fonts compute correctly, no light-theme styling appears.

## In Progress

- None yet.

## Next Up

- Add the next planned feature unit here.

## Open Questions

- Add unresolved product or implementation questions here.

## Architecture Decisions

- The `base` background token (`--bg-base`) is exposed as a standalone `@utility bg-base { background-color: var(--bg-base); }` in `app/globals.css` rather than a generic `--color-base` theme entry. Registering `base` as a Tailwind `--color-*` key collides with Tailwind's built-in font-size scale key `base` (used by `text-base`, e.g. in shadcn's `Input`/`CardTitle`), silently replacing font-size with a color declaration on the same `.text-base` class. All other tokens (`surface`, `elevated`, `subtle`, `copy-*`, `brand`, `accent-dim`, `ai`, `ai-text`, `error`, `success`, `warning`) don't collide with any built-in Tailwind scale key and are defined as normal `--color-*` theme entries.

## Session Notes

- Add context needed to resume work in the next session.
