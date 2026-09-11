export async function readProjectCreation(request: Request) {
  const name = await readProjectName(request.clone(), 'Untitled Project');
  if (name instanceof Response) return name;

  const body: { roomId?: unknown } = await request.json();
  const roomId = body.roomId;
  if (roomId !== undefined && (
    typeof roomId !== 'string' ||
    roomId.length > 100 ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(roomId)
  )) {
    return Response.json({ error: 'Invalid room ID' }, { status: 400 });
  }

  return { name, ...(typeof roomId === 'string' ? { id: roomId } : {}) };
}

export async function readProjectName(request: Request, defaultName?: string) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return Response.json({ error: 'Expected a JSON object' }, { status: 400 });
  }

  const name = 'name' in body ? body.name : defaultName;

  if (typeof name !== 'string' || !name.trim()) {
    return Response.json({ error: 'Name must be a non-empty string' }, { status: 400 });
  }

  return name.trim();
}