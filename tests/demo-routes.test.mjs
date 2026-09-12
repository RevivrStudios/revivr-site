import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Run against the retained dev server. Verify document identity, not merely 200:
// Vite's homepage fallback also returns 200 for an unresolved demo directory.
const origin = process.env.DEMO_TEST_ORIGIN || 'http://127.0.0.1:5173';
const title = html => html.match(/<title>([\s\S]*?)<\/title>/i)?.[1];
for (const name of ['openspace', 'lookandsay', 'lanternlake', 'mriprep', 'northerncalm']) {
  const source = await readFile(new URL(`../public/${name}/index.html`, import.meta.url), 'utf8');
  assert.ok(title(source), `${name}: expected title exists`);
  for (const suffix of ['/', '/?design=retreat-1', '/index.html']) {
    const response = await fetch(`${origin}/${name}${suffix}`);
    assert.equal(response.status, 200);
    assert.equal(title(await response.text()), title(source), `${name}${suffix}: correct demo document`);
  }
  const redirect = await fetch(`${origin}/${name}?test=1`, { redirect: 'manual' });
  assert.equal(redirect.status, 308);
  assert.equal(redirect.headers.get('location'), `/${name}/?test=1`);
}
const home = await fetch(`${origin}/`);
assert.equal(title(await home.text()), title(await readFile(new URL('../index.html', import.meta.url), 'utf8')));
const moduleResponse = await fetch(`${origin}/openspace/retreat.js`);
assert.equal(moduleResponse.status, 200);
assert.match(moduleResponse.headers.get('content-type'), /javascript/);
console.log('All five demo directory routes, explicit indexes, query strings, redirects, homepage, and module route pass.');
