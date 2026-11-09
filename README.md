# CSS Snake

Snake drawn and animated with CSS. JavaScript keeps the game state and handles input, and that's it: about 150 lines, no libraries, no build step.

Play it at **[eli7pm.me/snake](https://eli7pm.me/snake/)**, or open `index.html` in a browser. There's nothing to install or build.

The portfolio's deploy copies these three files to `/snake/`, so a push here goes live the next time eli7pm.me deploys.

## Controls

- **Keyboard:** arrow keys or WASD to move, Space or Enter to start and pause.
- **Phones:** swipe on the board (16px is enough), or use the on-screen arrows.
- The game pauses on its own when you switch tabs.

## What CSS does

| Part | How |
| --- | --- |
| Board | one `repeating-conic-gradient` draws the checkerboard |
| Movement | each piece sits at `--x` / `--y`, placed with `transform`, so a linear `transition` as long as one step slides it to the next cell without stopping |
| Speed | `--speed` sets the slide duration: 160 ms per step, 10 ms faster every 5 points, down to 80 ms |
| Walls | the head wobbles and turns reddish while the snake waits at a wall |
| Head | eyes are two radial gradients, rotated by `--angle` to face the direction of travel |
| Food | a radial gradient with a pulsing `scale` animation |
| Score | `content: attr(data-score)` and `attr(data-best)` |
| Start, pause, game over | the text comes from `[data-state]` selectors; the overlay fades out while playing |
| Phone controls | the arrow pad and "tap" wording only appear on touch screens (`pointer: coarse`) |
| Themes | light and dark palettes from `prefers-color-scheme`, matching eli7pm.me |
| Reduced motion | sliding and pulsing turn off with `prefers-reduced-motion` |

## What JS does

- Keeps the snake as a list of cells, moves it on a timer, and checks for walls, itself and food.
- Writes the results back as CSS variables (`--x`, `--y`, `--angle`, `--speed`) and data attributes (`data-state`, `data-score`, `data-best`).
- Turns line up with what you see: the snake is drawn sliding toward its next square, so an arrow pressed in the first 40% of a step redoes that step in the new direction (the slide curves toward the corrected square). Later presses apply on the next step. Up to two turns queue so fast presses aren't lost, and a direct reversal is ignored.
- Heading into a wall doesn't end the game right away: the snake waits at the edge for one step, so there's time to turn.
- Saves the best score in `localStorage`.

## Files

```
index.html   markup: board, score, overlay, on-screen arrows
styles.css   everything you see
snake.js     game state and input
```
