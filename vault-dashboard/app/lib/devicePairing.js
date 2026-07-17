import crypto from 'crypto';

// In-memory store of short-lived, single-use device-pairing tokens.
//
// This is deliberately a module-level Map, not a database: the dashboard is a
// single process serving a single operator, and pairing links live for
// minutes, not days. If the server restarts, outstanding links simply expire —
// which is the correct, fail-safe behaviour for a login credential.

const TTL_MS = 10 * 60 * 1000; // 10 minutes
export const PAIRING_TTL_MS = TTL_MS;

// token -> { expiresAt: number, used: boolean }
const tokens = new Map();

// Drop expired entries so the Map can't grow unbounded. Called opportunistically
// on every create; cheap for the handful of links that ever exist at once.
function prune(now) {
  for (const [token, meta] of tokens) {
    if (meta.expiresAt <= now || meta.used) tokens.delete(token);
  }
}

// Mint a new pairing token. Returns { token, expiresAt }.
export function createPairingToken() {
  const now = Date.now();
  prune(now);
  const token = crypto.randomBytes(24).toString('hex');
  const expiresAt = now + TTL_MS;
  tokens.set(token, { expiresAt, used: false });
  return { token, expiresAt };
}

// Redeem a pairing token. Returns { ok: true } on success (and marks it used),
// or { ok: false, reason } if the token is unknown, expired, or already used.
// Single-use is the whole point: a link that works twice is a reusable
// credential sitting in someone's browser history / iMessage thread.
export function redeemPairingToken(token) {
  const now = Date.now();
  const meta = token && tokens.get(token);
  if (!meta) return { ok: false, reason: 'unknown' };
  if (meta.used) return { ok: false, reason: 'used' };
  if (meta.expiresAt <= now) {
    tokens.delete(token);
    return { ok: false, reason: 'expired' };
  }
  meta.used = true;
  return { ok: true };
}
