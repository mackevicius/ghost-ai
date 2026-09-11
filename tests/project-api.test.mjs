import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

function loadModule(file, dependencies = {}) {
  const source = readFileSync(path.join(import.meta.dirname, '..', file), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const exports = {};
  vm.runInNewContext(outputText, {
    exports,
    Request,
    Response,
    require: (name) => {
      assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
      return dependencies[name];
    },
    process: { env: {
      NEXT_PUBLIC_CLERK_SIGN_IN_URL: '/sign-in',
      NEXT_PUBLIC_CLERK_SIGN_UP_URL: '/sign-up',
    } },
  }, { filename: file });
  return exports;
}

function setup(userId = 'owner', ownerId = 'owner', createError) {
  const calls = [];
  const project = ownerId === null ? null : { id: 'project-id', ownerId, name: 'Original' };
  const database = Object.fromEntries(['findMany', 'findUnique', 'create', 'update', 'delete'].map((method) => [
    method,
    async (args) => {
      calls.push({ method, args: JSON.parse(JSON.stringify(args)) });
      if (method === 'create' && createError) throw createError;
      if (method === 'findMany') return [project];
      return { ...project, ...args.data };
    },
  ]));
  database.findUnique = async (args) => {
    calls.push({ method: 'findUnique', args: JSON.parse(JSON.stringify(args)) });
    return project;
  };
  const dependencies = {
    '@clerk/nextjs/server': { auth: async () => ({ userId }) },
    '@/lib/prisma': { prisma: { project: database } },
    '@/lib/project-input': loadModule('lib/project-input.ts'),
  };
  return {
    ...loadModule('app/api/projects/route.ts', dependencies),
    ...loadModule('app/api/projects/[projectId]/route.ts', dependencies),
    calls,
  };
}

const context = { params: Promise.resolve({ projectId: 'project-id' }) };
const request = (method, body) => new Request('http://localhost/api/projects/project-id', {
  method,
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});

test('all routes return 401 without database access when signed out', async () => {
  const api = setup(null);
  for (const method of ['GET', 'POST', 'PATCH', 'DELETE']) {
    const response = await api[method](request(method), context);
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: 'Unauthorized' });
  }
  assert.equal(api.calls.length, 0);
});

test('list is filtered to the authenticated owner', async () => {
  const api = setup();
  assert.equal((await api.GET()).status, 200);
  assert.deepEqual(api.calls, [{ method: 'findMany', args: { where: { ownerId: 'owner' } } }]);
});

test('creation defaults missing name, ignores supplied ownership and IDs', async () => {
  const api = setup();
  const response = await api.POST(request('POST', { ownerId: 'other', id: 'supplied' }));
  assert.equal(response.status, 201);
  assert.equal((await response.json()).name, 'Untitled Project');
  assert.deepEqual(api.calls, [{ method: 'create', args: { data: { name: 'Untitled Project', ownerId: 'owner' } } }]);
});

test('creation accepts a supplied name', async () => {
  const api = setup();
  const response = await api.POST(request('POST', { name: 'My Project' }));
  assert.equal(response.status, 201);
  assert.equal((await response.json()).name, 'My Project');
});

test('creation aligns the project ID with the validated room ID', async () => {
  const api = setup();
  const response = await api.POST(request('POST', { name: 'My Project', roomId: 'my-project-a12b34cd' }));
  assert.equal(response.status, 201);
  assert.equal((await response.json()).id, 'my-project-a12b34cd');
  assert.equal(api.calls[0].args.data.ownerId, 'owner');
});

test('invalid room IDs are rejected before database access', async () => {
  const api = setup();
  for (const roomId of ['', '../editor', 'UPPER', '-name', 'name-', 'a'.repeat(101), null, 12]) {
    assert.equal((await api.POST(request('POST', { name: 'Project', roomId }))).status, 400);
  }
  assert.equal(api.calls.length, 0);
});

test('duplicate room IDs return a conflict', async () => {
  const api = setup('owner', 'owner', { code: 'P2002' });
  assert.equal((await api.POST(request('POST', { name: 'Project', roomId: 'project-1234abcd' }))).status, 409);
});

test('non-owners cannot rename or delete', async () => {
  const api = setup('other');
  for (const method of ['PATCH', 'DELETE']) {
    const response = await api[method](request(method, method === 'PATCH' ? { name: 'Renamed' } : undefined), context);
    assert.equal(response.status, 403);
    assert.deepEqual(await response.json(), { error: 'Forbidden' });
  }
  assert.ok(api.calls.every(({ method }) => method === 'findUnique'));
});

test('owners can rename and delete with owner-scoped writes', async () => {
  const api = setup();
  const renamed = await api.PATCH(request('PATCH', { name: 'Renamed', ownerId: 'other' }), context);
  assert.equal(renamed.status, 200);
  assert.equal((await renamed.json()).name, 'Renamed');
  assert.deepEqual(api.calls[1], { method: 'update', args: {
    where: { id: 'project-id', ownerId: 'owner' }, data: { name: 'Renamed' },
  } });
  const deleted = await api.DELETE(request('DELETE'), context);
  assert.equal(deleted.status, 204);
  assert.equal(await deleted.text(), '');
  assert.deepEqual(api.calls[3], { method: 'delete', args: { where: { id: 'project-id', ownerId: 'owner' } } });
});

test('missing projects return 404 without mutations', async () => {
  const api = setup('owner', null);
  assert.equal((await api.PATCH(request('PATCH', { name: 'Renamed' }), context)).status, 404);
  assert.equal((await api.DELETE(request('DELETE'), context)).status, 404);
  assert.ok(api.calls.every(({ method }) => method === 'findUnique'));
});

test('invalid input returns 400 without database access', async () => {
  const api = setup();
  for (const method of ['POST', 'PATCH']) {
    for (const body of [null, [], 'name', { name: 1 }, { name: null }, { name: ' ' }]) {
      assert.equal((await api[method](request(method, body), context)).status, 400);
    }
    const malformed = new Request('http://localhost/api/projects', { method, body: '{' });
    assert.equal((await api[method](malformed, context)).status, 400);
  }
  assert.equal((await api.PATCH(request('PATCH', {}), context)).status, 400);
  assert.equal(api.calls.length, 0);
});

test('proxy defers project API auth to handlers but still protects other routes', async () => {
  const { default: proxy } = loadModule('proxy.ts', {
    '@clerk/nextjs/server': {
      clerkMiddleware: (handler) => handler,
      createRouteMatcher: (patterns) => (req) => patterns.some((pattern) => new RegExp(`^${pattern}$`).test(req.pathname)),
    },
  });
  let protectedCount = 0;
  const auth = { protect: async () => { protectedCount += 1; } };
  for (const pathname of ['/api/projects', '/api/projects/project-id', '/sign-in', '/sign-up']) {
    await proxy(auth, { pathname });
  }
  assert.equal(protectedCount, 0);
  for (const pathname of ['/editor', '/api/other', '/api/projects-other']) {
    await proxy(auth, { pathname });
  }
  assert.equal(protectedCount, 3);
});