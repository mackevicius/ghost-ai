Wire the editor home sidebar and dialogs to the real project API.

### Data Fetching

The editor home page is a server component.

Fetch owned and shared projects server-side using the existing project data helper and pass both lists to the sidebar.

No client-side fetching for initial load.

### `useProjectActions`

Create a hook in `hooks/` that manages dialog state and project mutations.

**Create**

- manage create dialog state
- manage project name input
- generate a short unique suffix
- slugify the name to create the room ID
- call `POST /api/projects`
- navigate to the new workspace

The project ID and Liveblocks room ID should stay aligned.

**Rename**

- store target project id + current name
- call `PATCH /api/projects/[id]`
- refresh on success

**Delete**

- store target project
- call `DELETE /api/projects/[id]`
- redirect to `/editor` if deleting the active workspace
- otherwise refresh

### Wiring

Connect the hook to the sidebar and dialogs.

- create dialog shows room ID preview
- rename dialog pre-fills current name
- delete dialog shows project name

### Check When Done

- sidebar uses real project data
- create navigates to workspace
- rename updates correctly
- delete refreshes or redirects correctly
- `npm run build` passes

### Approved Dependencies

- Add `lib/project-data.ts` because the referenced data helper does not yet exist. Load owned projects by Clerk user ID and shared projects by verified Clerk email addresses, excluding owned projects from the shared list.
- Add a minimal `/editor/[projectId]` destination with existing editor chrome, project name, and room ID; canvas functionality remains out of scope. Only owners and matching collaborators can open it.
- Accept an optional validated `roomId` in POST and persist it as the project ID. Preserve server-generated IDs when omitted, continue ignoring supplied ownership and raw `id`, and return `409` on collision.
