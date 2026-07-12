import { NextResponse } from 'next/server';
import { DASHBOARD_TOKEN } from '@/app/lib/config';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const { token } = await request.json().catch(() => ({}));
  if (!DASHBOARD_TOKEN) {
    return NextResponse.json({ success: true, note: 'Auth is disabled (no DASHBOARD_TOKEN set).' });
  }
  if (token !== DASHBOARD_TOKEN) {
    return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
  }
  const res = NextResponse.json({ success: true });
  res.cookies.set('revivr_dash_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    // 90 days — this is a single-operator dashboard, not a multi-user app.
    maxAge: 60 * 60 * 24 * 90,
    path: '/',
  });
  return res;
}
