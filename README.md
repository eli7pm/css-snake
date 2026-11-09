# CSS Snake

Snake drawn and animated with CSS. JavaScript keeps the game state and handles input, and that's it: about 150 lines, no libraries, no build step.

Play it at **[eli7pm.me/snake](https://eli7pm.me/snake/)**, or open `index.html` in a browser. There's nothing to install or build.

The portfolio's deploy copies these three files to `/snake/`, so a push here goes live the next time eli7pm.me deploys.

## Controls

- **Keyboard:** arrow keys or WASD to move, Space or Enter to start, pause and resume. Clicking a button doesn't take keyboard focus, so Space always pauses.
- **After losing:** Space or a tap continues from the score you lost at (speed, music, burrows and mongooses included; the snake starts at its normal length). The Restart button starts over from 0.
- **Buttons:** play / pause, restart, music on/off with a volume slider, and sound on/off, next to the score. CSS picks the play or pause icon from `[data-state]` and the speaker or muted icon from `aria-pressed`.
- **Phones:** swipe on the board, or use the on-screen arrows. Both react the moment you touch: arrows on touch-down, swipes as soon as your finger has moved 16px (several turns in one continuous swipe work too). Tap the board to pause, and tap again to resume. On touch screens the board is sized to the screen's height too, so the board and the arrows fit without scrolling, and starting a game scrolls them into view.
- The game pauses on its own when you switch tabs.

## Testing a score

Add `?points=N` to start every game (and every Restart) at that score, for example `index.html?points=19` or `/snake/?points=40`. Speed, the sinister music, the board tint and the number of holes match that score; the snake starts at its normal length. Scores from a test start aren't saved as your best.

## What CSS does

| Part | How |
| --- | --- |
| Board | one `repeating-conic-gradient` draws the checkerboard; a coil of concertina wire (overlapping steel loops with small razor barbs, a small inline SVG) runs around the edge through `border-image`, pushed mostly outside the board with `border-image-outset`, and running into it ends the game with "Snagged on the barbed wire" |
| Movement | each piece sits at `--x` / `--y`, placed with `transform`, so a linear `transition` as long as one step slides it to the next cell without stopping |
| Speed | `--speed` sets the slide duration: 200 ms per step, 6 ms faster every 10 points, down to 120 ms |
| Walls | the head wobbles and turns reddish while the snake waits at a wall |
| Body | each piece is a capsule from its own square to the piece in front of it, rotated by `--a`, so the pieces join into one tube with rounded elbows; the rotation is animated over a step, which keeps corners smooth while the snake turns. JS sets `--a` (kept continuous so nothing spins the long way), `--i` and `--len`; CSS tapers the last four pieces and stacks pieces so the head side is on top. Scales are radial-gradient rings in a darker green that turn with the body |
| Burrows and mongoose | each hole is a stack of radial gradients (dirt rim, dark hole, glinting eyes animated with `background-size`); from 30 points a `data-size` attribute set by the game (small, growing, big) drives a `scale` transition and a rumble animation, so what you see matches the danger zone. The mongoose is a silhouette from SVG Repo used as an inline SVG `clip-path`, painted entirely with CSS gradients (grizzled fur, belly, eye patch, ear, nose). In a burrow, a small front-facing head (a pointed `clip-path` face with low side ears, dark eye patches, a pale muzzle and a dark nose) springs out with a bouncy `transition`; from 40 points mongooses trot across the board: running left or right they use the side-on silhouette (flipped to face their direction); running up or down they're drawn from above (a long body with a darker spine, a pointed head with small ears, paddling legs and a wagging tail), turned to face their direction |
| Game over | when the mongoose gets you, a scene in the overlay: the same silhouette mongoose shakes a snake clamped across its snout (the upper snout is drawn a second time on top of the snake). The snake is a small inline SVG S-curve (a body stroke with a dashed belly line that `stroke-dashoffset` makes crawl), with a dazed X-eyed head dangling below and the rattle poking out past the snout |
| Other game overs | a knocked-out snake: the spade head (the same `clip-path` as in play) on a short scaly neck, X eyes from crossed `linear-gradient`s, and a limp forked tongue, swaying slowly |
| Rattle | burgundy rings from a `repeating-linear-gradient` past the tip of the tail (`.segment.tail`), with a softly pulsing `box-shadow` glow and a shake every couple of seconds |
| Head | a viper's spade (`clip-path` polygon), widest at the jaw and tapering to a rounded snout, rotated by `--a`; eyes on the sides with amber irises, slit pupils and brow ridges, plus two nostrils, all radial gradients. Each time the snake eats, the eyes blaze: the iris color (registered with `@property` so it can animate) flashes near-white gold under four stacked `drop-shadow` glows. A forked burgundy tongue (a `clip-path` polygon) flicks in and out |
| Food | a radial gradient with a burgundy glow (`box-shadow`) and a pulsing `scale` animation |
| Score | `content: attr(data-score)` and `attr(data-best)` |
| Start, pause, game over | the text comes from `[data-state]` selectors; the overlay fades out while playing |
| Phone controls | the arrow pad and "tap" wording only appear on touch screens (`pointer: coarse`) |
| Themes | light and dark palettes from `prefers-color-scheme`, matching eli7pm.me |
| Reduced motion | sliding and pulsing turn off with `prefers-reduced-motion` |

## What JS does

- Keeps the snake as a list of cells, moves it on a timer, and checks for walls, itself and food.
- Writes the results back as CSS variables (`--x`, `--y`, `--angle`, `--speed`) and data attributes (`data-state`, `data-score`, `data-best`).
- Turns line up with what you see: the snake is drawn sliding toward its next square, so an arrow or on-screen button pressed in the first 65% of a step redoes that step in the new direction (the slide curves toward the corrected square). Later presses apply on the next step. Up to two turns queue so fast presses aren't lost, and a direct reversal is ignored.
- Heading into the wire doesn't end the game right away: the snake is held at the edge for two steps, and a turn during that time moves it away immediately instead of waiting for the next step.
- Makes every sound with the Web Audio API (no audio files). Browsers only allow sound after you interact, so it starts with the first game.
  - **Eating:** a short two-note chirp.
  - **Scores of 10, 20, 40, 60 and 80:** a rattle (bursts of filtered noise) instead of the chirp, while the rattle on the tail shakes fast.
  - **Game over:** a falling tone with a low thud. When the mongoose gets you, `laugh.mp3` plays instead if that file sits next to `index.html` (bring your own clip with a license that allows it; without the file the game uses the falling tone).
  - **Reaching 20:** after the rattle, a cartoon villain sting: two short dark brass chords and a long wavering third (diminished chords on sawtooth oscillators through a closing low-pass filter).
- Plays an original background track, generated live in `music.js`: zany cartoon funk with a 16-bit feel. FM synthesis (one oscillator modulating another, the way the Sega Genesis made sound) gives a slappy bass and brassy horn stabs over a swung drum kit, with a cartoon "boing" every four bars. It stays at 128 BPM however fast the snake gets, and pauses with the game.
- From 20 points, food prefers tight spots: corners, squares against a wall or the body, or gaps with two sides blocked. It never picks a dead end (three sides blocked) or a square within 3 of the head, and falls back to an edge square, then anywhere free.
- From 20 points, the music turns sinister at the next bar: a chromatic bassline with a tritone, diminished horn stabs, an original theremin-style lead with vibrato, a heavier snare, and a descending "wah" instead of the "boing". The tempo stays at 128 BPM, and a new game goes back to the original track. The board takes a faint burgundy tint at the same time.
- From 20 points, burrows appear (3 at first, one more every 10 points, up to 6), never on or near the snake or on food. After that, every bite moves them all to new spots (with a quick dig animation), except a burrow that's rumbling before a mongoose runs out. Stepping the head into one ends the game: the mongoose springs out with a chitter and bites three times while the head thrashes, and the game-over screen appears after that 1.6-second scene (keys and taps are ignored during it; Restart cancels it). Eyes glint inside each burrow every few seconds as a warning.
- From 30 points, burrows grow on their own random timers: small for 10–20 moves, then they rumble for 3 moves, swell to about twice their size for 6–10 moves, and shrink back. While a burrow is big, moving the head onto any square next to it (not diagonally) lets the mongoose catch you.
- From 40 points, mongooses run across the board. A burrow rumbles, then a mongoose bursts out and runs straight up, down, left or right, one square per move, all the way to the edge of the board. Running into one, or being run into anywhere along the body, ends the game with the same caught scene. A new run only starts once the board is clear of mongooses.
  - **40–49:** one at a time, after a 5-move rumble.
  - **50+:** waves of 2 (3 from 70) burst out of different burrows at once, after a 3-move rumble and about twice as often.
- Saves the best score, the music and sound settings, and the music volume in `localStorage`.

## Files

```
index.html   markup: board, score, buttons, overlay, on-screen arrows
styles.css   everything you see
snake.js     game state, input and sound effects
music.js     the background track
laugh.mp3    optional: played when the mongoose gets you (not included)
```
