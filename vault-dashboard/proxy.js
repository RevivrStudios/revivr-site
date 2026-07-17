import { NextResponse } from 'next/server';

// Access control for the whole dashboard (pages + APIs).
// Enabled only when DASHBOARD_TOKEN is set — local dev stays open.
// Required for any remote exposure (Tailscale Serve, port-forward):
// the MCP execute endpoint runs shell commands and must never sit on a
// network unauthenticated.

const PUBLIC_PATHS = ['/login', '/api/auth/login', '/favicon.ico', '/revivr-logo.jpeg'];

export default function proxy(request) {
  const token = process.env.DASHBOARD_TOKEN;
  if (!token) return NextResponse.next();

  const { pathname } = request.nextUrl;
  // `/pair/<token>` is a public *prefix*, not an exact path: an unauthenticated
  // new device must be able to reach its redeem link. The token itself is the
  // single-use credential. Note this only opens redeeming — minting
  // (/api/auth/pair, /settings/devices) stays gated below, so only an
  // already-authenticated session can create pairing links.
  if (
    pathname.startsWith('/pair/') ||
    PUBLIC_PATHS.some((p) => pathname === p) ||
    pathname.startsWith('/_next/')
  ) {
    return NextResponse.next();
  }

  const cookie = request.cookies.get('revivr_dash_token')?.value;
  const header = request.headers.get('authorization');
  const bearer = header?.startsWith('Bearer ') ? header.slice(7) : null;

  if (cookie === token || bearer === token) return NextResponse.next();

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = '/login';
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
