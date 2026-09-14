import 'server-only';

import { getCurrentIdentity, type ClerkIdentity } from '@/lib/project-access';
import { prisma } from '@/lib/prisma';
import type { ProjectLists } from '@/lib/project-types';

export async function getProjects(
  identity?: ClerkIdentity,
): Promise<ProjectLists> {
  const { userId, verifiedEmails: emails } =
    identity ?? (await getCurrentIdentity());
  const select = { id: true, name: true };
  const [owned, shared] = await Promise.all([
    prisma.project.findMany({
      where: { ownerId: userId },
      select,
      orderBy: { createdAt: 'desc' },
    }),
    emails.length
      ? prisma.project.findMany({
          where: {
            ownerId: { not: userId },
            collaborators: {
              some: {
                OR: emails.map((email) => ({
                  email: { equals: email, mode: 'insensitive' as const },
                })),
              },
            },
          },
          select,
          orderBy: { createdAt: 'desc' },
        })
      : [],
  ]);

  return {
    ownedProjects: owned.map((project) => ({ ...project, isOwner: true })),
    sharedProjects: shared.map((project) => ({ ...project, isOwner: false })),
  };
}
