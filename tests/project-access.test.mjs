import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

function setup(userId = 'owner', user = null, project = null) {
  const queries = [];
  const exports = {};
  const { outputText } = ts.transpileModule(
    readFileSync(new URL('../lib/project-access.ts', import.meta.url), 'utf8'),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  );
  const dependencies = {
    'server-only': {},
    '@clerk/nextjs/server': {
      auth: async () => ({ userId }),
      currentUser: async () => user,
    },
    'next/navigation': {
      redirect: (url) => {
        throw new Error(url);
      },
    },
    '@/lib/prisma': {
      prisma: {
        project: {
          findFirst: async (query) => {
            queries.push(JSON.parse(JSON.stringify(query)));
            return project;
          },
        },
      },
    },
  };
  vm.runInNewContext(outputText, {
    exports,
    require: (name) => {
      assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
      return dependencies[name];
    },
  });
  return { ...exports, queries };
}

test('signed-out identity redirects before querying projects', async () => {
  const helper = setup(null);
  await assert.rejects(helper.getCurrentIdentity(), /\/sign-in/);
  assert.equal(helper.queries.length, 0);
});

test('identity exposes primary email and only verified collaborator emails', async () => {
  const helper = setup('owner', {
    primaryEmailAddress: { emailAddress: 'primary@example.com' },
    emailAddresses: [
      {
        emailAddress: 'primary@example.com',
        verification: { status: 'verified' },
      },
      {
        emailAddress: 'secondary@example.com',
        verification: { status: 'verified' },
      },
      {
        emailAddress: 'unverified@example.com',
        verification: { status: 'unverified' },
      },
    ],
  });
  const identity = await helper.getCurrentIdentity();
  assert.equal(identity.userId, 'owner');
  assert.equal(identity.primaryEmail, 'primary@example.com');
  assert.deepEqual(Array.from(identity.verifiedEmails), [
    'primary@example.com',
    'secondary@example.com',
  ]);
});

test('owner access works without an email and returns only sidebar fields', async () => {
  const helper = setup('owner', null, {
    id: 'room',
    name: 'Project',
    ownerId: 'owner',
  });
  const project = await helper.getProjectAccess(
    'room',
    await helper.getCurrentIdentity(),
  );
  assert.deepEqual(JSON.parse(JSON.stringify(project)), {
    id: 'room',
    name: 'Project',
    isOwner: true,
  });
  assert.deepEqual(helper.queries[0].where, {
    id: 'room',
    OR: [{ ownerId: 'owner' }],
  });
});

test('collaborator query is scoped to the room and verified email, case-insensitively', async () => {
  const helper = setup('member', null, {
    id: 'room',
    name: 'Shared',
    ownerId: 'owner',
  });
  const project = await helper.getProjectAccess('room', {
    userId: 'member',
    primaryEmail: 'Member@example.com',
    verifiedEmails: ['Member@example.com'],
  });
  assert.equal(project.isOwner, false);
  assert.deepEqual(helper.queries[0].where, {
    id: 'room',
    OR: [
      { ownerId: 'member' },
      {
        collaborators: {
          some: {
            email: { equals: 'Member@example.com', mode: 'insensitive' },
          },
        },
      },
    ],
  });
});

test('missing or unauthorized projects return null', async () => {
  const helper = setup();
  assert.equal(
    await helper.getProjectAccess(
      'unavailable',
      await helper.getCurrentIdentity(),
    ),
    null,
  );
});
