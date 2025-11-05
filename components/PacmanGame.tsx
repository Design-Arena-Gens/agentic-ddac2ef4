"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Direction = { x: number; y: number };
type TileValue = 0 | 1 | 2 | 3;

type PacmanState = {
  tileX: number;
  tileY: number;
  direction: Direction;
  nextDirection: Direction;
  target: { x: number; y: number } | null;
  progress: number;
  speed: number;
};

type GhostMode = "chase" | "frightened" | "eyes";

type GhostState = {
  name: string;
  color: string;
  tileX: number;
  tileY: number;
  direction: Direction;
  target: { x: number; y: number } | null;
  progress: number;
  speed: number;
  mode: GhostMode;
  scatterTarget: { x: number; y: number };
  frightenedTimer: number;
  eyesTarget: { x: number; y: number };
};

type GameState = {
  board: TileValue[][];
  pelletsRemaining: number;
  pacman: PacmanState;
  ghosts: GhostState[];
  score: number;
  lives: number;
  level: number;
  paused: boolean;
  awaitingStart: boolean;
  message: string | null;
  powerTimer: number;
  ghostEatStreak: number;
  elapsed: number;
  highScore: number;
  gameOver: boolean;
  bonusLifeAwarded: boolean;
};

const TILE_SIZE = 24;
const POWER_DURATION_MS = 7000;
const FRIGHT_FLASH_START_MS = 2400;
const INITIAL_LIVES = 3;
const BASE_PAC_SPEED = 6; // tiles per second
const BASE_GHOST_SPEED = 5.2;

const LEVELS: TileValue[][][] = [
  [
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 2, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 2, 0],
    [0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0],
    [0, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 0],
    [0, 1, 0, 1, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 1, 0],
    [0, 1, 1, 1, 1, 1, 1, 0, 3, 3, 3, 3, 1, 0, 1, 1, 1, 1, 0],
    [0, 1, 0, 0, 0, 0, 1, 0, 3, 1, 1, 3, 1, 0, 1, 0, 0, 1, 0],
    [0, 1, 1, 1, 1, 1, 1, 0, 3, 3, 3, 3, 1, 0, 1, 1, 1, 1, 0],
    [0, 1, 0, 0, 0, 0, 1, 0, 3, 1, 1, 3, 1, 0, 1, 0, 0, 1, 0],
    [0, 1, 1, 1, 1, 1, 1, 1, 3, 3, 3, 3, 1, 1, 1, 1, 1, 1, 0],
    [0, 0, 0, 0, 0, 0, 1, 0, 3, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0],
    [3, 3, 3, 3, 3, 1, 1, 0, 3, 3, 3, 3, 1, 0, 1, 1, 1, 3, 3],
    [0, 0, 0, 0, 0, 0, 1, 0, 3, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0],
    [0, 1, 1, 1, 1, 1, 1, 1, 3, 3, 3, 3, 1, 1, 1, 1, 1, 1, 0],
    [0, 1, 0, 0, 0, 0, 1, 0, 3, 1, 1, 3, 1, 0, 1, 0, 0, 1, 0],
    [0, 1, 1, 1, 1, 1, 1, 0, 3, 3, 3, 3, 1, 0, 1, 1, 1, 1, 0],
    [0, 1, 0, 1, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 1, 0],
    [0, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 0],
    [0, 2, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 2, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  ],
];

const boardColumns = LEVELS[0][0].length;
const boardRows = LEVELS[0].length;
const boardWidth = boardColumns * TILE_SIZE;
const boardHeight = boardRows * TILE_SIZE;

const pacmanStart = { x: 9, y: 15 };
const ghostHome = { x: 9, y: 6 };

const GHOST_CONFIG = [
  {
    name: "Blinky",
    color: "#ff3c3c",
    start: { x: 9, y: 5 },
    scatterTarget: { x: boardColumns - 2, y: 1 },
  },
  {
    name: "Pinky",
    color: "#ff8ed9",
    start: { x: 8, y: 5 },
    scatterTarget: { x: 1, y: 1 },
  },
  {
    name: "Inky",
    color: "#4bf2ff",
    start: { x: 10, y: 5 },
    scatterTarget: { x: boardColumns - 2, y: boardRows - 2 },
  },
  {
    name: "Clyde",
    color: "#ffb852",
    start: { x: 9, y: 7 },
    scatterTarget: { x: 1, y: boardRows - 2 },
  },
] as const;

const keyDirectionMap: Record<string, Direction> = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  w: { x: 0, y: -1 },
  s: { x: 0, y: 1 },
  a: { x: -1, y: 0 },
  d: { x: 1, y: 0 },
};

const cloneLevel = (level: TileValue[][]) => level.map((row) => [...row]);

const wrapIndex = (value: number, size: number) => {
  if (value < 0) return size - 1;
  if (value >= size) return 0;
  return value;
};

const minimalWrapDistance = (a: number, b: number, size: number) => {
  let diff = a - b;
  if (diff > size / 2) diff -= size;
  if (diff < -size / 2) diff += size;
  return diff;
};

const entityCenter = (entity: PacmanState | GhostState, board: TileValue[][]) => {
  const cols = board[0].length;
  const rows = board.length;
  if (!entity.target) {
    return { x: entity.tileX + 0.5, y: entity.tileY + 0.5 };
  }
  let dx = entity.target.x - entity.tileX;
  let dy = entity.target.y - entity.tileY;
  if (Math.abs(dx) > 1) dx -= Math.sign(dx) * cols;
  if (Math.abs(dy) > 1) dy -= Math.sign(dy) * rows;
  return {
    x: entity.tileX + dx * entity.progress + 0.5,
    y: entity.tileY + dy * entity.progress + 0.5,
  };
};

const distanceSquaredToTarget = (
  tileX: number,
  tileY: number,
  target: { x: number; y: number },
  cols: number,
  rows: number,
) => {
  const dx = minimalWrapDistance(tileX + 0.5, target.x, cols);
  const dy = minimalWrapDistance(tileY + 0.5, target.y, rows);
  return dx * dx + dy * dy;
};

const countPellets = (board: TileValue[][]) => {
  let total = 0;
  for (const row of board) {
    for (const tile of row) {
      if (tile === 1 || tile === 2) total += 1;
    }
  }
  return total;
};

const createPacman = (): PacmanState => ({
  tileX: pacmanStart.x,
  tileY: pacmanStart.y,
  direction: { x: 0, y: 0 },
  nextDirection: { x: 0, y: 0 },
  target: null,
  progress: 0,
  speed: BASE_PAC_SPEED,
});

const createGhosts = (level: number): GhostState[] => {
  const speedBoost = (level - 1) * 0.2;
  return GHOST_CONFIG.map((ghost) => ({
    name: ghost.name,
    color: ghost.color,
    tileX: ghost.start.x,
    tileY: ghost.start.y,
    direction: { x: 0, y: 0 },
    target: null,
    progress: 0,
    speed: BASE_GHOST_SPEED + speedBoost,
    mode: "chase" as GhostMode,
    scatterTarget: { ...ghost.scatterTarget },
    frightenedTimer: 0,
    eyesTarget: { ...ghostHome },
  }));
};

const resetActors = (state: GameState) => {
  state.pacman = {
    tileX: pacmanStart.x,
    tileY: pacmanStart.y,
    direction: { x: 0, y: 0 },
    nextDirection: { x: 0, y: 0 },
    target: null,
    progress: 0,
    speed: BASE_PAC_SPEED + (state.level - 1) * 0.25,
  };
  state.ghosts = createGhosts(state.level);
  state.ghosts.forEach((ghost) => {
    ghost.mode = "chase";
    ghost.frightenedTimer = 0;
  });
};

const tileIsAccessibleForPacman = (board: TileValue[][], x: number, y: number) => {
  const tile = board[wrapIndex(y, board.length)][wrapIndex(x, board[0].length)];
  return tile !== 0;
};

const tileIsAccessibleForGhost = (board: TileValue[][], x: number, y: number) => {
  const tile = board[wrapIndex(y, board.length)][wrapIndex(x, board[0].length)];
  return tile !== 0;
};

const sameDirection = (a: Direction, b: Direction) => a.x === b.x && a.y === b.y;

const awardBonusLifeIfEligible = (state: GameState) => {
  if (!state.bonusLifeAwarded && state.score >= 10000) {
    state.lives += 1;
    state.bonusLifeAwarded = true;
  }
};

const applyPowerMode = (state: GameState) => {
  state.powerTimer = POWER_DURATION_MS;
  state.ghostEatStreak = 0;
  state.ghosts.forEach((ghost) => {
    if (ghost.mode === "eyes") return;
    ghost.mode = "frightened";
    ghost.frightenedTimer = POWER_DURATION_MS;
  });
};

const handlePacmanTileEntry = (state: GameState) => {
  const tile = state.board[state.pacman.tileY][state.pacman.tileX];
  if (tile === 1) {
    state.board[state.pacman.tileY][state.pacman.tileX] = 3;
    state.score += 10;
    state.pelletsRemaining -= 1;
    awardBonusLifeIfEligible(state);
  } else if (tile === 2) {
    state.board[state.pacman.tileY][state.pacman.tileX] = 3;
    state.score += 50;
    state.pelletsRemaining -= 1;
    awardBonusLifeIfEligible(state);
    applyPowerMode(state);
  }
};

const beginPacmanStep = (state: GameState, direction: Direction) => {
  const cols = state.board[0].length;
  const rows = state.board.length;
  const nextX = wrapIndex(state.pacman.tileX + direction.x, cols);
  const nextY = wrapIndex(state.pacman.tileY + direction.y, rows);
  if (!tileIsAccessibleForPacman(state.board, nextX, nextY)) {
    if (sameDirection(direction, state.pacman.direction)) {
      state.pacman.direction = { x: 0, y: 0 };
      state.pacman.target = null;
    }
    return false;
  }
  state.pacman.direction = { ...direction };
  state.pacman.target = { x: nextX, y: nextY };
  state.pacman.progress = 0;
  return true;
};

const updatePacman = (state: GameState, deltaSeconds: number) => {
  let distance = state.pacman.speed * deltaSeconds;

  if (!state.pacman.target) {
    if (!sameDirection(state.pacman.direction, state.pacman.nextDirection)) {
      beginPacmanStep(state, state.pacman.nextDirection);
    }
    if (!state.pacman.target && (state.pacman.direction.x !== 0 || state.pacman.direction.y !== 0)) {
      beginPacmanStep(state, state.pacman.direction);
    }
  }

  const cols = state.board[0].length;
  const rows = state.board.length;

  while (distance > 0 && state.pacman.target) {
    const remaining = 1 - state.pacman.progress;
    if (distance >= remaining) {
      state.pacman.tileX = state.pacman.target.x;
      state.pacman.tileY = state.pacman.target.y;
      state.pacman.progress = 0;
      state.pacman.target = null;
      distance -= remaining;
      handlePacmanTileEntry(state);
      if (!sameDirection(state.pacman.direction, state.pacman.nextDirection)) {
        if (beginPacmanStep(state, state.pacman.nextDirection)) {
          continue;
        }
      }
      if (!state.pacman.target && (state.pacman.direction.x !== 0 || state.pacman.direction.y !== 0)) {
        if (!beginPacmanStep(state, state.pacman.direction)) {
          break;
        }
      }
    } else {
      state.pacman.progress += distance;
      distance = 0;
    }
  }

  state.pacman.tileX = wrapIndex(state.pacman.tileX, cols);
  state.pacman.tileY = wrapIndex(state.pacman.tileY, rows);
};

const chooseGhostStep = (ghost: GhostState, state: GameState) => {
  const cols = state.board[0].length;
  const rows = state.board.length;

  const available = [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
  ].filter((dir) => {
    const nextX = wrapIndex(ghost.tileX + dir.x, cols);
    const nextY = wrapIndex(ghost.tileY + dir.y, rows);
    return tileIsAccessibleForGhost(state.board, nextX, nextY);
  });

  let options = available.filter(
    (dir) => !(dir.x === -ghost.direction.x && dir.y === -ghost.direction.y),
  );
  if (options.length === 0) options = available;
  if (options.length === 0) return;

  const pacmanPos = entityCenter(state.pacman, state.board);
  let target: { x: number; y: number };

  if (ghost.mode === "eyes") {
    target = { x: ghost.eyesTarget.x + 0.5, y: ghost.eyesTarget.y + 0.5 };
  } else if (ghost.mode === "frightened") {
    const choice = options[Math.floor(Math.random() * options.length)];
    const nextX = wrapIndex(ghost.tileX + choice.x, cols);
    const nextY = wrapIndex(ghost.tileY + choice.y, rows);
    ghost.direction = { ...choice };
    ghost.target = { x: nextX, y: nextY };
    ghost.progress = 0;
    return;
  } else {
    switch (ghost.name) {
      case "Pinky":
        target = {
          x: pacmanPos.x + state.pacman.direction.x * 4,
          y: pacmanPos.y + state.pacman.direction.y * 4,
        };
        break;
      case "Inky":
        target = {
          x: pacmanPos.x - state.pacman.direction.x * 4,
          y: pacmanPos.y - state.pacman.direction.y * 4,
        };
        break;
      case "Clyde": {
        const ghostPos = { x: ghost.tileX + 0.5, y: ghost.tileY + 0.5 };
        const distance = Math.hypot(
          minimalWrapDistance(ghostPos.x, pacmanPos.x, cols),
          minimalWrapDistance(ghostPos.y, pacmanPos.y, rows),
        );
        target = distance < 5
          ? { x: ghost.scatterTarget.x + 0.5, y: ghost.scatterTarget.y + 0.5 }
          : pacmanPos;
        break;
      }
      default:
        target = pacmanPos;
    }
  }

  target.x = (target.x + cols) % cols;
  target.y = (target.y + rows) % rows;

  let selected = options[0];
  let bestScore = Number.POSITIVE_INFINITY;

  for (const option of options) {
    const nextX = wrapIndex(ghost.tileX + option.x, cols);
    const nextY = wrapIndex(ghost.tileY + option.y, rows);
    const score = distanceSquaredToTarget(nextX, nextY, target, cols, rows);
    if (score < bestScore) {
      bestScore = score;
      selected = option;
    }
  }

  const nextX = wrapIndex(ghost.tileX + selected.x, cols);
  const nextY = wrapIndex(ghost.tileY + selected.y, rows);
  ghost.direction = { ...selected };
  ghost.target = { x: nextX, y: nextY };
  ghost.progress = 0;
};

const updateGhost = (state: GameState, ghost: GhostState, deltaSeconds: number) => {
  if (!ghost.target) {
    chooseGhostStep(ghost, state);
  }

  if (ghost.mode === "frightened") {
    ghost.frightenedTimer = Math.max(0, ghost.frightenedTimer - deltaSeconds * 1000);
    if (ghost.frightenedTimer <= 0) {
      ghost.mode = "chase";
    }
  }

  const speedBonus = (state.level - 1) * 0.1;
  const currentSpeed =
    ghost.mode === "eyes"
      ? (BASE_GHOST_SPEED + speedBonus) * 1.4
      : ghost.mode === "frightened"
        ? Math.max(3.2, BASE_GHOST_SPEED - 1 + speedBonus)
        : BASE_GHOST_SPEED + speedBonus;

  let distance = currentSpeed * deltaSeconds;
  const cols = state.board[0].length;
  const rows = state.board.length;

  while (distance > 0 && ghost.target) {
    const remaining = 1 - ghost.progress;
    if (distance >= remaining) {
      ghost.tileX = ghost.target.x;
      ghost.tileY = ghost.target.y;
      ghost.progress = 0;
      ghost.target = null;
      distance -= remaining;

      if (ghost.mode === "eyes" && ghost.tileX === ghost.eyesTarget.x && ghost.tileY === ghost.eyesTarget.y) {
        ghost.mode = "chase";
      }

      chooseGhostStep(ghost, state);
    } else {
      ghost.progress += distance;
      distance = 0;
    }
  }

  ghost.tileX = wrapIndex(ghost.tileX, cols);
  ghost.tileY = wrapIndex(ghost.tileY, rows);
};

const handlePacmanDeath = (state: GameState) => {
  state.lives -= 1;
  state.powerTimer = 0;
  state.ghostEatStreak = 0;
  state.ghosts.forEach((ghost) => {
    if (ghost.mode === "frightened") {
      ghost.mode = "chase";
    }
    ghost.frightenedTimer = 0;
  });

  if (state.lives <= 0) {
    state.gameOver = true;
    state.paused = true;
    state.awaitingStart = false;
    state.message = "Game Over — Press Enter to restart";
  } else {
    state.paused = true;
    state.awaitingStart = true;
    state.message = "Ready!";
    resetActors(state);
  }
};

const resolveCollisions = (state: GameState) => {
  const pacPosition = entityCenter(state.pacman, state.board);
  const cols = state.board[0].length;
  const rows = state.board.length;

  for (const ghost of state.ghosts) {
    const ghostPosition = entityCenter(ghost, state.board);
    const distance = Math.hypot(
      minimalWrapDistance(pacPosition.x, ghostPosition.x, cols),
      minimalWrapDistance(pacPosition.y, ghostPosition.y, rows),
    );

    if (distance <= 0.55) {
      if (ghost.mode === "frightened") {
        ghost.mode = "eyes";
        ghost.target = null;
        ghost.progress = 0;
        ghost.direction = { x: 0, y: 0 };
        ghost.eyesTarget = { ...ghostHome };
        state.ghostEatStreak += 1;
        const points = 200 * 2 ** (state.ghostEatStreak - 1);
        state.score += points;
        awardBonusLifeIfEligible(state);
      } else if (ghost.mode !== "eyes") {
        handlePacmanDeath(state);
        break;
      }
    }
  }
};

const advanceLevel = (state: GameState) => {
  state.level += 1;
  const layout = LEVELS[(state.level - 1) % LEVELS.length];
  state.board = cloneLevel(layout);
  state.pelletsRemaining = countPellets(state.board);
  state.powerTimer = 0;
  state.ghostEatStreak = 0;
  resetActors(state);
  state.paused = true;
  state.awaitingStart = true;
  state.message = "Level Up! Press an arrow to continue";
};

const engineStep = (state: GameState, deltaMs: number) => {
  const cappedDelta = Math.min(deltaMs, 66);
  const deltaSeconds = cappedDelta / 1000;

  state.elapsed += cappedDelta;

  updatePacman(state, deltaSeconds);
  state.ghosts.forEach((ghost) => updateGhost(state, ghost, deltaSeconds));
  resolveCollisions(state);

  if (state.gameOver) {
    return;
  }

  if (state.pelletsRemaining <= 0) {
    advanceLevel(state);
    return;
  }

  if (state.powerTimer > 0) {
    state.powerTimer = Math.max(0, state.powerTimer - cappedDelta);
    if (state.powerTimer === 0) {
      state.ghostEatStreak = 0;
      state.ghosts.forEach((ghost) => {
        if (ghost.mode === "frightened") ghost.mode = "chase";
      });
    }
  }
};

const initialiseGameState = (highScore: number): GameState => {
  const board = cloneLevel(LEVELS[0]);
  const pelletsRemaining = countPellets(board);
  return {
    board,
    pelletsRemaining,
    pacman: createPacman(),
    ghosts: createGhosts(1),
    score: 0,
    lives: INITIAL_LIVES,
    level: 1,
    paused: true,
    awaitingStart: true,
    message: "Press any arrow key to start",
    powerTimer: 0,
    ghostEatStreak: 0,
    elapsed: 0,
    highScore,
    gameOver: false,
    bonusLifeAwarded: false,
  };
};

const formatScore = (score: number) => score.toString().padStart(6, "0");

export function PacmanGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const stateRef = useRef<GameState | null>(null);
  const requestRef = useRef<number | null>(null);
  const highScoreKey = "agentic-pacman-high-score";

  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [lives, setLives] = useState(INITIAL_LIVES);
  const [level, setLevel] = useState(1);
  const [status, setStatus] = useState("ready");
  const [message, setMessage] = useState<string | null>("Press any arrow key to start");
  const [powerSeconds, setPowerSeconds] = useState(0);
  const [pelletsLeft, setPelletsLeft] = useState(0);

  const uiStateRef = useRef({
    score: 0,
    highScore: 0,
    lives: INITIAL_LIVES,
    level: 1,
    status: "ready",
    message: "Press any arrow key to start" as string | null,
    powerSeconds: 0,
    pelletsLeft: 0,
  });

  const syncUiState = useCallback(() => {
    const state = stateRef.current;
    if (!state) return;

    if (state.score !== uiStateRef.current.score) {
      uiStateRef.current.score = state.score;
      setScore(state.score);
    }

    if (state.highScore !== uiStateRef.current.highScore) {
      uiStateRef.current.highScore = state.highScore;
      setHighScore(state.highScore);
    }

    if (state.lives !== uiStateRef.current.lives) {
      uiStateRef.current.lives = state.lives;
      setLives(state.lives);
    }

    if (state.level !== uiStateRef.current.level) {
      uiStateRef.current.level = state.level;
      setLevel(state.level);
    }

    const currentStatus = state.gameOver
      ? "gameover"
      : state.awaitingStart
        ? "ready"
        : state.paused
          ? "paused"
          : "playing";

    if (currentStatus !== uiStateRef.current.status) {
      uiStateRef.current.status = currentStatus;
      setStatus(currentStatus);
    }

    if (state.message !== uiStateRef.current.message) {
      uiStateRef.current.message = state.message ?? null;
      setMessage(state.message);
    }

    const nextPowerSeconds = Math.max(0, Math.ceil(state.powerTimer / 1000));
    if (nextPowerSeconds !== uiStateRef.current.powerSeconds) {
      uiStateRef.current.powerSeconds = nextPowerSeconds;
      setPowerSeconds(nextPowerSeconds);
    }

    if (state.pelletsRemaining !== uiStateRef.current.pelletsLeft) {
      uiStateRef.current.pelletsLeft = state.pelletsRemaining;
      setPelletsLeft(state.pelletsRemaining);
    }
  }, []);

  const draw = useCallback((state: GameState) => {
    const ctx = contextRef.current;
    if (!ctx) return;

    ctx.clearRect(0, 0, boardWidth, boardHeight);
    ctx.fillStyle = "#050517";
    ctx.fillRect(0, 0, boardWidth, boardHeight);

    for (let y = 0; y < boardRows; y += 1) {
      for (let x = 0; x < boardColumns; x += 1) {
        const tile = state.board[y][x];
        const px = x * TILE_SIZE;
        const py = y * TILE_SIZE;

        if (tile === 0) {
          ctx.fillStyle = "#002447";
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          ctx.strokeStyle = "#2c8dff";
          ctx.lineWidth = 2;
          ctx.strokeRect(px + 1, py + 1, TILE_SIZE - 2, TILE_SIZE - 2);
        } else {
          ctx.fillStyle = "#050517";
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

          if (tile === 1) {
            ctx.fillStyle = "#f5f3ff";
            ctx.beginPath();
            ctx.arc(px + TILE_SIZE / 2, py + TILE_SIZE / 2, 3, 0, Math.PI * 2);
            ctx.fill();
          } else if (tile === 2) {
            ctx.fillStyle = "#f5f3ff";
            ctx.beginPath();
            ctx.arc(px + TILE_SIZE / 2, py + TILE_SIZE / 2, 6, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }

    const pacPosition = entityCenter(state.pacman, state.board);
    const pacX = pacPosition.x * TILE_SIZE;
    const pacY = pacPosition.y * TILE_SIZE;
    const mouthAnimation = state.pacman.direction.x === 0 && state.pacman.direction.y === 0
      ? 0.05
      : 0.2 + 0.1 * Math.sin(state.elapsed / 60);

    let facingAngle = 0;
    if (state.pacman.direction.x === 1) facingAngle = 0;
    else if (state.pacman.direction.x === -1) facingAngle = Math.PI;
    else if (state.pacman.direction.y === -1) facingAngle = -Math.PI / 2;
    else if (state.pacman.direction.y === 1) facingAngle = Math.PI / 2;

    ctx.fillStyle = "#fcd200";
    ctx.beginPath();
    ctx.moveTo(pacX, pacY);
    ctx.arc(
      pacX,
      pacY,
      TILE_SIZE * 0.45,
      facingAngle + mouthAnimation,
      facingAngle - mouthAnimation,
      true,
    );
    ctx.closePath();
    ctx.fill();

    const flash = state.powerTimer > 0 && state.powerTimer < FRIGHT_FLASH_START_MS
      ? Math.floor((state.powerTimer / 120) % 2) === 0
      : false;

    for (const ghost of state.ghosts) {
      const ghostPos = entityCenter(ghost, state.board);
      const gx = ghostPos.x * TILE_SIZE;
      const gy = ghostPos.y * TILE_SIZE;
      const radius = TILE_SIZE * 0.45;

      if (ghost.mode !== "eyes") {
        if (ghost.mode === "frightened") {
          ctx.fillStyle = flash ? "#f6f6f6" : "#1f75ff";
        } else {
          ctx.fillStyle = ghost.color;
        }
        ctx.beginPath();
        ctx.arc(gx, gy, radius, Math.PI, 0, false);
        ctx.lineTo(gx + radius, gy + radius);
        ctx.lineTo(gx - radius, gy + radius);
        ctx.closePath();
        ctx.fill();
      }

      ctx.fillStyle = "#ffffff";
      const eyeOffsetX = radius * 0.35;
      const eyeOffsetY = radius * 0.05;
      const eyeWidth = radius * 0.35;
      const eyeHeight = radius * 0.5;

      ctx.beginPath();
      ctx.ellipse(gx - eyeOffsetX, gy - eyeOffsetY, eyeWidth, eyeHeight, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(gx + eyeOffsetX, gy - eyeOffsetY, eyeWidth, eyeHeight, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = ghost.mode === "frightened" ? "#1f1f60" : "#13243c";
      const pupilOffsetX = ghost.direction.x * radius * 0.2;
      const pupilOffsetY = ghost.direction.y * radius * 0.2;
      const pupilRadius = radius * 0.18;
      ctx.beginPath();
      ctx.arc(gx - eyeOffsetX + pupilOffsetX, gy - eyeOffsetY + pupilOffsetY, pupilRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(gx + eyeOffsetX + pupilOffsetX, gy - eyeOffsetY + pupilOffsetY, pupilRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  }, []);

  const requestDirection = useCallback((direction: Direction) => {
    const state = stateRef.current;
    if (!state || state.gameOver) return;
    state.pacman.nextDirection = { ...direction };
    if (state.awaitingStart) {
      state.awaitingStart = false;
      state.paused = false;
      state.message = null;
    }
    syncUiState();
  }, [syncUiState]);

  const togglePause = useCallback(() => {
    const state = stateRef.current;
    if (!state || state.gameOver) return;
    if (state.awaitingStart) return;
    state.paused = !state.paused;
    state.message = state.paused ? "Paused" : null;
    syncUiState();
  }, [syncUiState]);

  const restartGame = useCallback(() => {
    const storedHighScore = stateRef.current?.highScore ?? 0;
    const state = initialiseGameState(storedHighScore);
    stateRef.current = state;
    resetActors(state);
    syncUiState();
    draw(state);
  }, [draw, syncUiState]);

  useEffect(() => {
    const storedHighScore = (() => {
      try {
        const raw = window.localStorage.getItem(highScoreKey);
        return raw ? Number.parseInt(raw, 10) || 0 : 0;
      } catch {
        return 0;
      }
    })();

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = boardWidth * dpr;
    canvas.height = boardHeight * dpr;
    canvas.style.width = `${boardWidth}px`;
    canvas.style.height = `${boardHeight}px`;
    ctx.scale(dpr, dpr);
    contextRef.current = ctx;

    const state = initialiseGameState(storedHighScore);
    stateRef.current = state;
    resetActors(state);
    syncUiState();
    draw(state);

    let previous = performance.now();

    const loop = (timestamp: number) => {
      const delta = timestamp - previous;
      previous = timestamp;

      const current = stateRef.current;
      if (current) {
        if (!current.paused && !current.awaitingStart && !current.gameOver) {
          engineStep(current, delta);
        } else {
          current.elapsed += delta * 0.5;
        }

        if (current.score > current.highScore) {
          current.highScore = current.score;
          try {
            window.localStorage.setItem(highScoreKey, String(current.highScore));
          } catch {
            // ignore persistence errors
          }
        }

        syncUiState();
        draw(current);
      }

      requestRef.current = requestAnimationFrame(loop);
    };

    requestRef.current = requestAnimationFrame(loop);

    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key;
      if (key in keyDirectionMap) {
        event.preventDefault();
        requestDirection(keyDirectionMap[key]);
      } else if (key === "p" || key === "P" || key === " " || key === "Spacebar") {
        event.preventDefault();
        togglePause();
      } else if (key === "Enter" && stateRef.current?.gameOver) {
        event.preventDefault();
        restartGame();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      if (requestRef.current !== null) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = null;
      }
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [draw, requestDirection, restartGame, syncUiState, togglePause]);

  return (
    <section className="w-full rounded-3xl border border-yellow-500/30 bg-black/70 p-6 shadow-2xl shadow-yellow-500/10">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-4 text-sm uppercase tracking-[0.28em] text-zinc-200">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold text-yellow-300">Score</span>
          <span className="font-mono text-xl tabular-nums text-yellow-200">{formatScore(score)}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold text-sky-300">High Score</span>
          <span className="font-mono text-xl tabular-nums text-sky-200">{formatScore(highScore)}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold text-emerald-300">Lives</span>
          <span className="font-mono text-xl tabular-nums text-emerald-200">{lives}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold text-purple-300">Level</span>
          <span className="font-mono text-xl tabular-nums text-purple-200">{level}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold text-orange-300">Pellets</span>
          <span className="font-mono text-xl tabular-nums text-orange-200">{pelletsLeft}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold text-cyan-300">Status</span>
          <span className="font-mono text-xl capitalize text-cyan-200">{status}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold text-pink-300">Power</span>
          <span className="font-mono text-xl text-pink-200">{powerSeconds}s</span>
        </div>
      </header>
      <div className="relative mx-auto mt-6 flex flex-col items-center">
        <div className="relative overflow-hidden rounded-2xl border border-yellow-400/20 bg-[#050517]" style={{ maxWidth: `${boardWidth}px` }}>
          <canvas
            ref={canvasRef}
            className="h-auto w-full"
            style={{ imageRendering: "pixelated" as const }}
          />
          {message && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/60">
              <div className="rounded-xl border border-yellow-500/50 bg-black/80 px-6 py-4 text-center shadow-lg">
                <p className="text-lg font-semibold text-yellow-200">{message}</p>
                {status === "gameover" ? (
                  <p className="mt-2 text-xs text-zinc-200">Press Enter to restart.</p>
                ) : (
                  <p className="mt-2 text-xs text-zinc-300">Use arrow keys or tap the controls.</p>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="mt-6 grid w-full max-w-sm grid-cols-3 gap-3 text-lg font-semibold text-yellow-200 sm:hidden">
          <button
            type="button"
            className="col-span-3 rounded-xl border border-yellow-500/30 bg-yellow-500/10 py-2"
            onClick={() => requestDirection({ x: 0, y: -1 })}
          >
            ▲
          </button>
          <button
            type="button"
            className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 py-2"
            onClick={() => requestDirection({ x: -1, y: 0 })}
          >
            ◀
          </button>
          <button
            type="button"
            className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 py-2"
            onClick={() => requestDirection({ x: 0, y: 1 })}
          >
            ▼
          </button>
          <button
            type="button"
            className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 py-2"
            onClick={() => requestDirection({ x: 1, y: 0 })}
          >
            ▶
          </button>
          <button
            type="button"
            className="col-span-3 rounded-xl border border-yellow-500/30 bg-yellow-500/10 py-2 text-sm uppercase tracking-[0.2em]"
            onClick={togglePause}
          >
            {status === "paused" ? "Resume" : "Pause"}
          </button>
        </div>
      </div>
    </section>
  );
}

export default PacmanGame;
