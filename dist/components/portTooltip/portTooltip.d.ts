/************************************************************************
 *    Copyright (C) 2024 Code Forge Temple                              *
 *    This file is part of circuit-sketcher-core project                *
 *    Licensed under the GNU General Public License v3.0.               *
 *    See the LICENSE file in the project root for more information.    *
 ************************************************************************/
import { Coords } from "../types";
import "./portTooltip.scss";
export declare const hidePortTooltip: () => void;
/** Hides straight away, for cases where no follow-up hover is expected (drag, pan, menu). */
export declare const hidePortTooltipNow: () => void;
/**
 * @param anchor viewport coordinates of the port the tooltip describes
 */
export declare const showPortTooltip: (text: string, anchor: Coords) => void;
