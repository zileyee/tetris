export { tick, show, hide, createSvgElement };

import { Action, State } from "./types";

/**
 * Updates the state by proceeding with one time step.
 *
 * @param s Current state
 * @param action Action to apply to the state
 * @returns Updated state
 */
const tick = (s: State, action: Action) => action.apply(s);

/** Rendering (side effects) */

/**
 * Displays a SVG element on the canvas. Brings to foreground.
 * Caution: This function is impure as it mutate the state of the SVG element.
 * @param elem SVG element to display
 */
const show = (elem: SVGGraphicsElement) => {
  elem.setAttribute("visibility", "visible");
  elem.parentNode!.appendChild(elem);
};

/**
 * Hides a SVG element on the canvas.
 * Caution: This function is impure as it mutate the state of the SVG element.
 * @param elem SVG element to hide
 */
const hide = (elem: SVGGraphicsElement) =>
  elem.setAttribute("visibility", "hidden");

/**
 * Creates an SVG element with the given properties.
 *
 * Caution: This function is impure as it mutate the state of the SVG elements.
 *
 * See https://developer.mozilla.org/en-US/docs/Web/SVG/Element for valid
 * element names and properties.
 *
 * @param namespace Namespace of the SVG element
 * @param name SVGElement name
 * @param props Properties to set on the SVG element
 * @returns SVG element
 */
const createSvgElement = (
  namespace: string | null,
  name: string,
  props: Record<string, string> = {}
) => {
  const elem = document.createElementNS(namespace, name) as SVGElement;
  Object.entries(props).forEach(([k, v]) => elem.setAttribute(k, v));
  return elem;
};
