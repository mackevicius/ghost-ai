import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { readProjectCreation } from '@/lib/project-input';

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const projects = await prisma.project.findMany({ where: { ownerId: userId } });

  return Response.json(projects);
}

export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const input = await readProjectCreation(request);

  if (input instanceof Response) return input;

  try {
    const project = await prisma.project.create({ data: { ...input, ownerId: userId } });
    return Response.json(project, { status: 201 });
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
      return Response.json({ error: 'Room ID already exists. Reopen the create dialog to try again.' }, { status: 409 });
    }
    throw error;
  }
}