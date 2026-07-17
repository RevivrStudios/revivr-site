import { NextResponse } from 'next/server';
import { redeemPairingToken } from '@/app/lib/devicePairing';
import { setAuthCookie } from '@/app/lib/authCookie';
import { logAction } from '@/app/lib/actionlog';

export const dynamic = 'force-dynamic';

// Redeem a device-pairing link. This is a Route Handler, not a page: all it
// does is validate the token, set the auth cookie, and redirect. It is
// reachable WITHOUT auth (proxy.js treats /pair/ as public) — that's the whole
// point, so a brand-new device with no credential can complete pairing.
export async function GET(request, { params }) {
  const { token } = await params;

  // Resolve the public origin (forwarded host behind Tailscale Serve) so the
  // redirect lands on the same hostname the device used — a redirect to
  // localhost would strand a remote device.
  const proto = request.headers.get('x-forwarded-proto') || request.nextUrl.protocol.replace(':', '');
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || request.nextUrl.host;
  const origin = `${proto}://${host}`;

  const result = redeemPairingToken(token);

  if (!result.ok) {
    // Expired / used / unknown → fall back to the normal token-entry form.
    await logAction({
      source: 'device-pairing',
      action: 'redeem-rejected',
      label: 'Rejected device pairing link',
      success: false,
      detail: `link ****${(token || '').slice(-4)} rejected: ${result.reason}`,
    });
    return NextResponse.redirect(`${origin}/login`);
  }

  const res = NextResponse.redirect(`${origin}/`);
  setAuthCookie(res);
  await logAction({
    source: 'device-pairing',
    action: 'redeem',
    label: 'Paired a new device',
    success: true,
    detail: `link ****${token.slice(-4)} redeemed`,
  });
  return res;
}
