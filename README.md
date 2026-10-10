# ⛳ ChamiGolf

A 9-hole golf game with classic sim-style controls that runs in any browser. No install, no build step.

**Play it:** open `index.html`, or turn on GitHub Pages (Settings → Pages → Deploy from a branch → `main` / root) and play at `https://<your-username>.github.io/ChamiGolf/`.

## Controls

| Action | Mouse / touch | Keyboard |
|---|---|---|
| Aim | Click or drag on the course | ← → (hold Shift for fine aim), R to re-aim at the pin |
| Pick club | ◀ ▶ arrows | ↑ ↓ or 1–4 |
| Spin | Click a spot on the ball | — |
| Swing | SWING button or the meter | Space |

### The 3-click swing

1. **Click 1** starts the backswing. The marker runs up the meter.
2. **Click 2** sets your power. Past 100% is overswing: more distance, but harder to control.
3. **Click 3** sets accuracy. The marker swings back, so click when it hits the **white line**.
   - Too early: the ball slices/pushes **right**.
   - Too late: it hooks/pulls **left**.

### Spin
- Top of the ball: **topspin**, more roll.
- Bottom: **backspin**, the ball stops quicker on the green.
- Left/right: **draw/fade**, curves in the air.

### Course
- Wind pushes the ball in flight (compass, top right).
- Rough and bunkers cost distance.
- Water and out of bounds add a 1-stroke penalty.
- Trees block low shots.
- Max 10 strokes per hole. Your best round is saved in your browser.

## Files

```
index.html        page layout + HUD
style.css         styles
courses.js        the 9 hole layouts (1000×600 field each)
physics.js        ball flight, spin, roll, surfaces, cup (no DOM)
main.js           drawing, swing meter, aiming, scoring
playable-test.js  `node playable-test.js` checks every hole can be finished
```

## Add your own hole

Add an entry to `HOLES` in `courses.js`. `R` is a rounded rect (x, y, w, h, radius), `C` is a circle (x, y, r) and `E` is an ellipse (x, y, rx, ry):

```js
{
  name: 'My Hole', par: 4,
  tee: [100, 300], cup: [880, 300],
  fairway: [R(60, 250, 700, 100, 50)],
  green:   [C(870, 300, 70)],
  sand:    [C(780, 380, 30)],
  water:   [E(450, 450, 120, 60)],
  trees:   [C(400, 180, 24)],
}
```

## License

MIT
