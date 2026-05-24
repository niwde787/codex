# Codex

Codex is a sideline-first youth football play tracking console rebuilt as a React/Vite app. It is designed for coaches who need fast play logging, clock control, score updates, roster selection, and recent-play review from mobile, tablet, or a 1920x1080 horizontal display.

## Features

- 1920x1080 command-center layout for desktop and livestream/tablet setups.
- Mobile layout inspired by modern sports apps, with Game, Roster, and Clock views.
- One-tap play result logging for offense, defense, and special teams.
- Manual yard adjustment before saving a play.
- Penalty adjustment before saving a play.
- Score, down, distance, yard line, and recent-play updates after each save.
- Running game clock with automatic stop at 0:00.
- Saved game profiles persisted locally in the browser.
- Editable game setup for teams, quarter, clock, and yard line.
- Roster import/export through CSV.
- Undo and reset controls for sideline correction.
- Play report export through CSV.

## Scripts

```bash
npm install
npm run dev
npm run build
npm run preview
```

## Deployment

The included GitHub Pages workflow builds the app with the `/codex/` base path and publishes the `dist` output whenever `main` is pushed.
