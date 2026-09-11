import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { getCurrentIdentity, getProjectAccess } from '@/lib/project-access';
import { enrichCollaborators, getOwnerProfile } from '@/lib/collaborator-profiles';

interface CollaboratorRouteContext {
  params: Promise<{ projectId: string }>;
}

async function readBody(request: Request): Promise<Record<string, unknown> | Response> {
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return Response.json({ error: 'Expected a JSON object' }, { status: 400 });
  }
  return body as Record<string, unknown>;
}

async function requireOwner(projectId: string, userId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { ownerId: true } });
  if (!project) return Response.json({ error: 'Project not found' }, { status: 404 });
  if (project.ownerId !== userId) return Response.json({ error: 'Forbidden' }, { status: 403 });
  return null;
}

export async function GET(_request: Request, { params }: CollaboratorRouteContext) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { projectId } = await params;
  const ownerAccess = await getProjectAccess(projectId, { userId, primaryEmail: null, verifiedEmails: [] });
  const project = ownerAccess ?? await getProjectAccess(projectId, await getCurrentIdentity());
  if (!project) return Response.json({ error: 'Project unavailable' }, { status: 404 });

  const collaborators = await prisma.projectCollaborator.findMany({
    where: { projectId }, select: { id: true, email: true }, orderBy: { createdAt: 'asc' },
  });
  const record = await prisma.project.findUnique({ where: { id: projectId }, select: { ownerId: true } });
  if (!record) return Response.json({ error: 'Project unavailable' }, { status: 404 });
  const [people, owner] = await Promise.all([
    enrichCollaborators(collaborators), getOwnerProfile(record.ownerId),
  ]);
  return Response.json({ collaborators: people, owner, isOwner: project.isOwner });
}

export async function POST(request: Request, { params }: CollaboratorRouteContext) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await readBody(request);
  if (body instanceof Response) return body;
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: 'Enter a valid email address' }, { status: 400 });
  }
  const { projectId } = await params;
  const denied = await requireOwner(projectId, userId);
  if (denied) return denied;
  const existing = await prisma.projectCollaborator.findFirst({
    where: { projectId, email: { equals: email, mode: 'insensitive' } },
  });
  if (existing) return Response.json({ error: 'This email already has access' }, { status: 409 });
  try {
    const collaborator = await prisma.projectCollaborator.create({ data: { projectId, email }, select: { id: true, email: true } });
    return Response.json({ ...collaborator, displayName: null, imageUrl: null }, { status: 201 });
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
      return Response.json({ error: 'This email already has access' }, { status: 409 });
    }
    throw error;
  }
}

export async function DELETE(request: Request, { params }: CollaboratorRouteContext) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await readBody(request);
  if (body instanceof Response) return body;
  if (typeof body.collaboratorId !== 'string' || !body.collaboratorId.trim()) {
    return Response.json({ error: 'Collaborator ID is required' }, { status: 400 });
  }
  const { projectId } = await params;
  const denied = await requireOwner(projectId, userId);
  if (denied) return denied;
  const result = await prisma.projectCollaborator.deleteMany({
    where: { id: body.collaboratorId, projectId, project: { ownerId: userId } },
  });
  if (!result.count) return Response.json({ error: 'Collaborator not found' }, { status: 404 });
  return new Response(null, { status: 204 });
}