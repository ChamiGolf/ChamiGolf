# Red & Gold Golf

A 3D, Chaminade-themed golf game that runs in any browser. Everything is in one file, index.html, with no install and no build step.

Play it at https://chamigolf.github.io/

## How to play

- Check PIN at the top for yards to the hole, then pick a club. Tap the club name to open your bag, or use the arrow buttons.
- Swipe left or right to aim. MAP shows the whole hole, and you can tap it to aim.
- Press the ball and pull back. Every shot works like putting: the tag next to the ball shows your swing % (100% = the club's full distance) with a rough distance guide underneath.
- Let go in the bright gold zone for a perfect strike.
- Rough cuts distance 15% and sand cuts it 40% (less with the Sand Wedge). Watch the wind arrow.
- Water and out of bounds cost a stroke. Cart paths are concrete: the ball kicks up and skips off them.
- Left-handed? Switch hands in the Golfer tab.
- Hole payouts: hole-in-one $1,500 · albatross $1,000 · eagle $250 · birdie $100 · par $25 · bogey or worse $0.

## Courses

3C Par Three (where everyone starts) → Chami Links Crimson → Chami Links Gold → Chami Links Black, plus TPC Saragosa, Farbor Lake, Meribah Country Club, Brothers Hollow and Deans Valley (its 18th hole is Room 23), Gold Star Mini Golf and the Daily Closest to the Pin.

## Clubs and upgrades

- Each club has three upgrades (Power, Accuracy, Control), up to level 5 each. A stat can only go one level past the club's lowest stat.
- Lots of club models to buy in every slot, and club colours (buy a colour once, paint any club).

## Online

- Daily Tournaments for every course, mini golf and Closest to the Pin. No sign-in needed to post: you just need a name (anyone still called "Player" is asked for one).
- Sign in with Google to save progress to the cloud and play friends.
- Premium badges (Creator's Pick, Daily Champion, Hole in One) show next to your name on the leaderboards, and each badge tile shows how many golfers have it. Creator's Pick goes to golfers who helped make the game or had a suggestion added.
- Unlockable outfits: the Senior Sweater (within 10 feet in the Daily Closest to the Pin) and the Masters Outfit (par or better at Chami Links Black).
- Reloaded mid-round? Keep playing, finish the round early (paid for the holes you played), or quit.
- A "Hole-in-ones today" banner on the Play tab (it shows up once someone makes one; mini golf aces don't count).

## Play Friends

- Sign in, share your 6-character friend code, and add friends by theirs (or send an invite link).
- **1v1**: stroke play for a wager ($0 up to what you have), 3, 6 or 9 holes. Tied? Sudden-death playoff holes.
- **2v2**: scramble, alt shot or best ball. **Foursome**: own ball (1v1v1v1, up to 4 golfers, lowest total wins the pot) or a 2 v 2 scramble. The host sets one buy-in that every golfer pays; a pop-up confirms it when you join, and you can't join without enough money.
- Everyone gets the same wind. Winners split the pot. Quitting a match forfeits it for your team.

## Anti-cheat and creator tools

- The game catches edited saves, money or gear it never paid out, impossible rounds and absurd drives. Strong signs ban the device right away; smaller ones are flagged.
- The creator's account (🛡️ button on the home screen) has analytics (players online, played today, new players, sign-ins, rounds, aces), a player list, cheat flags, bans/unbans, leaderboard clean-up and Creator's Pick badges.

## Firebase setup

1. Publish the rules in `firestore.rules` (Firebase console > Firestore Database > Rules > Publish).
2. Turn on guest sign-in: Firebase console > Authentication > Sign-in method > **Anonymous** > Enable. (Without it, only Google-signed-in players can post scores.)

ChamiCards will be back.

## License

MIT
