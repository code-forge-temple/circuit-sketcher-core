/************************************************************************
 *    Copyright (C) 2026 Code Forge Temple                              *
 *    This file is part of circuit-sketcher-core project                *
 *    Licensed under the GNU General Public License v3.0.               *
 *    See the LICENSE file in the project root for more information.    *
 ************************************************************************/
export type Bounds = {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
};
export declare const contentBounds: (canvas: any) => Bounds | null;
