import 'server-only';

import { clerkClient } from '@clerk/nextjs/server';
import type { Collaborator } from '@/lib/collaborator-types';

export async function getOwnerProfile(ownerId: string): Promise<Collaborator> {
  const fallback: Collaborator = {
    id: ownerId,
    email: '',
    displayName: 'Project owner',
    imageUrl: null,
  };
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      (async () => {
        const client = await clerkClient();
        const user = await client.users.getUser(ownerId);
        const email =
          user.emailAddresses.find(
            (address) => address.id === user.primaryEmailAddressId,
          )?.emailAddress ?? '';
        return {
          id: ownerId,
          email,
          displayName:
            [user.firstName, user.lastName].filter(Boolean).join(' ') ||
            user.username ||
            'Project owner',
          imageUrl: user.hasImage ? user.imageUrl : null,
        };
      })(),
      new Promise<Collaborator>((resolve) => {
        timer = setTimeout(() => resolve(fallback), 1500);
      }),
    ]);
  } catch {
    return fallback;
  } finally {
    clearTimeout(timer);
  }
}

export async function enrichCollaborators(
  collaborators: { id: string; email: string }[],
): Promise<Collaborator[]> {
  if (!collaborators.length) return [];
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      loadProfiles(collaborators),
      new Promise<Collaborator[]>((resolve) => {
        timer = setTimeout(
          () =>
            resolve(
              collaborators.map((person) => ({
                ...person,
                displayName: null,
                imageUrl: null,
              })),
            ),
          1500,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

async function loadProfiles(
  collaborators: { id: string; email: string }[],
): Promise<Collaborator[]> {
  const profiles = new Map<
    string,
    { displayName: string | null; imageUrl: string | null }
  >();
  try {
    const client = await clerkClient();
    for (let start = 0; start < collaborators.length; start += 100) {
      const emailAddress = collaborators
        .slice(start, start + 100)
        .map((person) => person.email);
      let offset = 0;
      while (true) {
        const { data, totalCount } = await client.users.getUserList({
          emailAddress,
          limit: 100,
          offset,
        });
        for (const user of data) {
          for (const email of user.emailAddresses) {
            if (email.verification?.status !== 'verified') continue;
            profiles.set(email.emailAddress.toLowerCase(), {
              displayName:
                [user.firstName, user.lastName].filter(Boolean).join(' ') ||
                user.username ||
                null,
              imageUrl: user.hasImage ? user.imageUrl : null,
            });
          }
        }
        offset += data.length;
        if (!data.length || offset >= totalCount) break;
      }
    }
  } catch {
    // Profile enrichment must not prevent project access management.
  }

  return collaborators.map((person) => ({
    ...person,
    ...(profiles.get(person.email.toLowerCase()) ?? {
      displayName: null,
      imageUrl: null,
    }),
  }));
}
