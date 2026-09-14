import { auth, currentUser } from '@clerk/nextjs/server';
import { getProjectAccess } from '@/lib/project-access';
import { getLiveblocks } from '@/lib/liveblocks';
import { getCursorColor } from '@/lib/cursor-color';

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body: unknown = await request.json().catch(() => null);
  if (
    typeof body !== 'object' || body === null || Array.isArray(body) ||
    !('room' in body) || typeof body.room !== 'string' ||
    !/^[a-zA-Z0-9_-]{1,128}$/.test(body.room)
  ) {
    return Response.json({ error: 'A valid project room ID is required' }, { status: 400 });
  }

  const user = await currentUser();
  if (!user || user.id !== userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const project = await getProjectAccess(body.room, {
    userId,
    primaryEmail: user.primaryEmailAddress?.emailAddress ?? null,
    verifiedEmails: user.emailAddresses
      .filter((email) => email.verification?.status === 'verified')
      .map((email) => email.emailAddress),
  });
  if (!project) return Response.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const liveblocks = getLiveblocks();
    await liveblocks.getOrCreateRoom(project.id, { defaultAccesses: [] });

    const session = liveblocks.prepareSession(userId, {
      userInfo: {
        name: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username || 'Collaborator',
        avatar: user.imageUrl,
        color: getCursorColor(userId),
      },
    });
    session.allow(project.id, session.FULL_ACCESS);
    const { body: token, status } = await session.authorize();
    return new Response(token, {
      status,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  } catch {
    return Response.json({ error: 'Collaboration is temporarily unavailable' }, { status: 503 });
  }
}