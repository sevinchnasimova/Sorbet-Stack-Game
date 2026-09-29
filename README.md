# Sorbet Stack

A pastel block-stacking game for the browser. No build step, no dependencies:
just open it and play.

## Play

Open `pastel-tetris-standalone.html` in any browser (double-click it, or run
`open pastel-tetris-standalone.html` on macOS). It is a single self-contained
file, so it works offline.

## Controls

| Input | Action |
|---|---|
| Left / Right | Move piece |
| Down | Soft drop |
| Up / X | Rotate |
| Space | Hard drop |
| C | Hold / swap piece |
| P | Pause / resume |
| R | Restart |
| Touch | Tap rotates, sideways swipe moves, flick down hard-drops |

## Features

- 7 pastel pieces with a landing-preview ghost
- Hold slot, next-piece preview, score / lines / level
- Best score saved in the browser
- Two background music tracks that switch and speed up as you level
- Sound effects with a volume slider (music shares the same slider)
- Level-up banner, game-over screen with score, lines, level, time, best
- Auto-pause when the tab is hidden

## Files

- `index.html` — page structure
- `style.css` — pastel styling
- `game.js` — all game logic, audio, and input
- `pastel-tetris-standalone.html` — generated single-file copy for playing
  (rebuilt from the three files above, so edit those, then regenerate)

## Built with

I built this game with the help of Muse Code, an agentic coding assistant
(powered by Meta Muse Spark). Working with it through the whole process —
game logic, music, pause behavior, new features, UI polish — helped me
strengthen my ability to use agents to code effectively.
