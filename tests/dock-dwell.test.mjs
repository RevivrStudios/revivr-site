import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dockDwell } from '../public/lanternlake/dock-dwell.js';
test('Dwell fires once, rearms after leaving, and resets across tracking gaps', () => {
  const dwell=dockDwell(1);
  let count=0;
  for(let i=0;i<30;i++)if(dwell.update('sound',.1).activate)count++;
  assert.equal(count,1);
  for(let i=0;i<4;i++)dwell.update(null,.1);
  for(let i=0;i<12;i++)if(dwell.update('sound',.1).activate)count++;
  assert.equal(count,2);
  dwell.reset();dwell.update('lantern',.2);
  assert.equal(dwell.update('lantern',1).activate,null);
  assert.equal(dwell.update('lantern',.1).progress,.1);
  dwell.consume('lantern');assert.equal(dwell.update('lantern',.2).activate,null);
});


test('Brief drift preserves dwell, deliberate look-away rearms, and speed is adjustable',()=>{
 const dwell=dockDwell(1);
 for(let i=0;i<6;i++)dwell.update('lantern',.1);
 dwell.update(null,.1);
 assert(dwell.update('lantern',.1).progress>.6);
 for(let i=0;i<5;i++)dwell.update('lantern',.1);
 dwell.update(null,.1);
 for(let i=0;i<20;i++)assert.equal(dwell.update('lantern',.1).activate,null,'Brief drift cannot cause a repeat');
 for(let i=0;i<4;i++)dwell.update(null,.1);
 let fired=false;for(let i=0;i<12;i++)if(dwell.update('lantern',.1).activate)fired=true;assert(fired);
 dwell.configure(2.5);for(let i=0;i<20;i++)assert.equal(dwell.update('sound',.1).activate,null);
 let next=false;for(let i=0;i<7;i++)if(dwell.update('sound',.1).activate)next=true;assert(next);
});


test('Replacing a menu under steady gaze cannot activate its new button',()=>{
 const dwell=dockDwell(1);dwell.requireLookAway();
 for(let i=0;i<40;i++)assert.equal(dwell.update('new-menu-action',.1).activate,null);
 for(let i=0;i<4;i++)dwell.update(null,.1);
 let fired=false;for(let i=0;i<12;i++)if(dwell.update('new-menu-action',.1).activate)fired=true;assert(fired);
});
