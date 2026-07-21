import crypto from 'crypto';
import { loadSocialEnv } from './_env';

// Minimal X (Twitter) API v2 client: OAuth 1.0a user-context signing (for
// posting/reposting) + Bearer app-only reads (for previews). No npm
// dependency added — deliberate, since `npm install` must never run against
// the iCloud source (see AGENTS.md), and Node's built-in `crypto` covers
// HMAC-SHA1 signing fully.

const API_ROOT = 'https://api.twitter.com/2';

function percentEncode(str) {
  return encodeURIComponent(str).replace(/[!*'()]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
}

// Builds the OAuth 1.0a Authorization header for a request. `queryParams` are
// the URL query-string params (if any) — a JSON request body is deliberately
// NOT included in the signature base string, matching X API v2's own OAuth 1.0a
// behavior for non-form-encoded bodies.
function buildOAuth1Header({ method, url, queryParams = {}, consumerKey, consumerSecret, token, tokenSecret }) {
  const oauthParams = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: String(Math.floor(Date.now() / 1000)),
    oauth_token: token,
    oauth_version: '1.0',
  };

  const allParams = { ...queryParams, ...oauthParams };
  const paramString = Object.keys(allParams)
    .sort()
    .map((k) => `${percentEncode(k)}=${percentEncode(allParams[k])}`)
    .join('&');

  const baseString = [method.toUpperCase(), percentEncode(url), percentEncode(paramString)].join('&');
  const signingKey = `${percentEncode(consumerSecret)}&${percentEncode(tokenSecret)}`;
  const signature = crypto.createHmac('sha1', signingKey).update(baseString).digest('base64');

  const headerParams = { ...oauthParams, oauth_signature: signature };
  const header = 'OAuth ' + Object.keys(headerParams)
    .sort()
    .map((k) => `${percentEncode(k)}="${percentEncode(headerParams[k])}"`)
    .join(', ');
  return header;
}

// account: 'x-personal' | 'x-company'
function tokenPairFor(account, values) {
  if (account === 'x-personal') return { token: values.X_PERSONAL_ACCESS_TOKEN, secret: values.X_PERSONAL_ACCESS_SECRET };
  if (account === 'x-company') return { token: values.X_COMPANY_ACCESS_TOKEN, secret: values.X_COMPANY_ACCESS_SECRET };
  return { token: null, secret: null };
}

export function xAccountReady(account) {
  const { values } = loadSocialEnv();
  const { token, secret } = tokenPairFor(account, values);
  return Boolean(values.X_API_KEY && values.X_API_SECRET && token && secret);
}

// X access tokens are formatted `<user_id>-<random>` — the numeric user id
// is embedded in the token itself, avoiding a separate /users/me lookup.
export function userIdForAccount(account) {
  const { values } = loadSocialEnv();
  const { token } = tokenPairFor(account, values);
  if (!token) return null;
  const dash = token.indexOf('-');
  return dash === -1 ? null : token.slice(0, dash);
}

async function oauth1Request({ account, method, url, queryParams, body }) {
  const { values } = loadSocialEnv();
  const { token, secret } = tokenPairFor(account, values);
  if (!values.X_API_KEY || !values.X_API_SECRET || !token || !secret) {
    throw new Error(`Missing X API tokens for ${account}`);
  }
  const authHeader = buildOAuth1Header({
    method,
    url,
    queryParams,
    consumerKey: values.X_API_KEY,
    consumerSecret: values.X_API_SECRET,
    token,
    tokenSecret: secret,
  });
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`X API ${method} ${url} failed (${res.status}): ${JSON.stringify(data)}`);
  }
  return data;
}

// Read-only, safe to call for verification — GET /2/users/me is OAuth
// 1.0a-signed but never publishes anything.
export function whoAmI(account) {
  return oauth1Request({ account, method: 'GET', url: `${API_ROOT}/users/me` });
}

export async function postTweet(account, { text, quoteTweetId }) {
  const body = { text };
  if (quoteTweetId) body.quote_tweet_id = quoteTweetId;
  try {
    return await oauth1Request({ account, method: 'POST', url: `${API_ROOT}/tweets`, body });
  } catch (err) {
    // Free-tier X API can post standalone tweets but refuses quote_tweet_id
    // on posts by other authors (403 "not-authorized-for-resource" — exactly
    // what every repost-scout draft hits). Degrade to a standalone post with
    // the quoted tweet's URL appended: X renders a trailing status URL as the
    // same quote card, so the published tweet is visually equivalent. A tier
    // upgrade (Basic+) makes the first attempt succeed and this path go dormant.
    const message = String(err?.message || err);
    if (quoteTweetId && (message.includes('not-authorized-for-resource') || message.includes('only reply to or quote'))) {
      const quoteUrl = `https://x.com/i/status/${quoteTweetId}`;
      return oauth1Request({
        account,
        method: 'POST',
        url: `${API_ROOT}/tweets`,
        body: { text: `${text} ${quoteUrl}` },
      });
    }
    throw err;
  }
}

export function repostTweet(account, tweetId) {
  const userId = userIdForAccount(account);
  if (!userId) throw new Error(`No user id resolvable for ${account}`);
  return oauth1Request({
    account,
    method: 'POST',
    url: `${API_ROOT}/users/${userId}/retweets`,
    body: { tweet_id: tweetId },
  });
}

export function tweetIdFromUrl(input) {
  if (!input) return null;
  const trimmed = input.trim();
  if (/^\d+$/.test(trimmed)) return trimmed;
  const match = trimmed.match(/status(?:es)?\/(\d+)/);
  return match ? match[1] : null;
}

// Bearer (app-only) read — used for the Quick Repost preview so a mistyped
// URL can't get quoted/reposted blind. Never used for posting.
export async function fetchTweetPreview(tweetId) {
  const { values } = loadSocialEnv();
  if (!values.X_BEARER_TOKEN) throw new Error('X_BEARER_TOKEN missing');
  const url =
    `${API_ROOT}/tweets/${tweetId}` +
    '?expansions=author_id,attachments.media_keys' +
    '&tweet.fields=created_at,public_metrics,text' +
    '&user.fields=username,name,profile_image_url' +
    '&media.fields=url,preview_image_url,type';
  const res = await fetch(url, { headers: { Authorization: `Bearer ${values.X_BEARER_TOKEN}` } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`X API GET tweet failed (${res.status}): ${JSON.stringify(data)}`);
  }
  const author = data.includes?.users?.[0] || null;
  const media = data.includes?.media || [];
  return {
    id: data.data?.id,
    text: data.data?.text,
    createdAt: data.data?.created_at,
    metrics: data.data?.public_metrics || null,
    author: author ? { username: author.username, name: author.name, profileImageUrl: author.profile_image_url } : null,
    media: media.map((m) => ({ type: m.type, url: m.url || m.preview_image_url })),
  };
}
