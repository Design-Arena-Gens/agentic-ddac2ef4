## Pac-Man Neo

Pac-Man Neo is a modern browser remake of the arcade classic. Built with Next.js 14 (App Router) and Tailwind CSS, it delivers a responsive neon maze with animated ghosts, power-pellet surges, and keyboard or touch controls.

### Features

- Smooth canvas-based rendering with neon styling and responsive scaling
- Classic pellet, power pellet, and ghost AI behaviour (frightened and chase modes)
- Score, level, lives, pellet tracker, and persistent high score storage (localStorage)
- Arrow keys / WASD controls on desktop and touch-friendly controls on mobile
- Pause/resume toggle, level transitions, and game over restart flow

### Running Locally

```bash
npm install
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) and use the arrow keys (or the on-screen controls) to play. Press `P` or the pause button to pause/resume, and `Enter` to restart after a game over.

### Building

```bash
npm run build
npm run start
```

### Deployment

Deploy directly to Vercel:

```bash
vercel deploy --prod --yes --token $VERCEL_TOKEN --name agentic-ddac2ef4
```

The production site will be served from `https://agentic-ddac2ef4.vercel.app`.
