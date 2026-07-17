import { NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { createPairingToken } from '@/app/lib/devicePairing';
import { logAction } from '@/app/lib/actionlog';

export const dynamic = 'force-dynamic';

// Mint a single-use device-pairing link + QR code.
//
// This endpoint is NOT public — proxy.js already gates it, so only an
// already-authenticated session can reach it. That asymmetry is the security
// model: minting a login link requires auth; redeeming one (/pair/<token>)
// does not, because the new device has no credential yet.
export async function POST(request) {
  const { token, expiresAt } = createPairingToken();

  // Build the URL against the *public* origin the request came in on. Behind
  // Tailscale Serve the app itself sees localhost:3000, so honour the forwarded
  // host/proto headers — otherwise the QR would point at localhost and be
  // useless on the new device.
  const proto = request.headers.get('x-forwarded-proto') || request.nextUrl.protocol.replace(':', '');
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || request.nextUrl.host;
  const url = `${proto}://${host}/pair/${token}`;

  const qrDataUrl = await QRCode.toDataURL(url, { margin: 1, width: 320 });

  // Minting a working login link is a consequential action — record it, but
  // never log the token itself (it's a live credential for its 10-minute life).
  await logAction({
    source: 'device-pairing',
    action: 'mint',
    label: 'Minted device pairing link',
    success: true,
    detail: `link ****${token.slice(-4)} valid until ${new Date(expiresAt).toISOString()}`,
  });

  return NextResponse.json({ url, qrDataUrl, expiresAt });
}
