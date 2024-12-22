/************************************************************************
 *    Copyright (C) 2024 Code Forge Temple                              *
 *    This file is part of circuit-sketcher-core project                *
 *    Licensed under the GNU General Public License v3.0.               *
 *    See the LICENSE file in the project root for more information.    *
 ************************************************************************/
import "jquery-ui/ui/widget";
import "jquery-ui/ui/widgets/mouse";
import "jquery-ui/ui/plugin";
import "jquery-ui/ui/widgets/draggable";
import "jquery-ui/ui/widgets/droppable";
import "jquery-contextmenu";
import "../menus/jquery-contextmenu.scss";
import { ObserverCanvas } from "./ObserverCanvas";
export declare class CanvasManager extends ObserverCanvas {
    private static instance;
    private static canvasId;
    private static onChangeCallback;
    private canvas;
    private _jsonCanvas;
    get jsonCanvas(): any;
    set jsonCanvas(value: any);
    protected canvasElement: HTMLElement;
    private reader;
    private writer;
    private openMenu;
    private constructor();
    private init;
    static setCanvasId(canvasId: string): typeof CanvasManager;
    static setOnChangeCallback(callback: () => void): typeof CanvasManager;
    static getInstance(): CanvasManager;
    loadCanvasMenu: () => void;
    static destroy: () => void;
    private unload;
    private reload;
    private setup;
    private createNode;
    private addNodeFromLib;
    private removeNodeFromLib;
    setNodeImage: (nodeId: string, imgSrc: string) => void;
    toJson: () => Promise<object[]>;
    stringify<T extends boolean | undefined>(sync?: T): T extends true ? string : Promise<string>;
    parse: (json: string) => void;
    protected getCanvas: () => any;
    protected onDragFinish: () => Promise<void>;
    protected onChange: (e: any) => Promise<void>;
}
