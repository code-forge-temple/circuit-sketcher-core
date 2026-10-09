/************************************************************************
 *    Copyright (C) 2024 Code Forge Temple                              *
 *    This file is part of circuit-sketcher-core project                *
 *    Licensed under the GNU General Public License v3.0.               *
 *    See the LICENSE file in the project root for more information.    *
 ************************************************************************/

import draw2d from "draw2d";
import "./DraggableCanvas.scss";
import {createZoomControls, ZoomControls} from "./ZoomControls";
import {contentBounds} from "./contentBounds";

const PANNING_CLASS = "circuit-sketcher-panning";

/* draw2d's zoomFactor is canvas units per screen pixel: below 1 is zoomed in, above 1 zoomed out */
const ZOOM_MIN = 0.25;
const ZOOM_MAX = 4;
// per wheel delta pixel - a mouse wheel notch (about 100) zooms by about 16%
const WHEEL_ZOOM_SPEED = 0.0015;
// a trackpad pinch arrives as ctrl + wheel, in much smaller deltas
const PINCH_ZOOM_SPEED = 0.01;
// a zoom is applied to the circuit this long after the wheel last turned (or a zoom button was last clicked)
const ZOOM_SETTLE_MS = 300;
// one click of the + / - buttons
const BUTTON_ZOOM_STEP = 1.25;
// zoom factors (and view shifts, in canvas units) this close count as equal
const ZOOM_EPSILON = 1e-6;
const WHEEL_LINE_PX = 16;

type Viewport = {
    /* viewBox units per screen pixel (draw2d maps a viewBox of initialWidth * zoomFactor
     * onto an svg of initialWidth, so one screen pixel is zoomFactor units) */
    zoom: number;
    width: number;
    height: number;
};

type ZoomInProgress = {
    // the zoom factor it started from (the circuit's own until the zoom is applied)
    from: number;
    zoom: number;
    // where the viewBox starts, in the circuit's coordinates as they were when the zoom began
    originX: number;
    originY: number;
    // the svg's size in screen pixels
    width: number;
    height: number;
};

/* Panning is a rigid translation: every figure moves by the same delta, so no port,
 * route or label has to be recomputed - only the visible window over the scene changes.
 * During the pan we therefore just shift the svg viewBox (one attribute write per frame,
 * whatever the circuit size) and apply the accumulated delta to the model once, on drop.
 *
 * Wheel zoom works the same way: while the wheel turns, only the viewBox changes (keeping
 * the point under the pointer in place); once it settles, the zoom factor is set and the
 * circuit is shifted so that the viewBox starts at 0,0 again - as draw2d expects it to.
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
    private pendingViewBox: [number, number, number, number] | null = null;
    private zoomInProgress: ZoomInProgress | null = null;
    private zoomSettleTimer: number | null = null;
    // the spacing of the canvas element's dotted background at 100% (set by the app's css), 0 if it has none
    private gridSize: number = 0;
    // how far pans and zooms have moved the circuit since the canvas was created, in canvas units
    private gridShiftX: number = 0;
    private gridShiftY: number = 0;
    private zoomControls: ZoomControls | null = null;

    protected abstract getCanvas (): any;
    protected abstract onDragFinish(): Promise<void>;

    protected addDragEventListeners () {
        this.readGrid();

        this.zoomControls = createZoomControls(this.canvasElement, {
            zoomIn: this.zoomIn,
            zoomOut: this.zoomOut,
            reset: this.resetView,
            wheel: this.onWheel,
        });
        this.updateZoomControls(this.getCanvas()?.zoomFactor || 1);

        // not passive: a middle press would also start the browser's autoscroll, scrolling the page under the pan
        this.canvasElement.addEventListener('mousedown', this.onMouseDown);

        /* a click while a zoom is still settling: apply it first, or draw2d would place the
         * click with the coordinates from before the zoom (capture runs before draw2d's handler) */
        this.canvasElement.addEventListener('mousedown', this.applyZoom, {capture: true, passive: true});

        // not passive: the wheel zooms the canvas instead of scrolling the page around it
        this.canvasElement.addEventListener('wheel', this.onWheel, {passive: false});

        // while a zoom settles, draw2d would hover with the coordinates from before it
        this.canvasElement.addEventListener('mousemove', this.holdMouseMoveDuringZoom, {capture: true});

        /* mousemove/mouseup sit on the window so a pan that ends outside the canvas
         * still gets finalized instead of leaving the canvas stuck in dragging state */
        window.addEventListener('mousemove', this.onMouseMove, {passive: true});
        window.addEventListener('mouseup', this.onMouseUp, {passive: true});
        window.addEventListener('blur', this.onWindowBlur);
    }

    protected removeDragEventListeners () {
        this.cancelPendingFrame();
        this.cancelZoomSettle();

        this.canvasElement.removeEventListener('mousedown', this.onMouseDown);
        this.canvasElement.removeEventListener('mousedown', this.applyZoom, {capture: true});
        this.canvasElement.removeEventListener('wheel', this.onWheel);
        this.canvasElement.removeEventListener('mousemove', this.holdMouseMoveDuringZoom, {capture: true});
        window.removeEventListener('mousemove', this.onMouseMove);
        window.removeEventListener('mouseup', this.onMouseUp);
        window.removeEventListener('blur', this.onWindowBlur);

        // the canvas can be torn down mid-pan (a reload), so don't leave the cursor behind
        document.documentElement.classList.remove(PANNING_CLASS);

        this.isDragging = false;
        this.zoomInProgress = null;

        this.clearGrid();

        this.zoomControls?.remove();
        this.zoomControls = null;
    }

    private getPaper = () => this.getCanvas()?.paper;

    /* The dots behind the circuit are the app's css background on the canvas element. They are
     * spaced and shifted with the zoom and the pans, so they stay put relative to the circuit.
     */
    private readGrid = () => {
        this.clearGrid();

        const computed = getComputedStyle(this.canvasElement);
        const size = computed.backgroundImage !== "none" ? parseFloat(computed.backgroundSize) : NaN;

        this.gridSize = size > 0 ? size : 0;
        this.gridShiftX = 0;
        this.gridShiftY = 0;
    }

    private clearGrid = () => {
        this.canvasElement.style.removeProperty("background-size");
        this.canvasElement.style.removeProperty("background-position");
    }

    // originX/Y: where the viewBox starts, in canvas units; zoom: canvas units per screen pixel
    private paintGrid = (originX: number, originY: number, zoom: number) => {
        if (!this.gridSize) return;

        const spacing = this.gridSize / zoom;
        const offset = (shift: number, origin: number) => ((((shift - origin) / zoom) % spacing) + spacing) % spacing;

        this.canvasElement.style.backgroundSize = `${spacing}px ${spacing}px`;
        this.canvasElement.style.backgroundPosition = `${offset(this.gridShiftX, originX)}px ${offset(this.gridShiftY, originY)}px`;
    }

    private readViewport = (): Viewport => {
        const canvas = this.getCanvas();
        const zoom = canvas.zoomFactor || 1;

        return {
            zoom,
            width: (canvas.initialWidth || canvas.getWidth()) * zoom,
            height: (canvas.initialHeight || canvas.getHeight()) * zoom,
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

    // the viewBox is written at most once per frame, however many events came in
    private requestViewBox = (x: number, y: number, width: number, height: number) => {
        this.pendingViewBox = [x, y, width, height];

        if (this.rafId !== null) return;

        this.rafId = window.requestAnimationFrame(this.paintFrame);
    }

    private cancelPendingFrame = () => {
        this.pendingViewBox = null;

        if (this.rafId === null) return;

        window.cancelAnimationFrame(this.rafId);

        this.rafId = null;
    }

    /* Written straight to the svg: Raphael's setViewBox also walks every element on the paper to
     * re-apply its stroke width (for a stroke scaling the draw2d fork has switched off), which made
     * each frame cost as much as the circuit is big. Raphael is told the final viewBox when the pan
     * or zoom ends (setViewBox / applyZoom).
     */
    private paintFrame = () => {
        this.rafId = null;

        const viewBox = this.pendingViewBox;

        this.pendingViewBox = null;

        const paper = this.getPaper();

        if (viewBox && paper) {
            const [x, y, width] = viewBox;

            paper.canvas.setAttribute("viewBox", viewBox.join(" "));
            paper.canvas.setAttribute("preserveAspectRatio", "xMinYMin");

            // the viewBox is the svg's width (in screen pixels) times the zoom
            this.paintGrid(x, y, width / paper.width);
        }
    }

    // stale coordinates must not drive draw2d's hover state while the view is shifted
    private setSvgInteractive = (interactive: boolean) => {
        const paper = this.getPaper();

        if (paper) {
            paper.canvas.style.pointerEvents = interactive ? '' : 'none';
        }
    }

    private onMouseDown = (event: MouseEvent) => {
        if (event.button !== 1) return; // Middle mouse button

        event.preventDefault();

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
        this.setSvgInteractive(false);
    }

    private onMouseMove = (event: MouseEvent) => {
        if (!this.isDragging) return;

        /* accumulated from the origin rather than frame to frame, so coalescing
         * several mousemove events into one frame can't drift */
        this.totalDx = event.clientX - this.startX;
        this.totalDy = event.clientY - this.startY;

        if (this.hasUsableViewport()) {
            this.requestViewBox(-this.totalDx * this.viewport.zoom, -this.totalDy * this.viewport.zoom, this.viewport.width, this.viewport.height);
        }
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

        this.setSvgInteractive(true);

        this.setViewBox(0, 0);

        const deltaX = this.totalDx * this.viewport.zoom;
        const deltaY = this.totalDy * this.viewport.zoom;

        this.totalDx = 0;
        this.totalDy = 0;

        // a middle click without an actual pan shouldn't move or dirty the canvas
        if (deltaX !== 0 || deltaY !== 0) {
            this.translateCanvasContent(deltaX, deltaY);

            this.onDragFinish();
        }

        this.paintGrid(0, 0, this.viewport.zoom);
    }

    private onWheel = (event: WheelEvent) => {
        // the page around the canvas mustn't scroll either way
        event.preventDefault();

        // a pan or a drag works out its moves from where it started, at the zoom it started with
        if (event.buttons !== 0 || !event.deltaY) return;

        const paper = this.getPaper();

        if (!paper) return;

        const svgRect = paper.canvas.getBoundingClientRect();
        const deltaPx = event.deltaY * (event.deltaMode === WheelEvent.DOM_DELTA_LINE ? WHEEL_LINE_PX : event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? svgRect.height : 1);
        const factor = Math.exp(deltaPx * (event.ctrlKey ? PINCH_ZOOM_SPEED : WHEEL_ZOOM_SPEED));

        this.zoomAt(event.clientX - svgRect.left, event.clientY - svgRect.top, (zoom) => zoom * factor);
    }

    // the buttons zoom about the middle of the view
    private zoomAtCenter = (nextZoom: (zoom: number) => number) => {
        const paper = this.getPaper();

        if (!paper) return;

        this.zoomAt(paper.width / 2, paper.height / 2, nextZoom);
    }

    private zoomIn = () => this.zoomAtCenter((zoom) => zoom / BUTTON_ZOOM_STEP);
    private zoomOut = () => this.zoomAtCenter((zoom) => zoom * BUTTON_ZOOM_STEP);

    /* Back to 100%, with the middle of the circuit in the middle of the view. The circuit only moves
     * when the zoom is applied, so its bounds are in the coordinates the zoom's origin is measured in.
     */
    private resetView = () => {
        const zoom = this.startZoom();

        if (!zoom) return;

        const bounds = contentBounds(this.getCanvas());

        // an empty canvas has nothing to center: just back to 100% about the middle of the view
        const centerX = bounds ? (bounds.minX + bounds.maxX) / 2 : zoom.originX + zoom.width * zoom.zoom / 2;
        const centerY = bounds ? (bounds.minY + bounds.maxY) / 2 : zoom.originY + zoom.height * zoom.zoom / 2;

        zoom.zoom = 1;
        zoom.originX = centerX - zoom.width / 2;
        zoom.originY = centerY - zoom.height / 2;

        this.showZoom(zoom);
    }

    /* Zooms the view about a point of the svg (in screen pixels from its top-left corner), keeping
     * what is under it in place. Steps that follow each other quickly add up and are applied to the
     * circuit once, when they stop (applyZoom).
     */
    private zoomAt = (pointerX: number, pointerY: number, nextZoomOf: (zoom: number) => number) => {
        const zoom = this.startZoom();

        if (!zoom) return;

        const nextZoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, nextZoomOf(zoom.zoom)));

        // the point under the pointer stays under it
        zoom.originX += pointerX * (zoom.zoom - nextZoom);
        zoom.originY += pointerY * (zoom.zoom - nextZoom);
        zoom.zoom = nextZoom;

        this.showZoom(zoom);
    }

    // the zoom still settling, or a new one from the current view; null while panning or with no canvas
    private startZoom = (): ZoomInProgress | null => {
        // a pan works out its moves at the zoom it started with
        if (this.isDragging) return null;

        const canvas = this.getCanvas();
        const paper = this.getPaper();

        if (!canvas || !paper) return null;

        if (!this.zoomInProgress) {
            const width = canvas.initialWidth || canvas.getWidth();
            const height = canvas.initialHeight || canvas.getHeight();

            if (!(width > 0 && height > 0)) return null;

            const from = canvas.zoomFactor || 1;

            this.zoomInProgress = {from, zoom: from, originX: 0, originY: 0, width, height};

            // as for a pan: the selection handles would be left where the figure was
            canvas.setCurrentSelection(null);

            /* the svg stays under the pointer (unlike for a pan): it may be the only thing on the canvas
             * that takes the wheel - in Obsidian the canvas element itself is pointer-events: none */
        }

        return this.zoomInProgress;
    }

    // shows the zoom in the viewBox, and applies it to the circuit once no other step follows
    private showZoom = (zoom: ZoomInProgress) => {
        this.requestViewBox(zoom.originX, zoom.originY, zoom.width * zoom.zoom, zoom.height * zoom.zoom);
        this.updateZoomControls(zoom.zoom);

        this.cancelZoomSettle();
        this.zoomSettleTimer = window.setTimeout(this.applyZoom, ZOOM_SETTLE_MS);
    }

    private updateZoomControls = (zoom: number) => {
        this.zoomControls?.update({
            canZoomIn: zoom > ZOOM_MIN + ZOOM_EPSILON,
            canZoomOut: zoom < ZOOM_MAX - ZOOM_EPSILON,
        });
    }

    // capture on the canvas element runs before draw2d's own handler there, so stopping it here keeps it from draw2d
    private holdMouseMoveDuringZoom = (event: MouseEvent) => {
        if (this.zoomInProgress) {
            event.stopPropagation();
        }
    }

    private cancelZoomSettle = () => {
        if (this.zoomSettleTimer === null) return;

        window.clearTimeout(this.zoomSettleTimer);

        this.zoomSettleTimer = null;
    }

    /* Applies a wheel zoom to the circuit: the zoom factor is set and the circuit shifted so the
     * viewBox can start at 0,0 again. Safe to call any time - it does nothing unless a zoom is
     * still settling.
     */
    protected applyZoom = () => {
        const zoom = this.zoomInProgress;

        if (!zoom) return;

        this.zoomInProgress = null;

        this.cancelZoomSettle();
        this.cancelPendingFrame();

        const canvas = this.getCanvas();
        const paper = this.getPaper();

        if (!canvas || !paper) return;

        const width = zoom.width * zoom.zoom;
        const height = zoom.height * zoom.zoom;

        canvas.zoomFactor = zoom.zoom;
        paper.setViewBox(0, 0, width, height);

        // figures can be dragged anywhere in sight - which grows as you zoom out
        canvas.regionDragDropConstraint.setBoundingBox(new draw2d.geo.Rectangle(0, 0, width, height));

        // rounding leftovers (centering what is already centered) are no move, and no edit to save
        const moved = Math.abs(zoom.originX) > ZOOM_EPSILON || Math.abs(zoom.originY) > ZOOM_EPSILON;

        if (moved) {
            this.translateCanvasContent(-zoom.originX, -zoom.originY);
        }

        // the zoom is saved with the circuit (CanvasManager.toJson), so a zoom alone is an edit too
        if (moved || Math.abs(zoom.zoom - zoom.from) > ZOOM_EPSILON) {
            this.onDragFinish();
        }

        this.paintGrid(0, 0, zoom.zoom);
        this.updateZoomControls(zoom.zoom);
    }

    protected getZoom = (): number => this.getCanvas()?.zoomFactor || 1;

    /* Sets the zoom a circuit was saved with, right after it is loaded: its coordinates already are
     * the ones for that zoom, so nothing moves and there is nothing to save.
     */
    protected restoreZoom = (savedZoom: unknown) => {
        const canvas = this.getCanvas();
        const paper = this.getPaper();

        if (!canvas || !paper) return;

        const zoom = typeof savedZoom === "number" && Number.isFinite(savedZoom) && savedZoom > 0 ? Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, savedZoom)) : 1;
        const width = canvas.initialWidth * zoom;
        const height = canvas.initialHeight * zoom;

        canvas.zoomFactor = zoom;

        // a canvas created hidden has no size yet: it is loaded again once shown (CanvasManager.resize)
        if (width > 0 && height > 0) {
            paper.setViewBox(0, 0, width, height);
            canvas.regionDragDropConstraint.setBoundingBox(new draw2d.geo.Rectangle(0, 0, width, height));
        }

        // at 100% the app's own css spacing stands
        if (zoom !== 1) {
            this.paintGrid(0, 0, zoom);
        }

        this.updateZoomControls(zoom);
    }

    private translateCanvasContent = (deltaX: number, deltaY: number) => {
        const canvas = this.getCanvas();

        this.gridShiftX += deltaX;
        this.gridShiftY += deltaY;

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
