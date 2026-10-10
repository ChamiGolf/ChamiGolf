// ChamiGolf — rendering, sim-style controls (3-click swing meter, aim, club, spin) and game flow.
(function () {
  const COURSE = window.COURSE;
  const P = window.GolfPhysics;
  const W = COURSE.width, H = COURSE.height;
  const YARDS = 0.4;          // field units -> yards shown to the player
  const MAX_STROKES = 10;     // pick up after this many
  const TICK = 1000 / 60;

  // swing meter tuning (power values; 1.0 = full, up to 1.1 overswing)
  const METER_MAX = 1.1;
  const METER_MIN = -0.15;    // how far past the snap line the marker travels (hook zone)
  const UP_TIME = 1150;       // ms for marker to travel 0 -> METER_MAX
  const DOWN_TIME = 650;      // ms for marker to come back METER_MAX -> 0
  const SWEET = 0.012;        // within this of the snap line = perfect
  const SNAP_PCT = 12;        // css % where the snap line is

  const canvas = document.getElementById('course');
  const ctx = canvas.getContext('2d');
  const $ = (id) => document.getElementById(id);
  const clubKeys = Object.keys(P.CLUBS);

  const state = {
    holeIdx: 0,
    scores: [],
    strokes: 0,
    ball: null,
    lastPos: null,
    club: 'driver',
    aim: 0,                 // radians
    spin: { x: 0, y: 0 },   // x: -1 left .. 1 right, y: -1 top .. 1 back
    wind: { x: 0, y: 0 },
    mode: 'aim',            // aim | moving | holed | done
    meter: { phase: 'idle', v: 0, power: 0, t0: 0 }, // idle | up | down
    aimDrag: false,
    trail: [],
    bg: null,
    scale: 1,
  };

  // full-power rolling distance of each club on fairway (for the club display + aim ring)
  const flat = { fairway: [{ kind: 'rect', x: -5000, y: -5000, w: 10000, h: 10000 }], green: [], sand: [], water: [], trees: [], cup: [-1e6, -1e6] };
  const flatGreen = { ...flat, green: flat.fairway, fairway: [] };
  const CLUB_DIST = {};
  clubKeys.forEach((k) => {
    const r = P.simulate(k === 'putter' ? flatGreen : flat, [0, 0], k, 0, 1);
    CLUB_DIST[k] = Math.hypot(r.x, r.y);
  });

  // ---------------- holes ----------------
  function hole() { return COURSE.holes[state.holeIdx]; }

  function startHole(i) {
    state.holeIdx = i;
    state.strokes = 0;
    state.ball = P.newBall(...hole().tee);
    state.lastPos = hole().tee.slice();
    state.trail = [];
    state.mode = 'aim';
    const ang = Math.random() * Math.PI * 2;
    const strength = i === 0 ? Math.random() * 1.2 : Math.random() * 3;
    state.wind = { x: Math.cos(ang) * strength, y: Math.sin(ang) * strength };
    state.bg = null;
    readyForShot();
    hideOverlay();
    toast(`Hole ${i + 1}: ${hole().name} · Par ${hole().par}`);
  }

  function newRound() {
    state.scores = [];
    startHole(0);
  }

  function readyForShot() {
    state.mode = 'aim';
    setClub(suggestClub());
    aimAtPin();
    setSpin(0, 0);
    resetMeter();
    updateHud();
  }

  // ---------------- club ----------------
  function setClub(k) {
    state.club = k;
    $('club-name').textContent = P.CLUBS[k].label;
    $('club-yds').textContent = Math.round(CLUB_DIST[k] * YARDS);
    $('spin-ball').style.opacity = k === 'putter' ? 0.4 : 1;
  }
  function cycleClub(dir) {
    if (state.meter.phase !== 'idle') return;
    const i = clubKeys.indexOf(state.club);
    setClub(clubKeys[(i + dir + clubKeys.length) % clubKeys.length]);
  }
  function suggestClub() {
    const b = state.ball, h = hole();
    const surf = P.surfaceAt(h, b.x, b.y);
    const d = Math.hypot(h.cup[0] - b.x, h.cup[1] - b.y);
    if (surf === 'green') return 'putter';
    if (d < CLUB_DIST.wedge * 0.95 || surf === 'sand') return 'wedge';
    if (d < CLUB_DIST.iron * 0.95) return 'iron';
    return 'driver';
  }

  // ---------------- aim ----------------
  function aimAtPin() {
    const b = state.ball, h = hole();
    state.aim = Math.atan2(h.cup[1] - b.y, h.cup[0] - b.x);
  }
  function toField(e) {
    const r = canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
  }
  function aimAt(p) {
    const b = state.ball;
    if (Math.hypot(p.x - b.x, p.y - b.y) < 4) return;
    state.aim = Math.atan2(p.y - b.y, p.x - b.x);
  }
  canvas.addEventListener('pointerdown', (e) => {
    if (state.mode !== 'aim' || state.meter.phase !== 'idle') return;
    state.aimDrag = true;
    aimAt(toField(e));
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => { if (state.aimDrag) aimAt(toField(e)); });
  const endAim = () => { state.aimDrag = false; };
  canvas.addEventListener('pointerup', endAim);
  canvas.addEventListener('pointercancel', endAim);

  // ---------------- spin ----------------
  function setSpin(x, y) {
    const d = Math.hypot(x, y);
    if (d > 1) { x /= d; y /= d; }
    state.spin = { x, y };
    $('spin-dot').style.left = `${50 + x * 38}%`;
    $('spin-dot').style.top = `${50 + y * 38}%`;
    const parts = [];
    if (y < -0.2) parts.push('Topspin'); else if (y > 0.2) parts.push('Backspin');
    if (x < -0.2) parts.push('Draw'); else if (x > 0.2) parts.push('Fade');
    $('spin-text').textContent = parts.join(' + ') || 'None';
  }
  $('spin-ball').addEventListener('pointerdown', (e) => {
    if (state.club === 'putter' || state.meter.phase !== 'idle') return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width - 0.5) / 0.38;
    const y = ((e.clientY - r.top) / r.height - 0.5) / 0.38;
    if (Math.hypot(x, y) < 0.18) setSpin(0, 0); else setSpin(x, y);
  });

  // ---------------- 3-click swing meter ----------------
  function resetMeter() {
    state.meter = { phase: 'idle', v: 0, power: 0, t0: 0 };
    $('meter-power-mark').classList.add('hidden');
    $('power-read').textContent = '';
    $('swing-btn').textContent = 'SWING';
    $('swing-btn').disabled = state.mode !== 'aim';
    drawMeter();
  }

  function meterClick() {
    if (state.mode !== 'aim') return;
    const m = state.meter;
    const now = performance.now();
    if (m.phase === 'idle') {
      m.phase = 'up'; m.t0 = now; m.v = 0;
      $('swing-btn').textContent = 'POWER';
    } else if (m.phase === 'up') {
      setPower(m.v, now);
    } else if (m.phase === 'down') {
      strike(m.v);
    }
  }

  function setPower(v, now) {
    const m = state.meter;
    m.power = Math.max(0.02, v);
    m.phase = 'down'; m.t0 = now; m.from = m.power;
    const mark = $('meter-power-mark');
    mark.style.left = `${valToPct(m.power)}%`;
    mark.classList.remove('hidden');
    $('power-read').textContent = `${Math.round(m.power * 100)}%`;
    $('swing-btn').textContent = 'SNAP';
  }

  function updateMeter(now) {
    const m = state.meter;
    if (m.phase === 'up') {
      m.v = ((now - m.t0) / UP_TIME) * 1.0;
      if (m.v >= METER_MAX) { m.v = METER_MAX; setPower(METER_MAX, now); }
    } else if (m.phase === 'down') {
      // overswing makes the return faster and harder to hit
      const speed = (1.0 / DOWN_TIME) * (m.power > 1 ? 1.5 : 1);
      m.v = m.from - (now - m.t0) * speed;
      if (m.v <= METER_MIN) { m.v = METER_MIN; strike(METER_MIN); }
    }
    if (m.phase !== 'idle') drawMeter();
  }

  function valToPct(v) {
    if (v >= 0) return SNAP_PCT + (v / METER_MAX) * (100 - SNAP_PCT);
    return SNAP_PCT + (v / -METER_MIN) * SNAP_PCT * 0.95;
  }

  function drawMeter() {
    const m = state.meter;
    const pct = valToPct(m.v);
    $('meter-marker').style.left = `${pct}%`;
    const fillTo = m.phase === 'down' ? valToPct(m.power) : pct;
    $('meter-fill').style.width = `${Math.max(0, fillTo - SNAP_PCT)}%`;
  }

  function strike(v) {
    const m = state.meter;
    const isPutt = state.club === 'putter';
    // early (marker still right of the line) -> push/slice right, late -> pull/hook left
    let err = Math.abs(v) <= SWEET ? 0 : Math.max(-1, Math.min(1, v / 0.12));
    if (m.power > 1) err *= 1.4; // overswing exaggerates misses
    err = Math.max(-1, Math.min(1, err));
    const label = err === 0 ? 'Perfect strike!' : Math.abs(err) < 0.25 ? 'Good contact'
      : err > 0 ? (isPutt ? 'Pushed it right' : 'Sliced right!') : (isPutt ? 'Pulled it left' : 'Hooked left!');
    m.phase = 'idle';
    $('swing-btn').disabled = true;
    swing(m.power, err);
    toast(`${label} · ${Math.round(m.power * 100)}% power`);
  }

  $('swing-btn').addEventListener('click', meterClick);
  $('meter').addEventListener('pointerdown', (e) => { e.preventDefault(); meterClick(); });
  $('club-prev').onclick = () => cycleClub(-1);
  $('club-next').onclick = () => cycleClub(1);

  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    if (e.code === 'Space' || e.key === 'Enter') {
      if (!$('overlay').classList.contains('hidden')) { const b = $('overlay').querySelector('button'); if (b) b.click(); e.preventDefault(); return; }
      e.preventDefault(); if (!e.repeat) meterClick(); return;
    }
    if (state.mode !== 'aim' || state.meter.phase !== 'idle') return;
    const step = e.shiftKey ? 0.004 : 0.03;
    if (e.key === 'ArrowLeft') { state.aim -= step; e.preventDefault(); }
    if (e.key === 'ArrowRight') { state.aim += step; e.preventDefault(); }
    if (e.key === 'ArrowUp') { cycleClub(-1); e.preventDefault(); }
    if (e.key === 'ArrowDown') { cycleClub(1); e.preventDefault(); }
    if (e.key === 'r' || e.key === 'R') aimAtPin();
    const n = Number(e.key);
    if (n >= 1 && n <= clubKeys.length) setClub(clubKeys[n - 1]);
  });

  // ---------------- game flow ----------------
  function swing(power, err) {
    const b = state.ball;
    state.lastPos = [b.x, b.y];
    state.strokes++;
    state.trail = [];
    P.launch(b, state.club, state.aim, power, P.surfaceAt(hole(), b.x, b.y), { error: err, spin: state.spin });
    state.mode = 'moving';
    updateHud();
  }

  function handleEvent(ev) {
    if (!ev || ev === 'landed') return;
    if (ev === 'tree') { toast('Thwack! Off the tree.'); return; }
    if (ev === 'water' || ev === 'out') {
      state.strokes++;
      toast(ev === 'water' ? '💦 Splash! +1 penalty stroke' : '🚫 Out of bounds! +1 penalty stroke');
      state.ball = P.newBall(...state.lastPos);
      return afterStop();
    }
    if (ev === 'sunk') return holeOut();
    if (ev === 'stopped') return afterStop();
  }

  function afterStop() {
    if (state.strokes >= MAX_STROKES) {
      toast('Picking up — max strokes reached.');
      return holeOut(true);
    }
    readyForShot();
  }

  function scoreName(strokes, par) {
    if (strokes === 1) return 'Hole in one!';
    const d = strokes - par;
    return { '-3': 'Albatross!', '-2': 'Eagle!', '-1': 'Birdie!', 0: 'Par', 1: 'Bogey', 2: 'Double bogey', 3: 'Triple bogey' }[d] || `+${d}`;
  }

  function holeOut(pickedUp) {
    state.mode = 'holed';
    state.scores[state.holeIdx] = state.strokes;
    $('swing-btn').disabled = true;
    updateHud();
    const last = state.holeIdx === COURSE.holes.length - 1;
    const name = pickedUp ? 'Picked up' : scoreName(state.strokes, hole().par);
    setTimeout(() => {
      showOverlay(`
        <h2>${name}</h2>
        <p>Hole ${state.holeIdx + 1} · ${state.strokes} stroke${state.strokes === 1 ? '' : 's'} on a par ${hole().par}</p>
        <button class="btn" id="next-btn">${last ? 'See final score' : 'Next hole →'}</button>`);
      $('next-btn').onclick = () => (last ? finishRound() : startHole(state.holeIdx + 1));
      $('next-btn').focus();
    }, 650);
  }

  function finishRound() {
    state.mode = 'done';
    const total = state.scores.reduce((a, b) => a + b, 0);
    const par = COURSE.holes.reduce((a, h) => a + h.par, 0);
    let best = null;
    try {
      best = Number(localStorage.getItem('chamigolf-best')) || null;
      if (!best || total < best) localStorage.setItem('chamigolf-best', total);
    } catch (e) { /* storage unavailable */ }
    const isBest = !best || total < best;
    showOverlay(`
      <h2>Round complete</h2>
      <div class="big">${total}</div>
      <p>${fmtToPar(total - par)} on a par ${par} course${isBest ? ' · 🏆 New personal best!' : ` · Best: ${best}`}</p>
      <button class="btn" id="again-btn">Play again</button>`);
    $('again-btn').onclick = newRound;
  }

  // ---------------- HUD ----------------
  function fmtToPar(d) { return d === 0 ? 'E' : d > 0 ? `+${d}` : `${d}`; }
  const SURF_NAME = { green: 'Green', fairway: 'Fairway', rough: 'Rough', sand: 'Bunker', water: 'Water', out: 'OB' };

  function updateHud() {
    const h = hole(), b = state.ball;
    $('hole-num').textContent = state.holeIdx + 1;
    $('hole-name').textContent = h.name;
    $('par').textContent = h.par;
    $('to-pin').textContent = Math.round(Math.hypot(h.cup[0] - b.x, h.cup[1] - b.y) * YARDS);
    $('stroke-num').textContent = Math.min(state.strokes + 1, MAX_STROKES);
    $('lie').textContent = SURF_NAME[P.surfaceAt(h, b.x, b.y)] || '—';
    let toPar = 0;
    state.scores.forEach((s, i) => { if (s) toPar += s - COURSE.holes[i].par; });
    $('total').textContent = fmtToPar(toPar);
    $('wind-speed').textContent = Math.round(Math.hypot(state.wind.x, state.wind.y) * 5);
    $('wind-arrow').style.transform = `rotate(${Math.atan2(state.wind.y, state.wind.x)}rad)`;
    $('swing-btn').disabled = state.mode !== 'aim';
    renderScorecard();
  }

  function renderScorecard() {
    const holes = COURSE.holes;
    const cls = (i) => (i === state.holeIdx && state.mode !== 'done' ? ' class="cur"' : '');
    const totalPar = holes.reduce((a, h) => a + h.par, 0);
    const played = state.scores.filter(Boolean);
    const scoreCell = (s, i) => {
      if (!s) return `<td${cls(i)}>${i === state.holeIdx && state.strokes ? `<span style="opacity:.5">${state.strokes}</span>` : ''}</td>`;
      const d = s - holes[i].par;
      return `<td${cls(i)}><span class="${d < 0 ? 'under' : d > 0 ? 'over' : ''}">${s}</span></td>`;
    };
    $('scorecard').innerHTML = `
      <tr><td>Hole</td>${holes.map((_, i) => `<td${cls(i)}><b>${i + 1}</b></td>`).join('')}<td><b>Tot</b></td></tr>
      <tr><td>Par</td>${holes.map((h, i) => `<td${cls(i)}>${h.par}</td>`).join('')}<td>${totalPar}</td></tr>
      <tr><td>Score</td>${holes.map((h, i) => scoreCell(state.scores[i], i)).join('')}<td><b>${played.length ? played.reduce((a, b) => a + b, 0) : ''}</b></td></tr>`;
  }

  let toastTimer = null;
  function toast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.remove('hidden');
    t.style.animation = 'none'; void t.offsetWidth; t.style.animation = '';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.add('hidden'), 2200);
  }
  function showOverlay(html) { const o = $('overlay'); o.innerHTML = `<div class="dialog">${html}</div>`; o.classList.remove('hidden'); }
  function hideOverlay() { $('overlay').classList.add('hidden'); }

  // aim line + target ring at the club's full distance
  function drawAim(time) {
    if (state.mode !== 'aim') return;
    const b = state.ball;
    const swingPower = state.meter.phase === 'idle' ? 1 : Math.max(0.05, state.meter.phase === 'up' ? state.meter.v : state.meter.power);
    const dist = CLUB_DIST[state.club] * Math.min(swingPower, 1.1);
    const tx = b.x + Math.cos(state.aim) * dist, ty = b.y + Math.sin(state.aim) * dist;
    ctx.save();
    ctx.setLineDash([3, 9]); ctx.lineCap = 'round'; ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(255,255,255,.75)';
    ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(tx, ty); ctx.stroke();
    ctx.setLineDash([]);
    const pulse = 1 + Math.sin(time / 220) * 0.08;
    const ringR = (state.club === 'putter' ? 8 : 16) * pulse;
    ctx.strokeStyle = '#f2c94c'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(tx, ty, ringR, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(tx - ringR - 5, ty); ctx.lineTo(tx - ringR + 5, ty); ctx.moveTo(tx + ringR - 5, ty); ctx.lineTo(tx + ringR + 5, ty);
    ctx.moveTo(tx, ty - ringR - 5); ctx.lineTo(tx, ty - ringR + 5); ctx.moveTo(tx, ty + ringR - 5); ctx.lineTo(tx, ty + ringR + 5); ctx.stroke();
    ctx.fillStyle = 'rgba(8,18,12,.75)';
    const label = `${Math.round(dist * YARDS)} yds`;
    ctx.font = 'bold 12px system-ui';
    const tw = ctx.measureText(label).width + 10;
    const lx = Math.min(Math.max(tx - tw / 2, 4), W - tw - 4), ly = ty + ringR + 8 > H - 22 ? ty - ringR - 26 : ty + ringR + 8;
    ctx.fillRect(lx, ly, tw, 18);
    ctx.fillStyle = '#fff'; ctx.fillText(label, lx + 5, ly + 13);
    ctx.restore();
  }

  // ---------------- drawing ----------------
  function resize() {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.width * (H / W) * dpr);
    state.scale = canvas.width / W;
    state.bg = null;
  }
  window.addEventListener('resize', resize);

  function shapePath(c, s) {
    c.beginPath();
    if (s.kind === 'circle') c.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    else if (s.kind === 'ellipse') c.ellipse(s.x, s.y, s.rx, s.ry, 0, 0, Math.PI * 2);
    else if (c.roundRect) c.roundRect(s.x, s.y, s.w, s.h, Math.min(s.r || 0, s.w / 2, s.h / 2));
    else c.rect(s.x, s.y, s.w, s.h);
  }

  // Seeded random so textures don't flicker between redraws
  function rng(seed) { return () => ((seed = (seed * 16807) % 2147483647) / 2147483647); }

  function fillShapes(c, shapes, color, stripe, outline) {
    for (const s of shapes) {
      shapePath(c, s);
      c.fillStyle = color; c.fill();
      if (outline) { c.lineWidth = 3; c.strokeStyle = outline; c.stroke(); }
    }
    if (stripe) {
      c.save();
      c.beginPath();
      for (const s of shapes) {
        if (s.kind === 'circle') { c.moveTo(s.x + s.r, s.y); c.arc(s.x, s.y, s.r, 0, Math.PI * 2); }
        else if (s.kind === 'ellipse') { c.moveTo(s.x + s.rx, s.y); c.ellipse(s.x, s.y, s.rx, s.ry, 0, 0, Math.PI * 2); }
        else if (c.roundRect) c.roundRect(s.x, s.y, s.w, s.h, Math.min(s.r || 0, s.w / 2, s.h / 2));
        else c.rect(s.x, s.y, s.w, s.h);
      }
      c.clip();
      c.fillStyle = stripe.color;
      for (let x = -H; x < W + H; x += stripe.width * 2) {
        c.beginPath();
        c.moveTo(x, 0); c.lineTo(x + stripe.width, 0); c.lineTo(x + stripe.width + H * 0.4, H); c.lineTo(x + H * 0.4, H);
        c.fill();
      }
      c.restore();
    }
  }

  function renderBackground() {
    const off = document.createElement('canvas');
    off.width = canvas.width; off.height = canvas.height;
    const c = off.getContext('2d');
    c.scale(state.scale, state.scale);
    const h = hole();
    const r = rng(state.holeIdx * 977 + 13);

    // rough
    c.fillStyle = '#3e7a37'; c.fillRect(0, 0, W, H);
    c.fillStyle = 'rgba(20, 60, 20, .25)';
    for (let i = 0; i < 1600; i++) c.fillRect(r() * W, r() * H, 2, 2);

    // water
    for (const s of h.water) {
      shapePath(c, s); c.fillStyle = '#2f7fc4'; c.fill();
      c.lineWidth = 4; c.strokeStyle = '#7a6a3d'; c.stroke();
    }
    c.save();
    c.beginPath(); h.water.forEach((s) => { shapePath(c, s); c.save(); c.clip(); c.strokeStyle = 'rgba(255,255,255,.25)'; c.lineWidth = 2;
      for (let i = 0; i < 70; i++) { const x = r() * W, y = r() * H; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 8, y - 4, x + 16, y); c.stroke(); }
      c.restore(); });
    c.restore();

    fillShapes(c, h.fairway, '#68b94b', { color: 'rgba(255,255,255,.07)', width: 28 });
    fillShapes(c, h.green, '#8fdb6c', { color: 'rgba(255,255,255,.08)', width: 12 }, '#5aa846');

    // sand
    for (const s of h.sand) {
      shapePath(c, s); c.fillStyle = '#ecdaa2'; c.fill();
      c.lineWidth = 2.5; c.strokeStyle = '#c8b277'; c.stroke();
    }
    c.fillStyle = 'rgba(150,120,60,.3)';
    for (const s of h.sand) for (let i = 0; i < 40; i++) {
      const a = r() * Math.PI * 2, d = Math.sqrt(r()) * (s.r || 30) * 0.9;
      c.fillRect(s.x + Math.cos(a) * d, s.y + Math.sin(a) * d, 1.5, 1.5);
    }

    // tee box
    c.fillStyle = '#fff';
    c.beginPath(); c.arc(h.tee[0] - 10, h.tee[1] - 14, 3, 0, Math.PI * 2); c.arc(h.tee[0] + 10, h.tee[1] - 14, 3, 0, Math.PI * 2); c.fill();

    // cup
    c.fillStyle = '#10200f'; c.beginPath(); c.arc(h.cup[0], h.cup[1], P.CUP_R - 1, 0, Math.PI * 2); c.fill();
    c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 1.2; c.stroke();

    // trees (shadow, canopy, highlight)
    for (const t of h.trees) {
      c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(t.x + 8, t.y + 8, t.r, t.r * 0.85, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#1f5226'; c.beginPath(); c.arc(t.x, t.y, t.r, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#2d6e33'; c.beginPath(); c.arc(t.x - t.r * 0.25, t.y - t.r * 0.25, t.r * 0.6, 0, Math.PI * 2); c.fill();
      c.fillStyle = 'rgba(255,255,255,.08)'; c.beginPath(); c.arc(t.x - t.r * 0.35, t.y - t.r * 0.4, t.r * 0.3, 0, Math.PI * 2); c.fill();
    }

    // out-of-bounds stakes
    c.setLineDash([6, 10]); c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 3; c.strokeRect(2, 2, W - 4, H - 4); c.setLineDash([]);
    state.bg = off;
  }

  function draw(time) {
    if (!state.bg) renderBackground();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(state.bg, 0, 0);
    ctx.setTransform(state.scale, 0, 0, state.scale, 0, 0);
    const h = hole(), b = state.ball;

    // trail
    if (state.trail.length > 1) {
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2; ctx.beginPath();
      state.trail.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1] - p[2]) : ctx.moveTo(p[0], p[1] - p[2])));
      ctx.stroke();
    }

    // flag (waves with the wind)
    drawFlag(h.cup, time);

    drawAim(time);

    // ball + shadow
    if (state.mode !== 'holed') {
      const lift = b.h || 0;
      ctx.fillStyle = 'rgba(0,0,0,.3)';
      ctx.beginPath(); ctx.ellipse(b.x + lift * 0.3, b.y + 1 + lift * 0.15, P.BALL_R, P.BALL_R * 0.6, 0, 0, Math.PI * 2); ctx.fill();
      const r = P.BALL_R * (1 + lift / 50);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(b.x, b.y - lift, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 0.8; ctx.stroke();
    }
  }

  function drawFlag(cup, time) {
    const [x, y] = cup;
    const top = y - 46;
    ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 14, y + 6); ctx.stroke();  // pole shadow
    ctx.strokeStyle = '#f4f4f4'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, top); ctx.stroke();
    const dir = state.wind.x >= 0 ? 1 : -1;
    const wave = Math.sin(time / 180) * 2;
    ctx.fillStyle = '#e63946';
    ctx.beginPath(); ctx.moveTo(x, top); ctx.quadraticCurveTo(x + dir * 10, top + 3 + wave, x + dir * 20, top + 7); ctx.lineTo(x, top + 14); ctx.closePath(); ctx.fill();
  }

  // ---------------- loop ----------------
  let last = performance.now(), acc = 0;
  function frame(now) {
    acc += Math.min(now - last, 100);
    last = now;
    updateMeter(now);
    while (acc >= TICK) {
      acc -= TICK;
      if (state.mode === 'moving') {
        const ev = P.step(state.ball, hole(), state.wind);
        const b = state.ball;
        if (b.moving) {
          state.trail.push([b.x, b.y, b.h || 0]);
          if (state.trail.length > 40) state.trail.shift();
        }
        handleEvent(ev);
        if (state.mode === 'moving' && !state.ball.moving) afterStop();
      }
    }
    draw(now);
    requestAnimationFrame(frame);
  }

  // ---------------- boot ----------------
  resize();
  newRound();
  requestAnimationFrame(frame);
})();
