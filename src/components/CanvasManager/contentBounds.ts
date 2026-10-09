/************************************************************************
 *    Copyright (C) 2026 Code Forge Temple                              *
 *    This file is part of circuit-sketcher-core project                *
 *    Licensed under the GNU General Public License v3.0.               *
 *    See the LICENSE file in the project root for more information.    *
 ************************************************************************/

export type Bounds = {minX: number; minY: number; maxX: number; maxY: number};

/* The box around everything drawn on a draw2d canvas - figures with their children (labels)
 * and the wires' vertices - in canvas units. Null for an empty canvas.
 */
export const contentBounds = (canvas: any): Bounds | null => {
    let minX = NaN, minY = NaN, maxX = NaN, maxY = NaN;

    const add = (x: number, y: number, width: number = 0, height: number = 0) => {
        minX = !isNaN(minX) ? Math.min(minX, x) : x;
        minY = !isNaN(minY) ? Math.min(minY, y) : y;
        maxX = !isNaN(maxX) ? Math.max(maxX, x + width) : x + width;
        maxY = !isNaN(maxY) ? Math.max(maxY, y + height) : y + height;
    };

    canvas.getFigures().each((_i: number, figure: any) => {
        add(figure.getAbsoluteX ? figure.getAbsoluteX() : figure.x, figure.getAbsoluteY ? figure.getAbsoluteY() : figure.y, figure.getWidth(), figure.getHeight());

        if (figure.getChildren && typeof figure.getChildren === "function") {
            figure.getChildren().each((_j: number, child: any) => {
                add(child.getAbsoluteX ? child.getAbsoluteX() : child.x, child.getAbsoluteY ? child.getAbsoluteY() : child.y, child.getWidth(), child.getHeight());
            });
        }
    });

    canvas.getLines().each((_i: number, line: any) => {
        line.getVertices().each((_j: number, vertex: any) => {
            add(vertex.x, vertex.y);
        });
    });

    if (isNaN(minX) || isNaN(minY) || isNaN(maxX) || isNaN(maxY)) return null;

    return {minX, minY, maxX, maxY};
};
