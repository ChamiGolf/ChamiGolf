// Ball physics and course surfaces. No DOM code, so it can be tested in Node.
(function (root) {
  const COURSE = root.COURSE || require('./courses.js');

  const BALL_R = 4;
  const CUP_R = 9;
  const TREE_HEIGHT = 0.35; // fraction of max flight height below which trees block the ball

  // max launch speed (field units per tick), airtime ticks at full power, landing speed kept, arc height
  const CLUBS = {
    driver: { label: 'Driver', speed: 12.5, air: 62, land: 0.45, arc: 34 },
    iron:   { label: 'Iron',   speed: 10.5, air: 50, land: 0.4, arc: 28 },
    wedge:  { label: 'Wedge',  speed: 7.5, air: 52, land: 0.22, arc: 30 },
    putter: { label: 'Putter', speed: 6, air: 0, land: 1, arc: 0 },
  };

  // per-tick velocity multiplier on the ground
  const FRICTION = { green: 0.982, fairway: 0.972, rough: 0.94, sand: 0.86, water: 0.9 };
  const AIR_DRAG = 0.992;

  function inShape(s, x, y) {
    if (s.kind === 'circle') return (x - s.x) ** 2 + (y - s.y) ** 2 <= s.r * s.r;
    if (s.kind === 'ellipse') return ((x - s.x) / s.rx) ** 2 + ((y - s.y) / s.ry) ** 2 <= 1;
    // rounded rect
    if (x < s.x || x > s.x + s.w || y < s.y || y > s.y + s.h) return false;
    const r = Math.min(s.r || 0, s.w / 2, s.h / 2);
    if (!r) return true;
    const cx = Math.min(Math.max(x, s.x + r), s.x + s.w - r);
    const cy = Math.min(Math.max(y, s.y + r), s.y + s.h - r);
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
  }

  function surfaceAt(hole, x, y) {
    if (x < 0 || y < 0 || x > COURSE.width || y > COURSE.height) return 'out';
    for (const key of ['green', 'sand', 'fairway', 'water']) {
      if (hole[key].some((s) => inShape(s, x, y))) return key;
    }
    return 'rough';
  }

  function newBall(x, y) {
    return { x, y, vx: 0, vy: 0, h: 0, airT: 0, airDur: 0, arc: 0, curve: 0, moving: false };
  }

  // opts.error: swing accuracy miss, -1 (hook/pull left) .. +1 (slice/push right)
  // opts.spin: { x: side spin -1..1, y: -1 topspin .. +1 backspin }
  function launch(ball, club, angle, power, surface, opts = {}) {
    const err = Math.max(-1, Math.min(1, opts.error || 0));
    const spin = opts.spin || { x: 0, y: 0 };
    const c = CLUBS[club];
    let p = Math.max(0, Math.min(1, power));
    // bad lies cost distance (putter excepted)
    if (club !== 'putter') {
      if (surface === 'rough') p *= 0.82;
      if (surface === 'sand') p *= club === 'wedge' ? 0.85 : 0.55;
    }
    const speed = c.speed * p;
    const isPutt = club === 'putter';
    angle += err * (isPutt ? 0.035 : 0.05);
    ball.vx = Math.cos(angle) * speed;
    ball.vy = Math.sin(angle) * speed;
    ball.airDur = Math.round(c.air * Math.sqrt(p));
    ball.airT = 0;
    ball.arc = c.arc * Math.sqrt(p);
    ball.land = isPutt ? 1 : c.land * Math.max(0.2, 1 - spin.y * 0.6);
    ball.curve = isPutt ? 0 : err * 0.0022 + spin.x * 0.0016; // radians per tick while airborne
    ball.h = 0;
    ball.moving = true;
  }

  // Advance one tick. Returns an event string or null:
  // 'sunk' | 'water' | 'out' | 'stopped' | 'tree' | 'landed'
  function step(ball, hole, wind) {
    if (!ball.moving) return null;
    let event = null;
    const airborne = ball.airT < ball.airDur;

    if (airborne) {
      ball.airT++;
      const t = ball.airT / ball.airDur;
      ball.h = Math.sin(Math.PI * t) * ball.arc;
      if (ball.curve) {
        const cs = Math.cos(ball.curve), sn = Math.sin(ball.curve);
        const vx = ball.vx * cs - ball.vy * sn;
        ball.vy = ball.vx * sn + ball.vy * cs;
        ball.vx = vx;
      }
      ball.vx = ball.vx * AIR_DRAG + wind.x * 0.006;
      ball.vy = ball.vy * AIR_DRAG + wind.y * 0.006;
      if (ball.airT >= ball.airDur) {
        ball.h = 0;
        const surf = surfaceAt(hole, ball.x, ball.y);
        let keep = ball.land;
        if (surf === 'sand') keep *= 0.15;
        else if (surf === 'rough') keep *= 0.55;
        else if (surf === 'green') keep *= 0.75;
        ball.vx *= keep; ball.vy *= keep;
        event = 'landed';
      }
    } else {
      const surf = surfaceAt(hole, ball.x, ball.y);
      const f = FRICTION[surf] || FRICTION.rough;
      ball.vx *= f; ball.vy *= f;

      // cup: gentle pull when close and slow, drop when slow enough
      const dx = hole.cup[0] - ball.x, dy = hole.cup[1] - ball.y;
      const d = Math.hypot(dx, dy);
      const speed = Math.hypot(ball.vx, ball.vy);
      if (d < CUP_R && speed < 2.8) { ball.x = hole.cup[0]; ball.y = hole.cup[1]; ball.moving = false; return 'sunk'; }
      if (d < CUP_R + 6 && speed < 1.6) { ball.vx += (dx / d) * 0.08; ball.vy += (dy / d) * 0.08; }
    }

    ball.x += ball.vx;
    ball.y += ball.vy;

    // trees block low balls
    if (!airborne || ball.h < ball.arc * TREE_HEIGHT) {
      for (const tr of hole.trees) {
        const dx = ball.x - tr.x, dy = ball.y - tr.y;
        const d = Math.hypot(dx, dy);
        const min = tr.r + BALL_R;
        if (d < min) {
          const nx = dx / d, ny = dy / d;
          ball.x = tr.x + nx * min; ball.y = tr.y + ny * min;
          const dot = ball.vx * nx + ball.vy * ny;
          ball.vx = (ball.vx - 2 * dot * nx) * 0.45;
          ball.vy = (ball.vy - 2 * dot * ny) * 0.45;
          if (airborne) { ball.airDur = ball.airT + 1; } // knocked down
          event = 'tree';
        }
      }
    }

    if (ball.airT >= ball.airDur) {
      const surf = surfaceAt(hole, ball.x, ball.y);
      if (surf === 'out') { ball.moving = false; return 'out'; }
      if (surf === 'water') { ball.moving = false; return 'water'; }
      if (Math.hypot(ball.vx, ball.vy) < 0.05) { ball.vx = ball.vy = 0; ball.moving = false; return 'stopped'; }
    } else if (surfaceAt(hole, ball.x, ball.y) === 'out' && ball.h < 2) {
      ball.moving = false; return 'out';
    }
    return event;
  }

  // Simulate a whole shot without drawing (used for tests and the CPU-free sanity check).
  function simulate(hole, from, club, angle, power, wind = { x: 0, y: 0 }, opts = {}) {
    const b = newBall(from[0], from[1]);
    launch(b, club, angle, power, surfaceAt(hole, from[0], from[1]), opts);
    for (let i = 0; i < 5000; i++) {
      const e = step(b, hole, wind);
      if (e && e !== 'landed' && e !== 'tree') return { event: e, x: b.x, y: b.y, ticks: i };
    }
    return { event: 'timeout', x: b.x, y: b.y };
  }

  const api = { CLUBS, BALL_R, CUP_R, surfaceAt, inShape, newBall, launch, step, simulate };
  root.GolfPhysics = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
