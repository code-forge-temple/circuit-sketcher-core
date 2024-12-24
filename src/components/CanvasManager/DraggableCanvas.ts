/************************************************************************
 *    Copyright (C) 2024 Code Forge Temple                              *
 *    This file is part of circuit-sketcher-core project                *
 *    Licensed under the GNU General Public License v3.0.               *
 *    See the LICENSE file in the project root for more information.    *
 ************************************************************************/

export abstract class DraggableCanvas {
    protected abstract canvasElement: HTMLElement;
    private isDragging: boolean = false;
    private startX: number = 0;
    private startY: number = 0;

    protected abstract getCanvas (): any;
    protected abstract onDragFinish(): Promise<void>;

    protected addDragEventListeners () {
        this.canvasElement.addEventListener('mousedown', this.onMouseDown, {passive: true});
        this.canvasElement.addEventListener('mousemove', this.onMouseMove, {passive: true});
        this.canvasElement.addEventListener('mouseup', this.onMouseUp, {passive: true});
    }

    protected removeDragEventListeners () {
        this.canvasElement.removeEventListener('mousedown', this.onMouseDown);
        this.canvasElement.removeEventListener('mousemove', this.onMouseMove);
        this.canvasElement.removeEventListener('mouseup', this.onMouseUp);
    }

    private onMouseDown = (event: MouseEvent) => {
        if (event.button === 1) { // Middle mouse button
            this.isDragging = true;

            this.startX = event.clientX;
            this.startY = event.clientY;

            this.getCanvas().setCurrentSelection(null);

            this.canvasElement.style.cursor = 'grabbing';
        }
    }

    private onMouseMove = (event: MouseEvent) => {
        if (this.isDragging) {
            const deltaX = event.clientX - this.startX;
            const deltaY = event.clientY - this.startY;

            this.getCanvas().getFigures().each((_i:number, figure: any) => {
                figure.x += deltaX;
                figure.y += deltaY;

                figure.repaint();

                figure.getPorts().each((_i:number, port: any) => {
                    port.repaint();
                });
            });

            this.getCanvas().getLines().each((_i:number, line: any) => {
                line.lineSegments.each((_j:number, segment: any) => {
                    segment.start.x += deltaX;
                    segment.start.y += deltaY;
                });

                line.svgPathString = null; // Reset the path string to force a repaint of the line
                line.repaint();

            });

            this.startX = event.clientX;
            this.startY = event.clientY;
        }
    }

    private onMouseUp = (event: MouseEvent) => {
        if (event.button === 1) { // Middle mouse button
            this.isDragging = false;

            this.canvasElement.style.cursor = 'default';
            this.onDragFinish();
        }
    }
}