/************************************************************************
 *    Copyright (C) 2026 Code Forge Temple                              *
 *    This file is part of circuit-sketcher-core project                *
 *    Licensed under the GNU General Public License v3.0.               *
 *    See the LICENSE file in the project root for more information.    *
 ************************************************************************/
import "./ZoomControls.scss";
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
export declare const createZoomControls: (canvasElement: HTMLElement, actions: ZoomActions) => ZoomControls | null;
