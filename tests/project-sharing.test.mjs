import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import { createElement } from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';

function load(file, dependencies, globals = {}) {
  const exports = {};
  const { outputText } = ts.transpileModule(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  });
  vm.runInNewContext(outputText, { exports, Request, Response, setTimeout, clearTimeout, ...globals, require: (name) => {
    assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
    return dependencies[name];
  } });
  return exports;
}

function setup({ userId = 'owner', access = true, ownerId = 'owner', existing = false, collision = false, count = 1 } = {}) {
  const calls = [];
  const record = { id: 'member-id', email: 'member@example.com' };
  const methods = Object.fromEntries(['findMany', 'findFirst', 'create', 'deleteMany'].map((method) => [method, async (args) => {
    calls.push({ method, args: JSON.parse(JSON.stringify(args)) });
    if (method === 'findMany') return [record];
    if (method === 'findFirst') return existing ? record : null;
    if (method === 'deleteMany') return { count };
    if (collision) throw { code: 'P2002' };
    return { id: record.id, email: args.data.email };
  }]));
  const api = load('app/api/projects/[projectId]/collaborators/route.ts', {
    '@clerk/nextjs/server': { auth: async () => ({ userId }) },
    '@/lib/prisma': { prisma: {
      project: { findUnique: async () => ownerId ? { ownerId } : null },
      projectCollaborator: methods,
    } },
    '@/lib/project-access': {
      getCurrentIdentity: async () => {
        calls.push({ method: 'identity' });
        return { userId, verifiedEmails: ['member@example.com'] };
      },
      getProjectAccess: async (_projectId, identity) => access && (userId === ownerId || identity.verifiedEmails.length) ? { isOwner: userId === ownerId } : null,
    },
    '@/lib/collaborator-profiles': {
      enrichCollaborators: async (people) => people.map((person) => ({ ...person, displayName: 'Member', imageUrl: 'https://img.clerk.com/avatar' })),
      getOwnerProfile: async (id) => ({ id, email: 'owner@example.com', displayName: 'Owner Name', imageUrl: null }),
    },
  });
  return { ...api, calls };
}

const context = { params: Promise.resolve({ projectId: 'room' }) };
const request = (method, body) => new Request('http://localhost/api/projects/room/collaborators', {
  method, ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});

test('all sharing routes return JSON 401 when signed out', async () => {
  const api = setup({ userId: null });
  for (const method of ['GET', 'POST', 'DELETE']) {
    assert.equal((await api[method](request(method), context)).status, 401);
  }
  assert.equal(api.calls.length, 0);
});

test('outsiders cannot list collaborators or receive Clerk profiles', async () => {
  const api = setup({ access: false });
  assert.equal((await api.GET(request('GET'), context)).status, 404);
  assert.deepEqual(api.calls.map((call) => call.method), ['identity']);
});

test('owners and collaborators can list, with server-derived permissions', async () => {
  for (const userId of ['owner', 'member']) {
    const api = setup({ userId });
    const response = await api.GET(request('GET'), context);
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.isOwner, userId === 'owner');
    assert.equal(body.collaborators[0].displayName, 'Member');
    assert.equal(body.owner.email, 'owner@example.com');
    assert.deepEqual(api.calls.find((call) => call.method === 'findMany').args.where, { projectId: 'room' });
    assert.equal(api.calls.some((call) => call.method === 'identity'), userId !== 'owner');
  }
});

test('collaborators cannot invite or remove even with forged owner input', async () => {
  const api = setup({ userId: 'member' });
  assert.equal((await api.POST(request('POST', { email: 'new@example.com', isOwner: true }), context)).status, 403);
  assert.equal((await api.DELETE(request('DELETE', { collaboratorId: 'member-id', isOwner: true }), context)).status, 403);
  assert.equal(api.calls.length, 0);
});

test('invite validates and normalizes email without accepting project overrides', async () => {
  const api = setup();
  for (const body of [null, [], {}, { email: 1 }, { email: 'invalid' }, { email: 'a @b.com' }]) {
    assert.equal((await api.POST(request('POST', body), context)).status, 400);
  }
  assert.equal(api.calls.length, 0);
  const response = await api.POST(request('POST', { email: ' Member@Example.com ', projectId: 'other' }), context);
  assert.equal(response.status, 201);
  assert.equal((await response.json()).email, 'member@example.com');
  assert.deepEqual(api.calls[1].args.data, { projectId: 'room', email: 'member@example.com' });
});

test('duplicate invites and racing duplicate writes return 409', async () => {
  for (const options of [{ existing: true }, { collision: true }]) {
    const api = setup(options);
    assert.equal((await api.POST(request('POST', { email: 'member@example.com' }), context)).status, 409);
  }
});

test('remove is scoped to collaborator, room, and owner', async () => {
  const api = setup();
  assert.equal((await api.DELETE(request('DELETE', {}), context)).status, 400);
  assert.equal((await api.DELETE(request('DELETE', { collaboratorId: 'member-id' }), context)).status, 204);
  assert.deepEqual(api.calls[0].args.where, { id: 'member-id', projectId: 'room', project: { ownerId: 'owner' } });
  const otherRoom = setup({ count: 0 });
  assert.equal((await otherRoom.DELETE(request('DELETE', { collaboratorId: 'elsewhere' }), context)).status, 404);
});

test('missing projects reject mutations', async () => {
  const api = setup({ ownerId: null });
  assert.equal((await api.POST(request('POST', { email: 'member@example.com' }), context)).status, 404);
  assert.equal((await api.DELETE(request('DELETE', { collaboratorId: 'member-id' }), context)).status, 404);
  assert.equal(api.calls.length, 0);
});

test('Clerk enriches matching verified emails with name and image, falling back for unknown emails', async () => {
  const { enrichCollaborators } = load('lib/collaborator-profiles.ts', {
    'server-only': {},
    '@clerk/nextjs/server': { clerkClient: async () => ({ users: { getUserList: async () => ({ totalCount: 1, data: [{
      firstName: 'Ada', lastName: 'Lovelace', username: null, hasImage: true, imageUrl: 'https://img.clerk.com/ada',
      emailAddresses: [{ emailAddress: 'ADA@example.com', verification: { status: 'verified' } }],
    }] }) } }) },
  });
  const people = await enrichCollaborators([{ id: 'ada', email: 'ada@example.com' }, { id: 'unknown', email: 'unknown@example.com' }]);
  assert.equal(people[0].displayName, 'Ada Lovelace');
  assert.equal(people[0].imageUrl, 'https://img.clerk.com/ada');
  assert.equal(people[1].displayName, null);
  assert.equal(people[1].imageUrl, null);
});

test('Clerk outage leaves the email-only collaborator list usable', async () => {
  const { enrichCollaborators } = load('lib/collaborator-profiles.ts', {
    'server-only': {},
    '@clerk/nextjs/server': { clerkClient: async () => { throw new Error('Unavailable'); } },
  });
  const people = await enrichCollaborators([{ id: 'member', email: 'member@example.com' }]);
  assert.equal(people[0].email, 'member@example.com');
  assert.equal(people[0].displayName, null);
});

test('slow Clerk enrichment falls back within its deadline', async () => {
  let deadline;
  const { enrichCollaborators } = load('lib/collaborator-profiles.ts', {
    'server-only': {},
    '@clerk/nextjs/server': { clerkClient: () => new Promise(() => {}) },
  }, {
    setTimeout: (callback, duration) => { assert.equal(duration, 1500); deadline = callback; return 1; },
    clearTimeout: () => {},
  });
  const pending = enrichCollaborators([{ id: 'member', email: 'member@example.com' }]);
  deadline();
  const people = await pending;
  assert.equal(people[0].email, 'member@example.com');
  assert.equal(people[0].displayName, null);
});

test('empty collaborator lists do not contact Clerk', async () => {
  const { enrichCollaborators } = load('lib/collaborator-profiles.ts', {
    'server-only': {},
    '@clerk/nextjs/server': { clerkClient: () => assert.fail('Clerk should not be called') },
  });
  assert.equal((await enrichCollaborators([])).length, 0);
});

test('dialog renders owner controls, but collaborators only receive the list', () => {
  for (const isOwner of [true, false]) {
    const block = ({ children }) => createElement('div', null, children);
    const icon = () => null;
    const { ShareDialog } = load('components/editor/share-dialog.tsx', {
      'react/jsx-runtime': jsxRuntime,
      'next/image': { default: () => null },
      'lucide-react': Object.fromEntries(['Check', 'Copy', 'LoaderCircle', 'Trash2', 'UserRound', 'UserRoundPlus'].map((name) => [name, icon])),
      '@/components/ui/button': { Button: ({ children, ...props }) => createElement('button', { 'aria-label': props['aria-label'] }, children) },
      '@/components/ui/input': { Input: () => createElement('input') },
      '@/components/ui/dialog': Object.fromEntries(['Dialog', 'DialogContent', 'DialogDescription', 'DialogHeader', 'DialogTitle'].map((name) => [name, block])),
      '@/hooks/use-project-sharing': { useProjectSharing: () => ({
        isOwner, collaborators: [{ id: 'member', email: 'ada@example.com', displayName: 'Ada', imageUrl: null }],
        owner: { id: 'owner', email: 'owner@example.com', displayName: 'Owner Name', imageUrl: null },
        loading: false, pending: false, email: '', error: null, copied: false,
      }) },
    });
    const html = renderToStaticMarkup(createElement(ShareDialog, { projectId: 'room', projectName: 'Project', onClose: () => {} }));
    assert.match(html, /Ada/);
    assert.match(html, /People with access/);
    assert.match(html, /owner@example.com/);
    assert.doesNotMatch(html, /Remove owner@example.com/);
    assert.equal(html.includes('(you)'), isOwner);
    assert.match(html, /ada@example.com/);
    for (const label of ['Invite', 'Remove ada@example.com', 'Copy project link']) {
      assert.equal(html.includes(label), isOwner);
    }
  }
});

test('copy writes the room URL and clears Copied feedback after two seconds', async () => {
  const states = [];
  const effects = [];
  let slot = 0;
  let timeout;
  let copiedText;
  const { useProjectSharing: runSharing } = load('hooks/use-project-sharing.ts', {
    react: {
      useState: (initial) => {
        const index = slot++;
        if (!(index in states)) states[index] = initial;
        return [states[index], (value) => { states[index] = typeof value === 'function' ? value(states[index]) : value; }];
      },
      useRef: (initial) => {
        const index = slot++;
        if (!(index in states)) states[index] = { current: initial };
        return states[index];
      },
      useEffect: (effect) => effects.push(effect),
    },
  }, {
    AbortController,
    fetch: async () => Response.json({ collaborators: [], owner: { id: 'owner', email: 'owner@example.com', displayName: 'Owner', imageUrl: null }, isOwner: true }),
    window: { location: { origin: 'http://localhost:3000' } },
    navigator: { clipboard: { writeText: async (text) => { copiedText = text; } } },
    setTimeout: (callback, milliseconds) => { timeout = callback; assert.equal(milliseconds, 2000); return 1; },
    clearTimeout: () => {},
  });
  const render = () => { slot = 0; return runSharing('room'); };
  render();
  const cleanup = effects[0]();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(render().isOwner, true);
  await render().copyLink();
  assert.equal(copiedText, 'http://localhost:3000/editor/room');
  assert.equal(render().copied, true);
  timeout();
  assert.equal(render().copied, false);
  cleanup();
});