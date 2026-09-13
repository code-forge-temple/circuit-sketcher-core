/************************************************************************
 *    Copyright (C) 2024 Code Forge Temple                              *
 *    This file is part of circuit-sketcher-core project                *
 *    Licensed under the GNU General Public License v3.0.               *
 *    See the LICENSE file in the project root for more information.    *
 ************************************************************************/

import {Coords} from "../types";
import "./portTooltip.scss";

const TOOLTIP_CLASS = "circuit-sketcher-core port-tooltip";
const TOOLTIP_VISIBLE_CLASS = "port-tooltip-visible";
const PORT_GAP = 10;
const VIEWPORT_MARGIN = 4;

/* A port and its label are two separate hit targets, so crossing between them fires a
 * leave immediately followed by an enter. Deferring the hide by a frame or two lets the
 * incoming enter cancel it, which keeps the tooltip steady instead of blinking.
 */
const HIDE_DELAY_MS = 60;

let tooltip: HTMLElement | null = null;
let hideTimeout: number | null = null;

const cancelPendingHide = () => {
    if (hideTimeout === null) return;

    window.clearTimeout(hideTimeout);

    hideTimeout = null;
};

/* The tooltip is a plain DOM node rather than a draw2d figure on purpose: figures are
 * model state and would end up serialized into the saved circuit.
 */
const getTooltip = (): HTMLElement => {
    if (tooltip?.isConnected) return tooltip;

    tooltip = document.createElement("div");
    tooltip.className = TOOLTIP_CLASS;

    document.body.appendChild(tooltip);

    return tooltip;
};

export const hidePortTooltip = () => {
    cancelPendingHide();

    hideTimeout = window.setTimeout(() => {
        hideTimeout = null;

        tooltip?.classList.remove(TOOLTIP_VISIBLE_CLASS);
    }, HIDE_DELAY_MS);
};

/** Hides straight away, for cases where no follow-up hover is expected (drag, pan, menu). */
export const hidePortTooltipNow = () => {
    cancelPendingHide();

    tooltip?.classList.remove(TOOLTIP_VISIBLE_CLASS);
};

/**
 * @param anchor viewport coordinates of the port the tooltip describes
 */
export const showPortTooltip = (text: string, anchor: Coords) => {
    cancelPendingHide();

    const element = getTooltip();

    element.textContent = text;
    element.classList.add(TOOLTIP_VISIBLE_CLASS);

    const {width, height} = element.getBoundingClientRect();

    // centred over the port, above it, and flipped below when there is no room
    let left = anchor.x - width / 2;
    let top = anchor.y - height - PORT_GAP;

    if (top < VIEWPORT_MARGIN) {
        top = anchor.y + PORT_GAP;
    }

    left = Math.max(VIEWPORT_MARGIN, Math.min(left, window.innerWidth - width - VIEWPORT_MARGIN));

    element.style.left = `${left}px`;
    element.style.top = `${top}px`;
};

/* Any press means the user is panning, dragging or opening a menu - in each case the
 * tooltip has outlived its usefulness and draw2d may not deliver a mouseleave.
 */
document.addEventListener("mousedown", hidePortTooltipNow, {capture: true, passive: true});
