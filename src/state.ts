export { initialState, Move, Restart, Rotate, Drop };

import { Action, State } from "./types";
import { RNG, randomBlock, rotateMatrix } from "./util";
import { Constants, Block, Grid, Shape } from "./types";

/**
 * Determines if the given block at the specified position 
 * will collide with existing blocks or the walls.
 * Collision detection is fundamental in a game like Tetris; 
 * it determines if a move or rotation is legal.
 * @param grid - The current snapshot of the game's grid.
 * @param block - The moving block's shape and color information.
 * @param x - Horizontal position on the grid.
 * @param y - Vertical position on the grid.
 * @returns true if a collision is detected, false otherwise.
 */
const isCollision = (grid: Grid, block: Block, x: number, y: number): boolean =>
  block.shape.some((row, rowIdx) =>
    row.some((cell, cellIdx) => {
      if (!cell) return false;
      const gridX = x + cellIdx;
      const gridY = y + rowIdx;
      return (
        gridX < 0 ||
        gridX >= Constants.GRID_WIDTH ||
        gridY < 0 ||
        gridY >= Constants.GRID_HEIGHT ||
        grid[gridY][gridX]
      );
    })
  );

/**
 * Update logic to merge the block's shape with the grid. 
 * This encapsulates the logic that "burns"
 * a block into the grid once it's settled at a location, 
 * ensuring it remains static there.
 * @param block - The block in question.
 * @param x - Horizontal position of the block.
 * @param y - Vertical position of the block.
 * @param rowIdx - Current row being processed.
 * @returns A row-updating function for a map operation.
 */
const updateRow =
  (block: Block, x: number, y: number, rowIdx: number) =>
  (cell: string, cellIdx: number) =>
    block.shape[rowIdx - y]?.[cellIdx - x] ? block.color : cell;

/**
 * Utilizes the updateRow logic to process 
 * and update the entire grid.
 * This operation is typically executed once a block 
 * has finished its downward journey, and needs
 * to be merged into the static game state.
 */
const updateGrid = (grid: Grid, block: Block, x: number, y: number): Grid =>
  grid.map((row, rowIdx) => row.map(updateRow(block, x, y, rowIdx)));

// Initialize the initial RNG without a seed value 
// so that it's taking the value of Date().getMilliseconds()
// Impure as the constructor of RNG is using 
// Date().getMilliseconds() which is impure.
const initial_RNG = new RNG();

/**
 * The foundation of the game's state. 
 * It sets the board's dimensions, starting conditions,
 * and other essential parameters. Notice that blocks are randomized, 
 * adding unpredictability to the game.
 */
const initialState: State = {
  block: randomBlock(initial_RNG)[0],
  nextBlock: randomBlock(randomBlock(initial_RNG)[1])[0],
  blockX: Constants.STARTING_BLOCK_X,
  blockY: 0,
  RNG: randomBlock(randomBlock(initial_RNG)[1])[1],
  grid: Array.from({ length: Constants.GRID_HEIGHT }, () =>
    Array(Constants.GRID_WIDTH).fill(null)
  ),
  score: 0,
  level: Constants.STARTING_LEVEL,
  highScore: 0,
  gameEnd: false,
} as const;

/**
 * moveBlock: Computes the new position of the block after a movement action.
 *
 * @param {State} s - Current game state.
 * @param {"x" | "y"} direction - Direction to move: "x" for horizontal, 
 *                                                   "y" for vertical.
 * @param {number} magnitude - Units to move the block.
 * @returns New x and y coordinates of the block.
 */
function moveBlock(
  s: State,
  direction: "x" | "y",
  magnitude: number
): { newBlockX: number; newBlockY: number } {
  const newBlockX = s.blockX + (direction === "x" ? magnitude : 0);
  const newBlockY = s.blockY + (direction === "y" ? magnitude : 0);
  return { newBlockX, newBlockY };
}

/**
 * isGameEnd: Checks for game-over condition.
 *
 * @param {Grid} grid - Current game grid.
 * @returns True if top row of grid has any filled cells, otherwise false.
 */
function isGameEnd(grid: Grid): boolean {
  return grid[0].some((cell) => cell);
}

/**
 * linesCleared: Determines indices of fully filled rows.
 *
 * @param {Grid} grid - Current game grid.
 * @returns Indices of fully filled rows.
 */
function linesCleared(grid: Grid): number[] {
  return grid.reduce<number[]>(
    (acc, row, index) => (row.every((cell) => cell) ? [...acc, index] : acc),
    []
  );
}

/**
 * updateGridAfterClearance: Removes cleared lines and adds new empty ones.
 *
 * @param {Grid} grid - Current game grid.
 * @param {number[]} clearedLines - Indices of rows to be cleared.
 * @returns Updated game grid post clearance.
 */
function updateGridAfterClearance(grid: Grid, clearedLines: number[]): Grid {
  const newGrid = [...grid];
  clearedLines.forEach((y) => {
    newGrid.splice(y, 1);
    newGrid.unshift(Array(Constants.GRID_WIDTH).fill(null));
  });
  return newGrid;
}

/**
 * scoreUpdates: Calculates updated score, level, and high score.
 *
 * @param {State} s - Current game state.
 * @param {number} clearedLineCount - Count of cleared lines.
 * @returns Updated score, level, and high score.
 */
function scoreUpdates(
  s: State,
  clearedLineCount: number
): { newScore: number; newLevel: number; newHighScore: number } {
  const newScore = s.score + clearedLineCount * 100;
  const newLevel = Math.floor(newScore / 1000) + 1;
  const newHighScore = Math.max(newScore, s.highScore);
  return { newScore, newLevel, newHighScore };
}

/**
 * Represents a movement action in the game. 
 * Movement is an atomic operation that advances the game's state by one step.
 * This class is designed to handle both 
 * horizontal (x) and vertical (y) motions.
 */
class Move implements Action {
  constructor(
    public readonly direction: "x" | "y",
    public readonly magnitude: number
  ) {}

  /**
   * When a block moves, several checks and decisions happen:
   * 1. Can the block move in the desired direction without collisions?
   * 2. If it collides while moving down, finalize its position on the grid, 
   * and possibly clear lines or end the game.
   */
  apply = (s: State): State => {
    const { newBlockX, newBlockY } = moveBlock(
      s,
      this.direction,
      this.magnitude
    );

    if (isCollision(s.grid, s.block, newBlockX, newBlockY)) {
      if (this.direction === "y" && this.magnitude > 0) {
        const newGrid = updateGrid(s.grid, s.block, s.blockX, s.blockY);

        if (isGameEnd(newGrid)) {
          return { ...s, gameEnd: true };
        }

        const clearedLines = linesCleared(newGrid);
        const updatedGrid = updateGridAfterClearance(newGrid, clearedLines);
        const { newScore, newLevel, newHighScore } = scoreUpdates(
          s,
          clearedLines.length
        );

        return { //returning a new state object after collision
          ...s,
          block: s.nextBlock,
          nextBlock: randomBlock(s.RNG)[0],
          blockX: Constants.STARTING_BLOCK_X,
          blockY: 0,
          RNG: randomBlock(s.RNG)[1],
          grid: updatedGrid,
          score: newScore,
          level: newLevel,
          highScore: newHighScore,
        };
      }
      return s;
    }

    return { //returning a new state object without collision
      ...s,
      blockX: newBlockX,
      blockY: newBlockY,
    };
  };
}

/**
 * Resets the game state, allowing players to start afresh.
 * It keeps the high score intact
 * to preserve player's high score across game sessions and also the RNG.
 */
class Restart implements Action {
  apply = (s: State): State => {
    return {
      ...initialState,
      RNG: randomBlock(s.RNG)[1],
      highScore: s.highScore,
    };
  };
}

/**
 * Additional feature `wallkick` is introduced here.
 * When a piece rotates near a wall or other blocks,
 * it might need to shift slightly to fit.
 * It adjusts the block's position post-rotation 
 * to fit within the game constraints.
 */
function updateState(
  s: State,
  rotatedBlock: Shape,
  deltaX: number,
  deltaY: number
): State {
  return {
    ...s,
    block: {
      ...s.block,
      shape: rotatedBlock,
    },
    blockX: s.blockX + deltaX,
    blockY: s.blockY + deltaY,
  };
}

// Attempts to rotate a block in a game grid.
// It checks if the rotated block results in a collision.
function tryRotate(
  s: State,
  rotatedBlock: Shape,
  deltaX: number,
  deltaY: number
): boolean {
  return !isCollision(
    s.grid,
    { ...s.block, shape: rotatedBlock },
    s.blockX + deltaX,
    s.blockY + deltaY
  );
}

/**
 * Attempts to rotate the block by testing various offsets. 
 * This embodies the "wall kick" logic of Tetris, where
 * the game tries several alternative positions to make a rotation fit.
 */
const tryRotationOffsets = (
  s: State,
  rotatedBlock: Shape,
  offsets: { x: number; y: number }[]
): { x: number; y: number } | null => {
  const validOffset = offsets.find((offset) =>
    tryRotate(s, rotatedBlock, offset.x, offset.y)
  );
  return validOffset || null;
};

/**
 * Rotating blocks is a core aspect of Tetris gameplay. 
 * This action ensures that the player can rotate blocks,
 * but with the constraints of the game grid and other settled blocks. 
 * The system tries multiple positions to see if a rotation is feasible, 
 * reflecting the wall kick mechanics of Tetris rotations.
 * The rotation system is based on the 
 * Super Rotation System (SRS) used in modern Tetris games.
 */
class Rotate implements Action {
  apply = (s: State): State => {
    const rotatedBlock = rotateMatrix(s.block.shape);
    const offsets = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ];

    const validOffset = tryRotationOffsets(s, rotatedBlock, offsets);

    return validOffset
      ? updateState(s, rotatedBlock, validOffset.x, validOffset.y)
      : s;
  };
}

/**
 * An action that drops the block to the lowest possible position 
 * without any collision.
 * It uses recursion checks to find the optimal landing position.
 */
class Drop implements Action {
  apply = (s: State): State => {
    const newY = this.findNewY(s.grid, s.block, s.blockX, s.blockY);
    return new Move("y", newY - s.blockY).apply(s);
  };

  private findNewY = (
    grid: Grid,
    block: Block,
    blockX: number,
    blockY: number
  ): number => {
    if (isCollision(grid, block, blockX, blockY + 1)) {
      return blockY;
    }
    return this.findNewY(grid, block, blockX, blockY + 1);
  };
}
