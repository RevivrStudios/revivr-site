import { loadSocialEnv, hasSocialToken } from './_env';

// LinkedIn posting via the long-stable v2 ugcPosts API (member profile posts,
// w_member_social scope). Tokens come from ~/.revivr/social.env, written by
// linkedin-oauth-setup.js (one-time browser consent):
//   LINKEDIN_ACCESS_TOKEN  — 60-day member token
//   LINKEDIN_PERSON_URN    — urn:li:person:<sub from /v2/userinfo>
//   LINKEDIN_TOKEN_EXPIRES — ISO date, for the drainer's expiry warning
//
// Same graceful-degradation contract as _x.js: no/expired token -> the UI
// falls back to the Copy button; nothing throws at list time.

const API_ROOT = 'https://api.linkedin.com/v2';

export function linkedinReady() {
  if (!hasSocialToken('LINKEDIN_ACCESS_TOKEN', 'LINKEDIN_PERSON_URN')) return false;
  const { values } = loadSocialEnv();
  const expires = Date.parse(values.LINKEDIN_TOKEN_EXPIRES || '');
  // Treat an unparseable/absent expiry as usable; the drainer warns separately.
  return Number.isNaN(expires) ? true : Date.now() < expires;
}

export function linkedinTokenDaysLeft() {
  const { values } = loadSocialEnv();
  const expires = Date.parse(values.LINKEDIN_TOKEN_EXPIRES || '');
  return Number.isNaN(expires) ? null : (expires - Date.now()) / 86400000;
}

// Publishes a member post. text is the commentary; linkUrl (optional) becomes
// an ARTICLE share so LinkedIn renders its preview card. Returns
// { postUrn, postedUrl }.
export async function postLinkedIn({ text, linkUrl }) {
  const { values } = loadSocialEnv();
  const token = values.LINKEDIN_ACCESS_TOKEN;
  const author = values.LINKEDIN_PERSON_URN;
  if (!token || !author) throw new Error('Missing LinkedIn token/URN in ~/.revivr/social.env');

  const shareContent = {
    shareCommentary: { text },
    shareMediaCategory: linkUrl ? 'ARTICLE' : 'NONE',
  };
  if (linkUrl) shareContent.media = [{ status: 'READY', originalUrl: linkUrl }];

  const res = await fetch(`${API_ROOT}/ugcPosts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify({
      author,
      lifecycleState: 'PUBLISHED',
      specificContent: { 'com.linkedin.ugc.ShareContent': shareContent },
      visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`LinkedIn POST ugcPosts failed (${res.status}): ${body.slice(0, 300)}`);
  }
  const postUrn = res.headers.get('x-restli-id') || (await res.json().catch(() => ({}))).id || '';
  return {
    postUrn,
    postedUrl: postUrn ? `https://www.linkedin.com/feed/update/${postUrn}/` : '',
  };
}
