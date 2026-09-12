import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dockDwell } from '../public/lanternlake/dock-dwell.js';
test('Dwell fires once, rearms after leaving, and resets across tracking gaps', () => {
  const dwell=dockDwell(1);
  let count=0;
  for(let i=0;i<30;i++)if(dwell.update('sound',.1).activate)count++;
  assert.equal(count,1);
  dwell.update(null,.1);
  for(let i=0;i<12;i++)if(dwell.update('sound',.1).activate)count++;
  assert.equal(count,2);
  dwell.reset();dwell.update('lantern',.2);
  assert.equal(dwell.update('lantern',1).activate,null);
  assert.equal(dwell.update('lantern',.1).progress,.1);
  dwell.consume('lantern');assert.equal(dwell.update('lantern',.2).activate,null);
});
