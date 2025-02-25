export { Viewport, Constants, Block };
export type { Key, State, Action, Grid, Shape };
import { RNG } from "./util";

/** Constants */
const Viewport = {
  CANVAS_WIDTH: 200,
  CANVAS_HEIGHT: 400,
  PREVIEW_WIDTH: 160,
  PREVIEW_HEIGHT: 80,
} as const;

const Constants = {
  TICK_RATE_MS: 500,
  MIN_TICK_RATE_MS: 100,
  TICK_RATE_DECREMENT_MS: 100,
  GRID_WIDTH: 10,
  GRID_HEIGHT: 20,
  STARTING_BLOCK_X: 10 / 2 - 2,
  STARTING_LEVEL: 1,
} as const;

const Block = {
  WIDTH: Viewport.CANVAS_WIDTH / Constants.GRID_WIDTH,
  HEIGHT: Viewport.CANVAS_HEIGHT / Constants.GRID_HEIGHT,
} as const;

/** Types */
type Key = "KeyS" | "KeyA" | "KeyD" | "KeyW" | "KeyR" | "Space";

type Block = Readonly<{
  shape: Shape; // 2D array of 0s and 1s
  color: string;
}>;

type Shape = number[][];

type Grid = string[][];

type State = Readonly<{
  block: Block;
  blockX: number;
  blockY: number;
  grid: Grid;
  nextBlock: Block;
  RNG: RNG;
  score: number;
  level: number;
  highScore: number;
  gameEnd: boolean;
}>;

// Ensures that all class implementing `Action` have an `apply` method
interface Action {
  apply: (s: State) => State;
}
