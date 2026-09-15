import assert from 'node:assert/strict';
import {ActivityCycle,activitySpecs,feedingPoint,visitWeight} from '../public/openspace/activity-state.js';
for(let level=0;level<6;level++){
 const cycle=new ActivityCycle(level);assert(cycle.ready);assert(cycle.start());assert(!cycle.start());assert.equal(cycle.runs,1);
 for(let i=0;i<50;i++)cycle.tick(.1,true);assert.equal(cycle.age,0,'menus and inactive sessions pause the activity');
 cycle.tick(Infinity);cycle.tick(20);cycle.tick(-1);assert.equal(cycle.age,0,'background gaps never complete the activity');
 let finished=0;for(let i=0;i<activitySpecs[level].duration*100+2;i++)if(cycle.tick(.01))finished++;
 assert.equal(finished,1);assert.equal(cycle.age,null);assert(!cycle.ready);assert(!cycle.start());
 for(let i=0;i<401;i++)cycle.tick(.01);assert(cycle.ready);assert(cycle.start());assert.equal(cycle.runs,2);
}
for(let run=0;run<10;run++)for(let i=0;i<18;i++){const p=feedingPoint(i,run);assert(Math.hypot(p.x-5.2,p.z+39)<2.9,'food and feeding koi stay within the circular pond');assert.equal(p.y,.304);}
assert.equal(visitWeight(0),0);assert.equal(visitWeight(7),1);assert.equal(visitWeight(18),1);assert.equal(visitWeight(24),0);
assert(visitWeight(23.9)<.001,'departures blend back into the ambient path without a snap');
console.log('PASS: all six optional timelines, pause/frame-gap handling, repeat cooldown, bounded feeding positions, smooth arrivals/departures');
