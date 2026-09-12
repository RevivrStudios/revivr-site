import fs from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';

for (const experience of ['openspace', 'lookandsay', 'lanternlake', 'mriprep']) {
  test(`${experience} leaves real-hand rendering to Safari and retains natural selection`, () => {
    const html = fs.readFileSync(`public/${experience}/index.html`, 'utf8');
    const requests = [...html.matchAll(/navigator\.xr\.requestSession\('immersive-vr',\s*\{([\s\S]*?)\}\)/g)];
    assert.equal(requests.length, 1, 'Check every session request');
    for (const [, options] of requests) {
      assert(!/['"]hand-tracking['"]/.test(options), 'Full joint tracking suppresses system hand rendering');
      assert(options.includes('local-floor'));
    }
    assert(html.includes("addEventListener('select',"), 'Keep native look-and-pinch selection');
  });
}
