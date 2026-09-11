import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { readProjectName } from '@/lib/project-input';

interface ProjectRouteContext {
  params: Promise<{ projectId: string }>;
}

export async function PATCH(request: Request, { params }: ProjectRouteContext) {
  const { userId } = await auth();

  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const name = await readProjectName(request);

  if (name instanceof Response) return name;

  const { projectId } = await params;
  const project = await prisma.project.findUnique({ where: { id: projectId } });

  if (!project) {
    return Response.json({ error: 'Project not found' }, { status: 404 });
  }

  if (project.ownerId !== userId) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const updatedProject = await prisma.project.update({
    where: { id: projectId, ownerId: userId },
    data: { name },
  });

  return Response.json(updatedProject);
}

export async function DELETE(_request: Request, { params }: ProjectRouteContext) {
  const { userId } = await auth();

  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { projectId } = await params;
  const project = await prisma.project.findUnique({ where: { id: projectId } });

  if (!project) {
    return Response.json({ error: 'Project not found' }, { status: 404 });
  }

  if (project.ownerId !== userId) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  await prisma.project.delete({ where: { id: projectId, ownerId: userId } });

  return new Response(null, { status: 204 });
}