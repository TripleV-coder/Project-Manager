import { NextResponse } from 'next/server';
import { authenticateRequest, serializeAuthenticatedUser } from '@/lib/requestAuth';
import { serializeUserWithProjectMenus } from '@/lib/resolveSidebarMenus';

export async function GET(request) {
  const user = await authenticateRequest(request);

  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  try {
    return NextResponse.json(await serializeUserWithProjectMenus(user, serializeAuthenticatedUser));
  } catch {
    return NextResponse.json(serializeAuthenticatedUser(user));
  }
}
