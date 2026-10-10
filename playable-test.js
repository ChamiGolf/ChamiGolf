// Checks every hole can be finished by a simple greedy "bot" golfer (no wind).
// Usage: node playable-test.js
const COURSE = require('./courses.js');
const P = require('./physics.js');
let ok = true;
COURSE.holes.forEach((hole, n) => {
  let pos = hole.tee.slice(), strokes = 0, sunk = false;
  while (strokes < 12 && !sunk) {
    strokes++;
    let best = null;
    for (const club of Object.keys(P.CLUBS)) {
      for (let a = 0; a < 72; a++) {
        const ang = (a / 72) * Math.PI * 2;
        for (let pw = 0.1; pw <= 1.001; pw += 0.06) {
          const r = P.simulate(hole, pos, club, ang, pw);
          if (r.event === 'sunk') { best = { r, d: -1 }; break; }
          if (r.event !== 'stopped') continue;
          const d = Math.hypot(r.x - hole.cup[0], r.y - hole.cup[1]);
          if (!best || d < best.d) best = { r, d };
        }
        if (best && best.d === -1) break;
      }
      if (best && best.d === -1) break;
    }
    if (!best) break;
    if (best.d === -1) sunk = true; else pos = [best.r.x, best.r.y];
  }
  const surf = P.surfaceAt(hole, ...hole.tee), cupSurf = P.surfaceAt(hole, ...hole.cup);
  const pass = sunk && strokes <= hole.par + 1 && surf !== 'water' && cupSurf === 'green';
  if (!pass) ok = false;
  console.log(`Hole ${n + 1} (${hole.name}, par ${hole.par}): bot ${sunk ? strokes : 'DNF'} strokes, tee on ${surf}, cup on ${cupSurf} ${pass ? 'OK' : 'FAIL'}`);
});
process.exit(ok ? 0 : 1);
