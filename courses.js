// Course layout. Every hole sits on a 1000 x 600 field.
// Shapes: rect {x,y,w,h,r}  circle {x,y,r}  ellipse {x,y,rx,ry}
// Surface priority when shapes overlap: green > sand > fairway > water > rough.
(function (root) {
  const R = (x, y, w, h, r = 0) => ({ kind: 'rect', x, y, w, h, r });
  const C = (x, y, r) => ({ kind: 'circle', x, y, r });
  const E = (x, y, rx, ry) => ({ kind: 'ellipse', x, y, rx, ry });

  const HOLES = [
    {
      name: 'Opening Drive', par: 3,
      tee: [200, 300], cup: [840, 290],
      fairway: [R(180, 250, 560, 100, 50)],
      green: [C(820, 300, 70)],
      sand: [C(760, 395, 38)],
      water: [], trees: [C(500, 170, 24), C(560, 440, 22)],
    },
    {
      name: 'The Dogleg', par: 4,
      tee: [100, 500], cup: [840, 115],
      fairway: [R(50, 445, 520, 110, 55), R(470, 70, 130, 480, 60), R(470, 70, 330, 110, 55)],
      green: [C(830, 120, 70)],
      sand: [C(735, 205, 34)],
      water: [E(290, 260, 150, 85)],
      trees: [C(660, 330, 26), C(720, 420, 22), C(160, 330, 24)],
    },
    {
      name: 'Carry the Pond', par: 3,
      tee: [130, 300], cup: [815, 305],
      fairway: [R(60, 245, 190, 110, 45)],
      green: [C(800, 300, 78)],
      sand: [C(735, 205, 30), C(735, 395, 30)],
      water: [R(300, 140, 390, 320, 60)],
      trees: [],
    },
    {
      name: 'Tree Lined', par: 4,
      tee: [100, 110], cup: [825, 490],
      fairway: [R(50, 60, 610, 100, 50), R(560, 60, 110, 480, 55), R(560, 440, 290, 100, 50)],
      green: [C(815, 485, 72)],
      sand: [C(890, 395, 30)],
      water: [],
      trees: [C(300, 225, 24), C(430, 262, 24), C(720, 300, 26), C(780, 240, 20), C(470, 400, 26), C(380, 480, 22)],
    },
    {
      name: 'The Long Haul', par: 5,
      tee: [80, 520], cup: [900, 100],
      fairway: [R(40, 470, 430, 100, 50), R(375, 250, 125, 320, 55), R(375, 250, 430, 100, 50), R(720, 55, 125, 295, 55)],
      green: [C(890, 100, 68)],
      sand: [C(530, 175, 38), C(805, 205, 28)],
      water: [E(620, 465, 170, 85)],
      trees: [C(260, 380, 25), C(640, 160, 22), C(160, 400, 22)],
    },
    {
      name: 'Island Green', par: 3,
      tee: [120, 300], cup: [735, 290],
      fairway: [R(55, 240, 210, 120, 50)],
      green: [C(725, 300, 72)],
      sand: [C(790, 360, 22)],
      water: [R(350, 70, 600, 460, 200)],
      trees: [C(220, 150, 24), C(220, 450, 24)],
    },
    {
      name: 'Bunker Alley', par: 4,
      tee: [100, 300], cup: [875, 300],
      fairway: [R(55, 240, 680, 120, 60)],
      green: [C(860, 300, 75)],
      sand: [C(400, 232, 44), C(400, 368, 44), C(620, 300, 34), C(765, 215, 34), C(765, 385, 34)],
      water: [],
      trees: [C(250, 150, 25), C(250, 450, 25), C(550, 140, 20), C(550, 460, 20)],
    },
    {
      name: 'River Crossing', par: 4,
      tee: [100, 110], cup: [890, 495],
      fairway: [R(50, 50, 350, 120, 60), R(570, 380, 300, 120, 60)],
      green: [C(880, 495, 65)],
      sand: [C(790, 405, 28)],
      water: [R(440, -20, 95, 640, 0)],
      trees: [C(250, 300, 30), C(700, 250, 30), C(620, 180, 24), C(330, 480, 26)],
    },
    {
      name: 'Two Roads Home', par: 5,
      tee: [80, 300], cup: [910, 300],
      fairway: [R(40, 250, 300, 100, 50), R(500, 95, 310, 100, 50), R(500, 405, 310, 100, 50)],
      green: [C(900, 300, 70)],
      sand: [C(825, 200, 30), C(825, 400, 30)],
      water: [E(420, 300, 55, 210), R(500, 215, 310, 170, 40)],
      trees: [C(200, 150, 25), C(200, 450, 25), C(650, 45, 20), C(650, 555, 20)],
    },
  ];

  root.COURSE = { name: 'Rockaway Links', holes: HOLES, width: 1000, height: 600 };
  if (typeof module !== 'undefined') module.exports = root.COURSE;
})(typeof window !== 'undefined' ? window : globalThis);
