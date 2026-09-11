import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import { createElement } from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';

function loadModule(file, dependencies, globals = {}) {
  const source = readFileSync(
    path.join(import.meta.dirname, '..', file),
    'utf8',
  );
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  });
  const exports = {};
  vm.runInNewContext(
    outputText,
    {
      exports,
      Response,
      Error,
      ...globals,
      require: (name) => {
        assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
        return dependencies[name];
      },
    },
    { filename: file },
  );
  return exports;
}

function setup(activeProjectId, respond) {
  const states = [];
  const requests = [];
  const navigations = [];
  let index = 0;
  let pending = false;
  let task;
  let uuidCount = 0;
  const { useProjectActions: runProjectActions } = loadModule(
    'hooks/use-project-actions.ts',
    {
      react: {
        useState(initial) {
          const slot = index++;
          if (!(slot in states)) states[slot] = initial;
          return [
            states[slot],
            (value) => {
              states[slot] = value;
            },
          ];
        },
        useRef(initial) {
          const slot = index++;
          if (!(slot in states)) states[slot] = { current: initial };
          return states[slot];
        },
        useTransition: () => [
          pending,
          (action) => {
            pending = true;
            task = action().finally(() => {
              pending = false;
            });
          },
        ],
      },
      'next/navigation': {
        useRouter: () =>
          Object.fromEntries(
            ['push', 'replace', 'refresh'].map((method) => [
              method,
              (...args) => navigations.push([method, ...args]),
            ]),
          ),
      },
    },
    {
      crypto: {
        randomUUID: () =>
          `${String(++uuidCount).padStart(8, '0')}-abcd-4000-8000-123456789012`,
      },
      fetch: async (url, options) => {
        requests.push({ url, ...options });
        if (respond) return respond(url, options);
        if (options.method === 'DELETE')
          return new Response(null, { status: 204 });
        const body = JSON.parse(options.body);
        return Response.json({
          id: body.roomId ?? 'project-id',
          name: body.name,
        });
      },
    },
  );
  return {
    render() {
      index = 0;
      return runProjectActions(activeProjectId);
    },
    settle: () => task,
    requests,
    navigations,
  };
}

const project = { id: 'project-id', name: 'Original', isOwner: true };

test('create submits the stable room preview and navigates to its workspace', async () => {
  const harness = setup();
  harness.render().openCreate();
  harness.render().setName(' My New Project ');
  const actions = harness.render();
  assert.equal(actions.roomId, 'my-new-project-00000001abcd');
  actions.submit();
  actions.submit();
  assert.equal(harness.render().isLoading, true);
  harness.render().close();
  assert.equal(harness.render().dialog.type, 'create');
  await harness.settle();
  assert.equal(harness.requests.length, 1);
  assert.deepEqual(JSON.parse(harness.requests[0].body), {
    name: 'My New Project',
    roomId: actions.roomId,
  });
  assert.deepEqual(harness.navigations, [
    ['push', `/editor/${actions.roomId}`],
  ]);
  assert.equal(harness.render().dialog, null);
});

test('room IDs are bounded and get a fresh suffix when reopening', () => {
  const harness = setup();
  harness.render().openCreate();
  harness.render().setName('a'.repeat(200));
  const first = harness.render().roomId;
  assert.equal(first.length, 100);
  harness.render().close();
  harness.render().openCreate();
  harness.render().setName('a'.repeat(200));
  assert.notEqual(harness.render().roomId, first);
  harness.render().setName('   ');
  assert.equal(harness.render().canSubmit, false);
});

test('rename prefills the name, sends PATCH, and refreshes', async () => {
  const harness = setup();
  harness.render().openProjectDialog('rename', project);
  assert.equal(harness.render().name, 'Original');
  harness.render().setName('Renamed');
  harness.render().submit();
  await harness.settle();
  assert.equal(harness.requests[0].url, '/api/projects/project-id');
  assert.equal(harness.requests[0].method, 'PATCH');
  assert.deepEqual(JSON.parse(harness.requests[0].body), { name: 'Renamed' });
  assert.deepEqual(harness.navigations, [['refresh']]);
});

test('delete refreshes another project and redirects for the active project', async () => {
  for (const activeId of ['another-project', 'project-id']) {
    const harness = setup(activeId);
    harness.render().openProjectDialog('delete', project);
    assert.equal(harness.render().dialog.project.name, 'Original');
    harness.render().submit();
    await harness.settle();
    assert.equal(harness.requests[0].method, 'DELETE');
    assert.equal(harness.requests[0].body, undefined);
    assert.deepEqual(
      harness.navigations,
      activeId === 'project-id'
        ? [['replace', '/editor'], ['refresh']]
        : [['refresh']],
    );
  }
});

test('API and network errors keep the dialog open and allow retry', async () => {
  for (const respond of [
    () => Response.json({ error: 'Forbidden' }, { status: 403 }),
    () => {
      throw new Error('Network unavailable');
    },
    () => new Response('Unavailable', { status: 503 }),
  ]) {
    const harness = setup(undefined, respond);
    harness.render().openProjectDialog('rename', project);
    harness.render().submit();
    await harness.settle();
    assert.equal(harness.render().dialog.type, 'rename');
    assert.ok(harness.render().error);
    assert.equal(harness.render().isLoading, false);
    assert.equal(harness.navigations.length, 0);
    harness.render().submit();
    await harness.settle();
    assert.equal(harness.requests.length, 2);
  }
});

test('shared projects cannot open mutation dialogs', () => {
  const harness = setup();
  for (const type of ['rename', 'delete']) {
    harness.render().openProjectDialog(type, { ...project, isOwner: false });
    assert.equal(harness.render().dialog, null);
  }
});

test('server data helper loads owned and verified-email shared projects', async () => {
  const queries = [];
  const { getProjects } = loadModule('lib/project-data.ts', {
    'server-only': {},
    '@/lib/project-access': {
      getCurrentIdentity: async () => ({
        userId: 'owner',
        primaryEmail: 'Member@Example.com',
        verifiedEmails: ['Member@Example.com'],
      }),
    },
    'next/navigation': { redirect: () => assert.fail('Unexpected redirect') },
    '@/lib/prisma': {
      prisma: {
        project: {
          findMany: async (query) => {
            queries.push(JSON.parse(JSON.stringify(query)));
            return [
              {
                id: queries.length === 1 ? 'owned' : 'shared',
                name: 'Project',
              },
            ];
          },
        },
      },
    },
  });
  const result = await getProjects();
  assert.equal(result.ownedProjects[0].isOwner, true);
  assert.equal(result.sharedProjects[0].isOwner, false);
  assert.deepEqual(queries[0].where, { ownerId: 'owner' });
  assert.deepEqual(queries[1].where, {
    ownerId: { not: 'owner' },
    collaborators: {
      some: {
        OR: [{ email: { equals: 'Member@Example.com', mode: 'insensitive' } }],
      },
    },
  });
});

test('server helper redirects signed-out users without database access', async () => {
  const { getProjects } = loadModule('lib/project-data.ts', {
    'server-only': {},
    '@/lib/project-access': {
      getCurrentIdentity: async () => {
        throw new Error('/sign-in');
      },
    },
    'next/navigation': {
      redirect: (url) => {
        throw new Error(url);
      },
    },
    '@/lib/prisma': { prisma: {} },
  });
  await assert.rejects(getProjects(), /\/sign-in/);
});

test('workspace renders project context and AccessDenied without loading lists for inaccessible rooms', async () => {
  let listCalls = 0;
  const { default: WorkspacePage } = loadModule(
    'app/editor/[roomId]/page.tsx',
    {
      'react/jsx-runtime': { jsx: (type, props) => ({ type, props }) },
      '@/components/editor/access-denied': { AccessDenied: 'AccessDenied' },
      '@/components/editor/editor-workspace': {
        EditorWorkspace: 'EditorWorkspace',
      },
      '@/lib/project-access': {
        getCurrentIdentity: async () => ({
          userId: 'owner',
          primaryEmail: null,
          verifiedEmails: [],
        }),
        getProjectAccess: async (roomId) =>
          roomId === project.id ? project : null,
      },
      '@/lib/project-data': {
        getProjects: async () => {
          listCalls++;
          return { ownedProjects: [project], sharedProjects: [] };
        },
      },
    },
  );
  const page = await WorkspacePage({
    params: Promise.resolve({ roomId: project.id }),
  });
  assert.equal(page.type, 'EditorWorkspace');
  assert.equal(page.props.activeProject.id, project.id);
  for (const roomId of ['private-project', 'missing-project']) {
    const denied = await WorkspacePage({ params: Promise.resolve({ roomId }) });
    assert.equal(denied.type, 'AccessDenied');
  }
  assert.equal(listCalls, 1);
});

test('workspace redirects signed-out users before reading a project or project lists', async () => {
  const { default: WorkspacePage } = loadModule(
    'app/editor/[roomId]/page.tsx',
    {
      'react/jsx-runtime': jsxRuntime,
      '@/components/editor/access-denied': {},
      '@/components/editor/editor-workspace': {},
      '@/lib/project-access': {
        getCurrentIdentity: async () => {
          throw new Error('/sign-in');
        },
        getProjectAccess: () => assert.fail('Project access should not run'),
      },
      '@/lib/project-data': {
        getProjects: () => assert.fail('Project lists should not load'),
      },
    },
  );
  await assert.rejects(
    WorkspacePage({ params: Promise.resolve({ roomId: project.id }) }),
    /\/sign-in/,
  );
});

test('workspace shell renders project name, share action, current room, and toggles AI placeholder', () => {
  const states = [];
  let stateIndex = 0;
  let navbarProps;
  let sidebarProps;
  let actionRoom;
  const icon = () => createElement('span');
  const button = ({ children, variant, size, ...props }) =>
    createElement(
      'button',
      { ...props, 'data-variant': variant, 'data-size': size },
      children,
    );
  const { EditorNavbar } = loadModule('components/editor/editor-navbar.tsx', {
    'react/jsx-runtime': jsxRuntime,
    'lucide-react': {
      PanelLeftClose: icon,
      PanelLeftOpen: icon,
      Share2: icon,
      Sparkles: icon,
    },
    '@clerk/nextjs': { UserButton: () => null },
    '@/components/ui/button': { Button: button },
  });
  const { EditorWorkspace } = loadModule(
    'components/editor/editor-workspace.tsx',
    {
      'react/jsx-runtime': jsxRuntime,
      react: {
        useSyncExternalStore: () => true,
        useState: (initial) => {
          const slot = stateIndex++;
          if (!(slot in states)) states[slot] = initial;
          return [
            states[slot],
            (value) => {
              states[slot] =
                typeof value === 'function' ? value(states[slot]) : value;
            },
          ];
        },
      },
      'lucide-react': { MessageSquare: icon, Workflow: icon, X: icon },
      '@/components/editor/editor-navbar': {
        EditorNavbar: (props) => {
          navbarProps = props;
          return createElement(EditorNavbar, props);
        },
      },
      '@/components/editor/project-sidebar': {
        ProjectSidebar: (props) => {
          sidebarProps = props;
          return null;
        },
      },
      '@/components/editor/project-dialogs': { ProjectDialogs: () => null },
      '@/components/editor/share-dialog': {
        ShareDialog: () => createElement('div', null, 'Share dialog opened'),
      },
      '@/components/ui/button': { Button: button },
      '@/hooks/use-project-actions': {
        useProjectActions: (roomId) => {
          actionRoom = roomId;
          return {};
        },
      },
    },
  );
  const render = () => {
    stateIndex = 0;
    return renderToStaticMarkup(
      createElement(EditorWorkspace, {
        activeProject: project,
        ownedProjects: [project],
        sharedProjects: [],
      }),
    );
  };
  const initial = render();
  assert.match(initial, /Original/);
  assert.match(initial, /aria-label="Share project"/);
  navbarProps.workspace.onShare();
  assert.match(render(), /Share dialog opened/);
  assert.match(initial, /Your canvas will appear here/);
  assert.equal(sidebarProps.activeProjectId, project.id);
  assert.equal(actionRoom, project.id);
  assert.match(initial, /AI chat is coming soon/);
  navbarProps.workspace.onToggleAiSidebar();
  assert.doesNotMatch(render(), /AI chat is coming soon/);
  assert.equal(navbarProps.workspace.isAiSidebarOpen, false);
  navbarProps.workspace.onToggleAiSidebar();
  assert.match(render(), /AI chat is coming soon/);
  navbarProps.onToggleSidebar();
  render();
  assert.equal(sidebarProps.isOpen, false);
});

test('AccessDenied renders a lock, generic message, and editor link', () => {
  const { AccessDenied } = loadModule('components/editor/access-denied.tsx', {
    'react/jsx-runtime': jsxRuntime,
    'next/link': {
      default: ({ children, ...props }) => createElement('a', props, children),
    },
    'lucide-react': {
      ArrowLeft: () => null,
      LockKeyhole: () => createElement('span', { 'data-icon': 'lock' }),
    },
  });
  const html = renderToStaticMarkup(createElement(AccessDenied));
  assert.match(html, /data-icon="lock"/);
  assert.match(html, /Access denied/);
  assert.match(html, /href="\/editor"/);
});
