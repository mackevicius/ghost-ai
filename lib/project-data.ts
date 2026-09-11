import 'server-only';

import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import type { ProjectLists } from '@/lib/project-types';

export async function getProjects(): Promise<ProjectLists> {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const user = await currentUser();
  const emails = user?.emailAddresses
    .filter((email) => email.verification?.status === 'verified')
    .map((email) => email.emailAddress) ?? [];
  const select = { id: true, name: true };
  const [owned, shared] = await Promise.all([
    prisma.project.findMany({ where: { ownerId: userId }, select, orderBy: { createdAt: 'desc' } }),
    emails.length ? prisma.project.findMany({
      where: {
        ownerId: { not: userId },
        collaborators: {
          some: { OR: emails.map((email) => ({ email: { equals: email, mode: 'insensitive' as const } })) },
        },
      },
      select,
      orderBy: { createdAt: 'desc' },
    }) : [],
  ]);

  return {
    ownedProjects: owned.map((project) => ({ ...project, isOwner: true })),
    sharedProjects: shared.map((project) => ({ ...project, isOwner: false })),
  };
}