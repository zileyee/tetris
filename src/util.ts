export { randomBlock, rotateMatrix, RNG };

import { Block, Shape } from "./types";

// RNG class is obtained and modified from Week4's Tutorial Code Bundle
// This RNG mechanism is based on Linear Conrguential Generator (LCG)
class RNG {
  static m = 0x80000000;
  static a = 1103515245;
  static c = 12345;
  readonly seed: number;

  // Constructor initializes the RNG with an optional seed.
  // If no seed is provided, it defaults to the current milliseconds.
  constructor(seed?: number) {
    if (seed !== undefined) {
      this.seed = seed;
    } else {
      // This function is impure as it uses Date().getMilliseconds()
      // It is impure as it returns a different value each time it is called
      this.seed = RNG.hash(new Date().getMilliseconds());
    }
  }

  static hash(seed: number) {
    return (RNG.a * seed + RNG.c) % RNG.m;
  }

  // Scale function maps the random hash to a range [0, 6]
  static scale(hash: number) {
    return Math.floor((7 * hash) / (RNG.m - 1));
  }

  // `next` function returns a new RNG instance with a new seed.
  // This is to ensure that this function is pure and 
  // does not mutate the current RNG instance.
  next(): RNG {
    const newSeed = RNG.hash(this.seed);
    return new RNG(newSeed);
  }

  currentValue(): number {
    return RNG.scale(this.seed);
  }
}

// Definition of the 7 standard Tetris shapes
const shapes = [
  {
    shape: [
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    color: "cyan",
  },
  {
    shape: [
      [1, 1],
      [1, 1],
    ],
    color: "yellow",
  },
  {
    shape: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    color: "purple",
  },
  {
    shape: [
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    color: "orange",
  },
  {
    shape: [
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 0],
    ],
    color: "blue",
  },
  {
    shape: [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0],
    ],
    color: "red",
  },
  {
    shape: [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0],
    ],
    color: "green",
  },
];

// Produces a random Tetris block using the provided RNG instance and
// returns the block along with the next RNG instance.
const randomBlock = (rng: RNG): [Block, RNG] => {
  const block = shapes[rng.currentValue()];
  const newRNG = rng.next(); // Get the next RNG instance
  return [block, newRNG];
};

// `createRotationFunction` returns a rotation function 
// based on the provided rotation strategy.
// The curried style allows flexibility in swapping out 
// different rotation algorithms in the future if necessary.
const createRotationFunction =
  (rotationStrategy: (matrix: Shape) => Shape) =>
  (matrix: Shape): Shape =>
    rotationStrategy(matrix);

// `defaultRotationStrategy` implements the standard matrix rotation logic 
// for rotating Tetrominos
const defaultRotationStrategy = (matrix: Shape) => {
  const N = matrix.length - 1;
  return matrix.map((row, i) => row.map((_, j) => matrix[N - j][i]));
};

const rotateMatrix = createRotationFunction(defaultRotationStrategy);
