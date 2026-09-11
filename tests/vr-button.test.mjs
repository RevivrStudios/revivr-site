import fs from 'node:fs';
import assert from 'node:assert/strict';
for (const name of ['openspace', 'lookandsay', 'lanternlake', 'mriprep']) {
  const html = fs.readFileSync(`public/${name}/index.html`, 'utf8');
  assert(html.includes('href="/xr-shared/vr-button.css"'), `${name}: shared styling`);
  assert(html.includes('revivr-vr-button'), `${name}: shared class`);
  assert(html.includes('Enter VR') && html.includes('Exit VR'), `${name}: consistent labels`);
  assert(!/#vr[Bb]tn\s*\{/.test(html), `${name}: no competing per-page styles`);
  assert(!html.includes('VRButton.createButton'), `${name}: no inline helper styles`);
}
const css = fs.readFileSync('public/xr-shared/vr-button.css', 'utf8');
assert(css.includes('min-height: 48px'));
assert(css.includes(':focus-visible'));
assert(css.includes('env(safe-area-inset-bottom'));
console.log('PASS: all four experiences use the shared VR button appearance and labels');
