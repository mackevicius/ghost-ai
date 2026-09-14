import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

function load(file, dependencies = {}, globals = {}) {
  const exports = {};
  const { outputText } = ts.transpileModule(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  vm.runInNewContext(outputText, {
    exports, Request, Response, ...globals,
    require: (name) => {
      assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
      return dependencies[name];
    },
  });
  return exports;
}

const colors = load('lib/cursor-color.ts');

function setup({ userId = 'owner', allowed = true, userMissing = false, failure = false, tokenStatus = 200, unnamed = false } = {}) {
  const calls = [];
  const user = {
    id: userId, firstName: unnamed ? null : 'Ada', lastName: unnamed ? null : 'Lovelace', username: null,
    imageUrl: 'https://img.clerk.com/avatar',
    primaryEmailAddress: { emailAddress: 'ada@example.com' },
    emailAddresses: [
      { emailAddress: 'ada@example.com', verification: { status: 'verified' } },
      { emailAddress: 'unverified@example.com', verification: { status: 'unverified' } },
    ],
  };
  const liveblocks = {
    getOrCreateRoom: async (room, options) => {
      calls.push({ method: 'room', room, options: JSON.parse(JSON.stringify(options)) });
      if (failure) throw new Error('Provider failed');
    },
    prepareSession: (id, options) => {
      calls.push({ method: 'session', id, options: JSON.parse(JSON.stringify(options)) });
      return {
        FULL_ACCESS: ['room:write'],
        allow: (room, permissions) => calls.push({ method: 'allow', room, permissions }),
        authorize: async () => {
          calls.push({ method: 'authorize' });
          return { body: JSON.stringify({ token: 'test-token' }), status: tokenStatus };
        },
      };
    },
  };
  return {
    ...load('app/api/liveblocks-auth/route.ts', {
      '@clerk/nextjs/server': {
        auth: async () => ({ userId }),
        currentUser: async () => { calls.push({ method: 'user' }); return userMissing ? null : user; },
      },
      '@/lib/project-access': { getProjectAccess: async (room, identity) => {
        calls.push({ method: 'access', room, identity: JSON.parse(JSON.stringify(identity)) });
        return allowed ? { id: room, name: 'Project', isOwner: userId === 'owner' } : null;
      } },
      '@/lib/liveblocks': { getLiveblocks: () => { calls.push({ method: 'client' }); return liveblocks; } },
      '@/lib/cursor-color': colors,
    }),
    calls,
  };
}

const request = (body) => new Request('http://localhost/api/liveblocks-auth', { method: 'POST', body: JSON.stringify(body) });

test('signed-out requests return 401 without user, database, or Liveblocks calls', async () => {
  const api = setup({ userId: null });
  assert.equal((await api.POST(request({ room: 'project-123' }))).status, 401);
  assert.equal(api.calls.length, 0);
});

test('invalid JSON, missing rooms, and wildcard room grants are rejected', async () => {
  const api = setup();
  for (const body of [null, [], {}, { room: 1 }, { room: '' }, { room: '*' }, { room: 'project-*' }, { room: '../other' }, { room: 'a'.repeat(129) }]) {
    assert.equal((await api.POST(request(body))).status, 400);
  }
  assert.equal((await api.POST(new Request('http://localhost/api/liveblocks-auth', { method: 'POST', body: '{' }))).status, 400);
  assert.equal(api.calls.length, 0);
});

test('missing Clerk user returns 401 before project access', async () => {
  const api = setup({ userMissing: true });
  assert.equal((await api.POST(request({ room: 'project-123' }))).status, 401);
  assert.deepEqual(api.calls.map((call) => call.method), ['user']);
});

test('missing or unauthorized project returns 403 without provisioning a room', async () => {
  const api = setup({ allowed: false });
  assert.equal((await api.POST(request({ room: 'private-project' }))).status, 403);
  assert.deepEqual(api.calls.map((call) => call.method), ['user', 'access']);
});

test('owner and collaborator sessions check access before private room provisioning', async () => {
  for (const userId of ['owner', 'member']) {
    const api = setup({ userId });
    const response = await api.POST(request({ room: 'project-123', userId: 'forged', userInfo: { name: 'Forged' } }));
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { token: 'test-token' });
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
    assert.deepEqual(api.calls.map((call) => call.method), ['user', 'access', 'client', 'room', 'session', 'allow', 'authorize']);
    assert.deepEqual(api.calls[1].identity.verifiedEmails, ['ada@example.com']);
    assert.equal(api.calls[1].identity.userId, userId);
    assert.deepEqual(api.calls[3], { method: 'room', room: 'project-123', options: { defaultAccesses: [] } });
    assert.deepEqual(api.calls[4], {
      method: 'session', id: userId,
      options: { userInfo: { name: 'Ada Lovelace', avatar: 'https://img.clerk.com/avatar', color: colors.getCursorColor(userId) } },
    });
    assert.deepEqual(api.calls[5], { method: 'allow', room: 'project-123', permissions: ['room:write'] });
  }
});

test('profile without a name receives a stable display fallback', async () => {
  const api = setup({ unnamed: true });
  await api.POST(request({ room: 'project-123' }));
  assert.equal(api.calls.find((call) => call.method === 'session').options.userInfo.name, 'Collaborator');
});

test('room provisioning failure never issues a token', async () => {
  const api = setup({ failure: true });
  assert.equal((await api.POST(request({ room: 'project-123' }))).status, 503);
  assert.ok(!api.calls.some((call) => call.method === 'authorize'));
});

test('Liveblocks authorization status is preserved', async () => {
  const api = setup({ tokenStatus: 403 });
  assert.equal((await api.POST(request({ room: 'project-123' }))).status, 403);
});

test('cursor colors are deterministic and stay in the fixed palette', () => {
  for (const userId of ['', 'user_123', 'user_456', 'a'.repeat(1000)]) {
    assert.equal(colors.getCursorColor(userId), colors.getCursorColor(userId));
    assert.ok(colors.CURSOR_COLORS.includes(colors.getCursorColor(userId)));
  }
  assert.ok(new Set(Array.from({ length: 32 }, (_, index) => colors.getCursorColor(`user_${index}`))).size > 1);
});

test('Liveblocks singleton is lazy and cached across module reloads', () => {
  let created = 0;
  const globals = { process: { env: {} }, globalThis: {} };
  const dependencies = {
    'server-only': {},
    '@liveblocks/node': { Liveblocks: class {
      constructor(options) { created++; assert.equal(options.secret, 'sk_test'); }
    } },
  };
  const first = load('lib/liveblocks.ts', dependencies, globals);
  assert.equal(created, 0);
  assert.throws(() => first.getLiveblocks(), /LIVEBLOCKS_SECRET_KEY/);
  globals.process.env.LIVEBLOCKS_SECRET_KEY = 'sk_test';
  const instance = first.getLiveblocks();
  assert.equal(first.getLiveblocks(), instance);
  assert.equal(load('lib/liveblocks.ts', dependencies, globals).getLiveblocks(), instance);
  assert.equal(created, 1);
});

test('proxy lets the Liveblocks handler produce its own JSON authentication response', async () => {
  const { default: proxy } = load('proxy.ts', {
    '@clerk/nextjs/server': {
      clerkMiddleware: (handler) => handler,
      createRouteMatcher: (patterns) => (req) => patterns.some((pattern) => new RegExp(`^${pattern}$`).test(req.pathname)),
    },
  }, { process: { env: { NEXT_PUBLIC_CLERK_SIGN_IN_URL: '/sign-in', NEXT_PUBLIC_CLERK_SIGN_UP_URL: '/sign-up' } } });
  let protectedCount = 0;
  const auth = { protect: async () => { protectedCount++; } };
  await proxy(auth, { pathname: '/api/liveblocks-auth' });
  assert.equal(protectedCount, 0);
  await proxy(auth, { pathname: '/api/liveblocks-auth-other' });
  assert.equal(protectedCount, 1);
});