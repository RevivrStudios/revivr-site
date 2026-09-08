import assert from 'node:assert/strict';
import fs from 'node:fs';

// Run actual summary code against a minimal DOM, without a browser or WebGL.
const html = fs.readFileSync(new URL('../public/openspace/index.html', import.meta.url), 'utf8');
const LEVELS = new Function(`return ${html.match(/const LEVELS = (\[[\s\S]*?\n\]);/)[1]}`)();
assert.equal(LEVELS.length, 6);
assert.equal(LEVELS[4].name, 'Reflecting Terrace');
assert.equal(LEVELS[5].name, 'Open Horizon');
const node = () => ({ textContent: '', dataset: {}, children: [], append(item) { this.children.push(item); }, replaceChildren() { this.children = []; } });
const summary = node(), tbody = node();
const document = { getElementById: () => summary, querySelector: () => tbody, createElement: node };
const overlay = { classList: { add() {}, remove() {} } };
const levelStats = LEVELS.map((_, i) => ({ milliseconds: i < 5 ? (i+1)*10000 : 0, visits: i < 5 ? 1 : 0 }));
const sessionLog = [{levelId:0, distress:2}, {levelId:0, distress:3}];
const duration = ms => `${Math.floor(ms/60000)}m ${Math.floor(ms/1000)%60}s`;
const source = html.slice(html.indexOf('function showEnd()'), html.indexOf('function showVrSummary('));
let accounted = 0;
new Function('document','LEVELS','levelStats','sessionLog','duration','checkinOverlay','endOverlay','renderer','accountTime','hideVrUI',
  `let sessionEnded=false, awaitingCheckin=false; ${source}; showEnd(); showEnd(); return sessionEnded;`
)(document, LEVELS, levelStats, sessionLog, duration, overlay, overlay, {xr:{isPresenting:false}}, () => accounted++, () => {});
assert.equal(accounted, 2);
assert.equal(tbody.children.length, 6, 'Reopening summary replaces rows rather than duplicating them');
assert(summary.textContent.includes('2m 30s'));
assert(summary.textContent.includes('5 of 6'));
assert.equal(tbody.children[0].children[3].textContent, '2/5, 3/5');
assert.equal(tbody.children[5].children[1].textContent, 'Not visited');
assert.equal(tbody.children[4].children[1].dataset.label, 'Active time');

// Exercise actual timing guard with controlled clock and each pause condition.
const timingSource = html.slice(html.indexOf('function accountTime()'), html.indexOf("document.addEventListener('visibilitychange'"));
const elapsed = new Function(`${timingSource}
  let clock=0, timingAt=0, currentLevelIndex=0;
  const performance={now:()=>clock}, document={hidden:false};
  let sessionStarted=true, sessionEnded=false, awaitingCheckin=false, levelLoading=false;
  const levelStats=[{milliseconds:0}];
  clock=1000; accountTime();
  awaitingCheckin=true; clock=5000; accountTime();
  awaitingCheckin=false; levelLoading=true; clock=9000; accountTime();
  levelLoading=false; document.hidden=true; clock=12000; accountTime();
  document.hidden=false; clock=14000; accountTime();
  sessionEnded=true; clock=20000; accountTime();
  return levelStats[0].milliseconds;
`)();
assert.equal(elapsed, 3000, 'Menus, loading, hidden time, and completed session are excluded');
console.log('PASS: six-stage summary, optional/unvisited spaces, check-ins, responsive labels, timing exclusions');
