#!/usr/bin/env node
// linkedin-oauth-setup — one-time (and every ~60 days) LinkedIn OAuth consent.
//
// Prereqs, done once in the LinkedIn developer portal (developers.linkedin.com):
//   1. App created + verified against the Revivr Studios page.
//   2. Products added: "Share on LinkedIn" and "Sign In with LinkedIn using
//      OpenID Connect".
//   3. Auth tab -> Authorized redirect URLs includes: http://localhost:8477/callback
//   4. ~/.revivr/social.env contains LINKEDIN_CLIENT_ID= and LINKEDIN_CLIENT_SECRET=
//
// Run:  node linkedin-oauth-setup.js
// It prints a URL — open it, click Allow as Einar, and the script captures the
// code, exchanges it, and writes LINKEDIN_ACCESS_TOKEN / LINKEDIN_PERSON_URN /
// LINKEDIN_TOKEN_EXPIRES into ~/.revivr/social.env. Re-run any time to refresh.

const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');

const ENV_PATH = path.join(os.homedir(), '.revivr', 'social.env');
const PORT = 8477;
const REDIRECT = `http://localhost:${PORT}/callback`;
const SCOPE = 'openid profile w_member_social';

function readEnv() {
  const values = {};
  for (const line of fs.readFileSync(ENV_PATH, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq > 0) values[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
  }
  return values;
}

function upsertEnv(updates) {
  let content = fs.readFileSync(ENV_PATH, 'utf8');
  for (const [key, value] of Object.entries(updates)) {
    const re = new RegExp(`^${key}=.*$`, 'm');
    if (re.test(content)) content = content.replace(re, `${key}=${value}`);
    else content += `${content.endsWith('\n') ? '' : '\n'}${key}=${value}\n`;
  }
  fs.writeFileSync(ENV_PATH, content);
}

async function main() {
  const env = readEnv();
  const id = env.LINKEDIN_CLIENT_ID;
  const secret = env.LINKEDIN_CLIENT_SECRET;
  if (!id || !secret) {
    console.error(`Missing LINKEDIN_CLIENT_ID / LINKEDIN_CLIENT_SECRET in ${ENV_PATH}`);
    console.error('Paste them from the app\'s Auth tab at developers.linkedin.com first.');
    process.exit(1);
  }

  const state = Math.random().toString(36).slice(2);
  const authUrl =
    'https://www.linkedin.com/oauth/v2/authorization' +
    `?response_type=code&client_id=${encodeURIComponent(id)}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT)}` +
    `&state=${state}&scope=${encodeURIComponent(SCOPE)}`;

  const code = await new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, `http://localhost:${PORT}`);
      if (url.pathname !== '/callback') { res.writeHead(404).end(); return; }
      const err = url.searchParams.get('error_description') || url.searchParams.get('error');
      if (err || url.searchParams.get('state') !== state) {
        res.writeHead(400, { 'Content-Type': 'text/plain' }).end(`LinkedIn returned an error: ${err || 'state mismatch'}`);
        server.close();
        reject(new Error(err || 'state mismatch'));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html' })
        .end('<h2>LinkedIn connected — you can close this tab.</h2>');
      server.close();
      resolve(url.searchParams.get('code'));
    });
    server.listen(PORT, () => {
      console.log('\n1. Open this URL (opening automatically):\n\n' + authUrl + '\n');
      console.log('2. Sign in as Einar and click Allow. Waiting for the redirect…');
      try { execSync(`open "${authUrl}"`); } catch { /* manual open */ }
    });
    setTimeout(() => { server.close(); reject(new Error('timed out after 5 minutes')); }, 300000);
  });

  const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: id,
      client_secret: secret,
      redirect_uri: REDIRECT,
    }),
  });
  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) throw new Error('Token exchange failed: ' + JSON.stringify(tokenData).slice(0, 300));

  const me = await (await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  })).json();
  if (!me.sub) throw new Error('userinfo failed: ' + JSON.stringify(me).slice(0, 200));

  const expires = new Date(Date.now() + (tokenData.expires_in || 5184000) * 1000).toISOString();
  upsertEnv({
    LINKEDIN_ACCESS_TOKEN: tokenData.access_token,
    LINKEDIN_PERSON_URN: `urn:li:person:${me.sub}`,
    LINKEDIN_TOKEN_EXPIRES: expires,
  });
  console.log(`\n✅ Connected as ${me.name || me.sub}. Token valid until ${expires.slice(0, 10)}.`);
  console.log('LinkedIn drafts in the social queue now show Approve instead of Copy.');
}

main().catch((err) => { console.error('\n❌ ' + err.message); process.exit(1); });
