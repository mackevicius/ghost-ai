import 'server-only';

import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import type { Project } from '@/lib/project-types';

export interface ClerkIdentity {
  userId: string;
  primaryEmail: string | null;
  verifiedEmails: string[];
}

export async function getCurrentIdentity(): Promise<ClerkIdentity> {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const user = await currentUser();
  return {
    userId,
    primaryEmail: user?.primaryEmailAddress?.emailAddress ?? null,
    verifiedEmails: user?.emailAddresses
      .filter((email) => email.verification?.status === 'verified')
      .map((email) => email.emailAddress) ?? [],
  };
}

export async function getProjectAccess(roomId: string, identity: ClerkIdentity): Promise<Project | null> {
  const project = await prisma.project.findFirst({
    where: {
      id: roomId,
      OR: [
        { ownerId: identity.userId },
        ...identity.verifiedEmails.map((email) => ({
          collaborators: { some: { email: { equals: email, mode: 'insensitive' as const } } },
        })),
      ],
    },
    select: { id: true, name: true, ownerId: true },
  });

  return project ? { id: project.id, name: project.name, isOwner: project.ownerId === identity.userId } : null;
}