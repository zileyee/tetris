import "./style.css";

import { fromEvent, interval, merge, BehaviorSubject } from "rxjs";
import {
  map,
  filter,
  scan,
  debounceTime,
  switchMap,
  distinctUntilChanged,
} from "rxjs/operators";
import { Constants, Viewport, Key, State, Block } from "./types";
import { Move, Rotate, Restart, initialState, Drop } from "./state";
import { createSvgElement, show, hide, tick } from "./view";

// The `main` function serves as the entry point of the game. 
// It sets up the game environment,
// initializes game elements and starts the game loop.
export function main() {
  // Canvas elements
  const svg = document.querySelector("#svgCanvas") as SVGGraphicsElement &
    HTMLElement;
  const preview = document.querySelector("#svgPreview") as SVGGraphicsElement &
    HTMLElement;
  const gameover = document.querySelector("#gameOver") as SVGGraphicsElement &
    HTMLElement;

  svg.setAttribute("height", `${Viewport.CANVAS_HEIGHT}`);
  svg.setAttribute("width", `${Viewport.CANVAS_WIDTH}`);
  preview.setAttribute("height", `${Viewport.PREVIEW_HEIGHT}`);
  preview.setAttribute("width", `${Viewport.PREVIEW_WIDTH}`);

  // Text fields
  const levelText = document.querySelector("#levelText") as HTMLElement;
  const scoreText = document.querySelector("#scoreText") as HTMLElement;
  const highScoreText = document.querySelector("#highScoreText") as HTMLElement;

  /** User input */
  const key$ = fromEvent<KeyboardEvent>(document, "keypress");

  // `fromKey` function creates an observable stream 
  // from key press events of a particular key code.
  // It is used to map game controls to specific keys.
  const fromKey = (keyCode: Key) =>
    key$.pipe(filter(({ code }) => code === keyCode));

  // Observable streams for game controls using respective keys.
  // `debounceTime` is used here to avoid unintentionally continuously triggering of W key.
  // I have decided to use one Move class to implement all the blocks movement 
  // instead of having four separates classes.
  // In my opinion, this is more manageable and easier to follow logically.
  const left$ = fromKey("KeyA").pipe(map(() => new Move("x", -1)));
  const right$ = fromKey("KeyD").pipe(map(() => new Move("x", 1)));
  const down$ = fromKey("KeyS").pipe(map(() => new Move("y", 1)));
  const rotate$ = fromKey("KeyW").pipe(
    debounceTime(50),
    map(() => new Rotate())
  );
  const restart$ = fromKey("KeyR").pipe(map(() => new Restart()));
  const drop$ = fromKey("Space").pipe(map(() => new Drop()));

  // Instead of having a BehaviorSubject<State> only,
  // we can create a factory function to create subjects 
  // of any type using generic type.
  function createStateSubject<T>(initial: T): BehaviorSubject<T> {
    return new BehaviorSubject<T>(initial);
  }

  // `state$` is a BehaviorSubject that represents the current game state.
  // It allows for both subscription and emission of new states.
  const state$ = createStateSubject<State>(initialState);

  // `tick$` determines the interval at which the game should "tick" or progress
  // based on the current game level.
  const tick$ = state$.pipe(
    map((state) => {
      return state.level * Constants.TICK_RATE_DECREMENT_MS >=
        Constants.TICK_RATE_MS
        ? Constants.MIN_TICK_RATE_MS
        : Constants.TICK_RATE_MS -
            state.level * Constants.TICK_RATE_DECREMENT_MS;
    }),
    // distinctUntilChanged operator ensures that 
    // the tick rate is only updated when it changes
    distinctUntilChanged(),
    // switchMap operator allows for the interval to be updated 
    // without completing moves at the old rate
    switchMap((rate) => interval(rate).pipe(map(() => new Move("y", 1))))
  );

  /**
   * Renders the current state to the canvas.
   *
   * In MVC terms, this updates the View using the Model.
   *
   * Most of the side effects of this program are contained within this function.
   *
   * @param s Current state
   */
  const render = (s: State) => {
    // Replace the contents of the SVG elements
    replaceChildren(svg, createSvgChildren(s));
    replaceChildren(preview, createPreviewChildren(s.nextBlock));

    // Update score and level text fields
    // Side effects: updating the DOM
    scoreText.textContent = `${s.score}`;
    levelText.textContent = `${s.level}`;
    highScoreText.textContent = `${s.highScore}`;

    // Show the game over text if the game has ended
    // Side effects: modifying the visibility of `gameover` element
    if (s.gameEnd) {
      show(gameover);
    } else {
      hide(gameover);
    }
  };

  // `replaceChildren` is a utility function that 
  // replaces all children of a given DOM element
  // with a new set of child elements.
  // Side effects: updating the DOM
  const replaceChildren = (parent: HTMLElement, newChildren: Node[]) => {
    // Remove all existing children
    Array.from(parent.childNodes).forEach((child) => parent.removeChild(child));
    // Append new children
    newChildren.forEach((child) => parent.appendChild(child));
  };

  // `createRect` is a higher-order function that 
  // returns a function to create SVG rectangle elements.
  const createRect =
    (namespace: string) =>
    (attributes: Record<string, string> = {}) =>
      createSvgElement(namespace, "rect", attributes);

  // `createSvgChildren` creates a set of SVG elements 
  // that represent the game state,
  // including the grid, active block, and game over text if applicable.
  // Side effects: updating the DOM
  const createSvgChildren = (s: State) => {
    const children: Node[] = [];

    children.push(gameover);

    // To display the grid which is the static game state
    s.grid.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell) {
          const svgRect = createRect(svg.namespaceURI!);
          const rect = svgRect({
            height: `${Block.HEIGHT}`,
            width: `${Block.WIDTH}`,
            x: `${x * Block.WIDTH}`,
            y: `${y * Block.HEIGHT}`,
            style: `fill: ${cell}`,
          });
          children.push(rect);
        }
      });
    });

    // To display the active block which is currently still falling
    const { block, blockX, blockY } = s;
    block.shape.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell) {
          const svgRect = createRect(svg.namespaceURI!);
          const rect = svgRect({
            height: `${Block.HEIGHT}`,
            width: `${Block.WIDTH}`,
            x: `${(blockX + x) * Block.WIDTH}`,
            y: `${(blockY + y) * Block.HEIGHT}`,
            style: `fill: ${block.color}`,
          });
          children.push(rect);
        }
      });
    });

    // To display the restart text when the game ends
    if (s.gameEnd) {
      const text = createSvgElement(svg.namespaceURI, "text", {
        x: `${Viewport.CANVAS_WIDTH / 2}`,
        y: `${Viewport.CANVAS_HEIGHT / 2}`,
        "text-anchor": "middle",
        style: `fill: white; font-size: 20px`,
      });
      text.textContent = "Press 'R' to restart";
      children.push(text);
    }

    return children;
  };

  // `createPreviewChildren` generates SVG elements 
  // to display a preview of the next block.
  // Side effects: updating the DOM
  const createPreviewChildren = (nextBlock: Block) => {
    const children: Node[] = [];

    // Calculate the position of the block in the preview
    const previewCenterX = Viewport.PREVIEW_WIDTH / 2;
    const previewCenterY = Viewport.PREVIEW_HEIGHT / 2;
    const nextBlockCenterX = (nextBlock.shape[0].length * Block.WIDTH) / 2 / 2;
    const nextBlockCenterY = (nextBlock.shape.length * Block.HEIGHT) / 2 / 2;
    const offsetX = previewCenterX - nextBlockCenterX;
    const offsetY = previewCenterY - nextBlockCenterY;

    // To display the preview block
    nextBlock.shape.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell) {
          const previewRect = createRect(preview.namespaceURI!);
          const rect = previewRect({
            height: `${Block.HEIGHT / 2}`,
            width: `${Block.WIDTH / 2}`,
            x: `${(x * Block.WIDTH) / 2 + offsetX}`,
            y: `${(y * Block.HEIGHT) / 2 + offsetY}`,
            style: `fill: ${nextBlock.color}`,
          });
          children.push(rect);
        }
      });
    });

    return children;
  };

  // Combining all game actions into a single observable stream 
  // and updating the game state accordingly.
  // The side effects of `render` are taking place here.
  const source$ = merge(tick$, left$, right$, down$, rotate$, restart$, drop$)
    .pipe(scan(tick, initialState))
    .subscribe((s: State) => {
      state$.next(s);
      render(s);
    });
}

// The following simply runs your main function on window load.  Make sure to leave it in place.
if (typeof window !== "undefined") {
  window.onload = () => {
    main();
  };
}
