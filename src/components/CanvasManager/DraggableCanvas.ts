/************************************************************************
 *    Copyright (C) 2024 Code Forge Temple                              *
 *    This file is part of circuit-sketcher-core project                *
 *    Licensed under the GNU General Public License v3.0.               *
 *    See the LICENSE file in the project root for more information.    *
 ************************************************************************/

import "./DraggableCanvas.scss";

const PANNING_CLASS = "circuit-sketcher-panning";

type Viewport = {
    /* viewBox units per screen pixel (draw2d maps a viewBox of initialWidth * zoomFactor
     * onto an svg of initialWidth, so one screen pixel is zoomFactor units) */
    zoom: number;
    width: number;
    height: number;
};

/* Panning is a rigid translation: every figure moves by the same delta, so no port,
 * route or label has to be recomputed - only the visible window over the scene changes.
 * During the pan we therefore just shift the svg viewBox (one attribute write per frame,
 * whatever the circuit size) and apply the accumulated delta to the model once, on drop.
 */
export abstract class DraggableCanvas {
    protected abstract canvasElement: HTMLElement;
    private isDragging: boolean = false;
    private startX: number = 0;
    private startY: number = 0;
    private totalDx: number = 0;
    private totalDy: number = 0;
    private viewport: Viewport = {zoom: 1, width: 0, height: 0};
    private rafId: number | null = null;

    protected abstract getCanvas (): any;
    protected abstract onDragFinish(): Promise<void>;

    protected addDragEventListeners () {
        this.canvasElement.addEventListener('mousedown', this.onMouseDown, {passive: true});

        /* mousemove/mouseup sit on the window so a pan that ends outside the canvas
         * still gets finalized instead of leaving the canvas stuck in dragging state */
        window.addEventListener('mousemove', this.onMouseMove, {passive: true});
        window.addEventListener('mouseup', this.onMouseUp, {passive: true});
        window.addEventListener('blur', this.onWindowBlur);
    }

    protected removeDragEventListeners () {
        this.cancelPendingFrame();

        this.canvasElement.removeEventListener('mousedown', this.onMouseDown);
        window.removeEventListener('mousemove', this.onMouseMove);
        window.removeEventListener('mouseup', this.onMouseUp);
        window.removeEventListener('blur', this.onWindowBlur);

        // the canvas can be torn down mid-pan (a reload), so don't leave the cursor behind
        document.documentElement.classList.remove(PANNING_CLASS);

        this.isDragging = false;
    }

    private getPaper = () => this.getCanvas()?.paper;

    private readViewport = (): Viewport => {
        const canvas = this.getCanvas();
        const zoom = canvas.zoomFactor || 1;

        return {
            zoom,
            width: ((canvas.initialWidth || canvas.getWidth()) * zoom) | 0,
            height: ((canvas.initialHeight || canvas.getHeight()) * zoom) | 0,
        };
    }

    /* a zero-sized viewBox would hide the whole canvas, so skip the live feedback
     * rather than risk it - the pan still lands on drop */
    private hasUsableViewport = () => this.viewport.width > 0 && this.viewport.height > 0;

    private setViewBox = (x: number, y: number) => {
        const paper = this.getPaper();

        if (!paper || !this.hasUsableViewport()) return;

        paper.setViewBox(x, y, this.viewport.width, this.viewport.height);
    }

    private requestFrame = () => {
        if (this.rafId !== null) return;

        this.rafId = window.requestAnimationFrame(this.paintFrame);
    }

    private cancelPendingFrame = () => {
        if (this.rafId === null) return;

        window.cancelAnimationFrame(this.rafId);

        this.rafId = null;
    }

    private paintFrame = () => {
        this.rafId = null;

        this.setViewBox(-this.totalDx * this.viewport.zoom, -this.totalDy * this.viewport.zoom);
    }

    private onMouseDown = (event: MouseEvent) => {
        if (event.button !== 1) return; // Middle mouse button

        this.isDragging = true;

        this.startX = event.clientX;
        this.startY = event.clientY;
        this.totalDx = 0;
        this.totalDy = 0;
        this.viewport = this.readViewport();

        this.getCanvas().setCurrentSelection(null);

        document.documentElement.classList.add(PANNING_CLASS);

        /* the figures keep their old coordinates while the viewBox is shifted, so
         * draw2d's hit-testing would be off by the pan delta - switch it off meanwhile */
        const paper = this.getPaper();

        if (paper) {
            paper.canvas.style.pointerEvents = 'none';
        }
    }

    private onMouseMove = (event: MouseEvent) => {
        if (!this.isDragging) return;

        /* accumulated from the origin rather than frame to frame, so coalescing
         * several mousemove events into one frame can't drift */
        this.totalDx = event.clientX - this.startX;
        this.totalDy = event.clientY - this.startY;

        this.requestFrame();
    }

    private onMouseUp = (event: MouseEvent) => {
        if (event.button !== 1) return; // Middle mouse button

        this.finishDrag();
    }

    /* releasing the button outside the document never fires a mouseup, and a pan left
     * unfinished would keep the canvas offset and non-interactive */
    private onWindowBlur = () => {
        this.finishDrag();
    }

    private finishDrag = () => {
        if (!this.isDragging) return;

        this.isDragging = false;

        this.cancelPendingFrame();

        document.documentElement.classList.remove(PANNING_CLASS);

        const paper = this.getPaper();

        if (paper) {
            paper.canvas.style.pointerEvents = '';
        }

        this.setViewBox(0, 0);

        const deltaX = this.totalDx * this.viewport.zoom;
        const deltaY = this.totalDy * this.viewport.zoom;

        this.totalDx = 0;
        this.totalDy = 0;

        // a middle click without an actual pan shouldn't move or dirty the canvas
        if (deltaX === 0 && deltaY === 0) return;

        this.translateCanvasContent(deltaX, deltaY);

        this.onDragFinish();
    }

    private translateCanvasContent = (deltaX: number, deltaY: number) => {
        const canvas = this.getCanvas();

        canvas.getFigures().each((_i:number, figure: any) => {
            figure.x += deltaX;
            figure.y += deltaY;

            figure.repaint();

            figure.getPorts().each((_i:number, port: any) => {
                port.repaint();
            });
        });

        canvas.getLines().each((_i:number, line: any) => {
            line.lineSegments.each((_j:number, segment: any) => {
                segment.start.x += deltaX;
                segment.start.y += deltaY;
            });

            line.svgPathString = null; // Reset the path string to force a repaint of the line
            line.repaint();
        });
    }
}
