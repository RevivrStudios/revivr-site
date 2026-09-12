import assert from 'node:assert/strict';
import {MAX_LANTERNS,lanternFlight} from '../public/lanternlake/lantern-flight.js';
assert.equal(MAX_LANTERNS,8);
const policy=lanternFlight();
assert(policy.canLaunch(7,0));assert(!policy.canLaunch(7,.5),'Cooldown');
assert(!policy.canLaunch(8,2),'Full scene rejected without replacement');
assert(!policy.canLaunch(8,2,true),'Ambient lanterns also capped');
assert(policy.canLaunch(7,2),'Burst frees a slot');
for(let cycle=0;cycle<100;cycle++){
 const flights=Array.from({length:5},()=>policy.next());
 assert.equal(flights.filter(f=>f.high).length,2);
 for(const f of flights){assert(f.rise>=(f.high?8:3.5)&&f.rise<(f.high?11:5.5));assert(f.rise/(.34*.65*.75)<75,'Reaches target before fade timeout');}
}
console.log('PASS: eight active lanterns, one-second cooldown, 40% high flights per five, reachable burst heights');
