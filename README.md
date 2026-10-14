# Red & Gold Golf

A 3D, Chaminade-themed golf game that runs in any browser. Everything is in one file, index.html, with no install and no build step.

Play it at https://chamigolf.github.io/

## How to play

- Check PIN at the top for yards to the hole, then pick a club. Tap the club name to open your bag, or use the arrow buttons.
- Swipe left or right to aim. MAP shows the whole hole, and you can tap it to aim.
- Press the ball and pull back. Pulling back 100% hits the club's full distance.
- Let go in the bright gold zone for a perfect strike.
- Rough cuts distance 15% and sand cuts it 40% (less with the Sand Wedge). Watch the wind arrow.
- Water and out of bounds cost a stroke.
- Hole payouts: hole-in-one $1,500 · albatross $1,000 · eagle $250 · birdie $100 · par $25 · bogey or worse $0. Upgrade your clubs for more yards.

## Play Friends

- Sign in, share your 6-character friend code, and add friends by theirs (or send an invite link).
- **1v1**: stroke play for a wager ($0 up to what you have), 3, 6 or 9 holes. Tied? Sudden-death playoff holes.
- **2v2**: scramble, alt shot or best ball. **Foursome**: up to 4 golfers, everyone plays their own ball (lowest total wins the pot), or all four play one team scramble against par.
- Everyone gets the same wind. Winners split the pot. Quitting a match forfeits it for your team.
- Needs the rules in `firestore.rules` published in the Firebase console.

## License

MIT
