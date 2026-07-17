import { NextResponse } from 'next/server';
import { DASHBOARD_TOKEN } from '@/app/lib/config';
import { setAuthCookie } from '@/app/lib/authCookie';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const { token } = await request.json().catch(() => ({}));
  if (!DASHBOARD_TOKEN) {
    return NextResponse.json({ success: true, note: 'Auth is disabled (no DASHBOARD_TOKEN set).' });
  }
  // Defense in depth: trim both sides. The login page already trims, but a raw
  // curl or a shortcut could send an untrimmed value (a trailing newline from
  // pasted grep output is the classic case) and silently fail the comparison.
  if ((token || '').trim() !== DASHBOARD_TOKEN.trim()) {
    return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
  }
  const res = NextResponse.json({ success: true });
  setAuthCookie(res);
  return res;
}
