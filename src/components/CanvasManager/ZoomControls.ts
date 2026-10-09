/************************************************************************
 *    Copyright (C) 2026 Code Forge Temple                              *
 *    This file is part of circuit-sketcher-core project                *
 *    Licensed under the GNU General Public License v3.0.               *
 *    See the LICENSE file in the project root for more information.    *
 ************************************************************************/

import "./ZoomControls.scss";

const ICON = (shape: string) => `<svg viewBox="0 0 24 24" aria-hidden="true">${shape}</svg>`;

const ICONS = {
    zoomIn: ICON(`<path d="M6 12H18M12 6V18"/>`),
    zoomOut: ICON(`<path d="M6 12H18"/>`),
    reset: ICON(`<rect x="5" y="5" width="14" height="14" rx="1.5"/>`),
};

export type ZoomActions = {
    zoomIn: () => void;
    zoomOut: () => void;
    reset: () => void;
    wheel: (event: WheelEvent) => void;
};

export type ZoomLimits = {
    canZoomIn: boolean;
    canZoomOut: boolean;
};

export type ZoomControls = {
    update: (limits: ZoomLimits) => void;
    remove: () => void;
};

/* The + / - / reset-and-center stack in the bottom right corner of the canvas. It goes next to the canvas
 * element rather than in it: draw2d would take clicks on it for clicks on the circuit, and the
 * png export copies whatever is inside the canvas element.
 */
export const createZoomControls = (canvasElement: HTMLElement, actions: ZoomActions): ZoomControls | null => {
    const host = canvasElement.parentElement;

    if (!host) return null;

    // the stack is placed in the host's corner
    if (getComputedStyle(host).position === "static") {
        host.style.position = "relative";
    }

    const stack = document.createElement("div");

    stack.className = "circuit-sketcher-zoom-controls";

    const button = (label: string, icon: string, action: () => void) => {
        const element = document.createElement("button");

        element.type = "button";
        element.className = "circuit-sketcher-zoom-button";
        element.setAttribute("aria-label", label);
        element.innerHTML = icon;
        element.addEventListener("click", action);

        stack.appendChild(element);

        return element;
    };

    const zoomIn = button("Zoom in", ICONS.zoomIn, actions.zoomIn);
    const zoomOut = button("Zoom out", ICONS.zoomOut, actions.zoomOut);
    // always available: even at 100% the circuit may be off-center
    button("Reset zoom and center", ICONS.reset, actions.reset);

    // the wheel zooms over the stack as it does over the circuit
    stack.addEventListener("wheel", actions.wheel, {passive: false});
    stack.addEventListener("contextmenu", (event) => event.preventDefault());

    host.appendChild(stack);

    return {
        update: ({canZoomIn, canZoomOut}) => {
            zoomIn.disabled = !canZoomIn;
            zoomOut.disabled = !canZoomOut;
        },
        remove: () => {
            stack.remove();
        },
    };
};
