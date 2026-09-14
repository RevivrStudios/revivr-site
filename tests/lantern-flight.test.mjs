import assert from 'node:assert/strict';
import {MAX_LANTERNS,lanternFlight,playerLanternHeight} from '../public/lanternlake/lantern-flight.js';
assert.equal(MAX_LANTERNS,8);
const policy=lanternFlight();
assert(policy.canLaunch(7,0));assert(!policy.canLaunch(7,.5),'Cooldown');
assert(!policy.canLaunch(8,2),'Full scene rejected without replacement');
assert(!policy.canLaunch(8,2,true),'Ambient lanterns also capped');
assert(policy.canLaunch(7,2),'Burst frees a slot');
for(let cycle=0;cycle<100;cycle++){
 const flights=Array.from({length:5},()=>policy.next());
 assert.equal(flights.filter(f=>f.high).length,1);
 assert.equal(flights.filter(f=>f.burstTime>=10&&f.burstTime<16).length,4,'80% quick fireworks in each batch');
 for(const f of flights)assert(f.burstTime>=(f.high?20:10)&&f.burstTime<(f.high?28:16),'Bounded wait for fireworks');
 for(const f of flights){assert(f.rise>=(f.high?8:3.5)&&f.rise<(f.high?11:5.5));assert(f.rise/(.34*.65*.75)<75,'Reaches target before fade timeout');}
}
console.log('PASS: eight active lanterns, one-second cooldown, 80% quick fireworks, all bursts within 28 seconds');

for(let cycle=0;cycle<100;cycle++) {
 const flights=Array.from({length:3},()=>policy.nextPlayer());
 assert.equal(flights.filter(f=>f.rise>=10&&f.rise<14).length,1);
 assert.equal(flights.filter(f=>f.rise>=18&&f.rise<23).length,1);
 assert.equal(flights.filter(f=>f.rise>=28&&f.rise<34).length,1);
 for(const f of flights) {
  const burstHeight=.68+f.rise;
  assert(f.burstTime>=24&&f.burstTime<52);
  assert(Math.abs(playerLanternHeight(f,burstHeight,0)-.68)<1e-8);
  assert(Math.abs(playerLanternHeight(f,burstHeight,f.burstTime/2)-(.68+f.rise/2))<1e-8);
  assert.equal(playerLanternHeight(f,burstHeight,f.burstTime),burstHeight);
  assert.equal(playerLanternHeight(f,burstHeight,f.burstTime+10),burstHeight);
 }
}
console.log('PASS: player flights reach three distinct altitude bands, 10–34m, before fireworks');
