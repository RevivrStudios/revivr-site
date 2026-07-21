import fs from 'fs';
import os from 'os';
import path from 'path';

// Canonical secrets source for the social pipeline (M1, 2026-07-09). Outside
// git and outside iCloud on purpose — survives dashboard redeploys. Never
// read secrets from the vault or from the runtime dir; this file is the only
// source. See ~/.revivr/social.env itself for the fill-in instructions.
export const SOCIAL_ENV_PATH = path.join(os.homedir(), '.revivr', 'social.env');

// Loads fresh on every call — no caching. Einar can edit this file directly
// (regenerated tokens, a newly filled-in blank) and the next request should
// see it immediately; a stale in-memory copy would silently keep serving
// revoked or missing credentials.
export function loadSocialEnv() {
  const values = {};
  if (!fs.existsSync(SOCIAL_ENV_PATH)) {
    return { exists: false, values };
  }
  const content = fs.readFileSync(SOCIAL_ENV_PATH, 'utf8');
  content.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eq = trimmed.indexOf('=');
    if (eq === -1) return;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (key) values[key] = value;
  });
  return { exists: true, values };
}

// Graceful-degradation check per the build plan: any account/feature whose
// required keys are blank should fall back to a "Copy" button, never throw.
// Usage: hasSocialToken('X_PERSONAL_ACCESS_TOKEN', 'X_PERSONAL_ACCESS_SECRET')
export function hasSocialToken(...keys) {
  const { values } = loadSocialEnv();
  return keys.every((k) => Boolean(values[k]));
}
