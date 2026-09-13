/************************************************************************
 *    Copyright (C) 2024 Code Forge Temple                              *
 *    This file is part of circuit-sketcher-core project                *
 *    Licensed under the GNU General Public License v3.0.               *
 *    See the LICENSE file in the project root for more information.    *
 ************************************************************************/
import "./DraggableCanvas.scss";
export declare abstract class DraggableCanvas {
    protected abstract canvasElement: HTMLElement;
    private isDragging;
    private startX;
    private startY;
    private totalDx;
    private totalDy;
    private viewport;
    private rafId;
    protected abstract getCanvas(): any;
    protected abstract onDragFinish(): Promise<void>;
    protected addDragEventListeners(): void;
    protected removeDragEventListeners(): void;
    private getPaper;
    private readViewport;
    private hasUsableViewport;
    private setViewBox;
    private requestFrame;
    private cancelPendingFrame;
    private paintFrame;
    private onMouseDown;
    private onMouseMove;
    private onMouseUp;
    private onWindowBlur;
    private finishDrag;
    private translateCanvasContent;
}
