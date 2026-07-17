import { DASHBOARD_TOKEN } from '@/app/lib/config';

// Single source of truth for the dashboard auth cookie. Both the normal login
// route and the QR device-pairing redeem route set the exact same cookie so a
// paired device is indistinguishable from one that typed the token.

export const AUTH_COOKIE_NAME = 'revivr_dash_token';

export const AUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax',
  // 90 days — this is a single-operator dashboard, not a multi-user app.
  maxAge: 60 * 60 * 24 * 90,
  path: '/',
};

// Sets the auth cookie on a NextResponse. The cookie value is the live
// DASHBOARD_TOKEN so proxy.js (which compares the cookie to the token) accepts
// it — pairing never needs to know or transmit the token to the new device.
export function setAuthCookie(res) {
  res.cookies.set(AUTH_COOKIE_NAME, DASHBOARD_TOKEN.trim(), AUTH_COOKIE_OPTIONS);
  return res;
}
