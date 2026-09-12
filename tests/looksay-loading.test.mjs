import fs from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';

test('Look & Say reveals only the completed room and gates VR entry', () => {
  const html = fs.readFileSync('public/lookandsay/index.html', 'utf8');
  const load = html.slice(html.indexOf("import('three/addons/loaders/GLTFLoader.js')"), html.indexOf('/* ── Motion'));
  const reveal = load.indexOf('scene.add(room)');
  for (const step of ['await finishRoom(room)', 'await refineBedroom(room)', 'await addWindowGarden(room,staging)']) {
    assert(load.indexOf(step) >= 0 && load.indexOf(step) < reveal, `${step} precedes reveal`);
  }
  assert(load.indexOf('roomReady = true') > reveal);
  assert(load.includes('.catch(roomLoadFailed)'));
  assert(html.includes('button.disabled = !roomReady'));
  assert(html.includes('if (!roomReady) return;'));
  for (const file of ['bedroom-refinement.js', 'room-props.js', 'window-garden.js']) {
    const source = fs.readFileSync(`public/lookandsay/${file}`, 'utf8');
    assert(!source.includes('catch('), `${file} must propagate missing required assets`);
  }
});
