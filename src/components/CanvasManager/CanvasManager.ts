/************************************************************************
 *    Copyright (C) 2024 Code Forge Temple                              *
 *    This file is part of circuit-sketcher-core project                *
 *    Licensed under the GNU General Public License v3.0.               *
 *    See the LICENSE file in the project root for more information.    *
 ************************************************************************/


import $ from "jquery";

(window as any).$ = $;
(window as any).jQuery = $;

import "jquery-ui/ui/widget";
import "jquery-ui/ui/widgets/mouse";
import "jquery-ui/ui/plugin";
import "jquery-ui/ui/widgets/draggable";
import "jquery-ui/ui/widgets/droppable";
import "jquery-contextmenu";
import {canvasMenu} from "../menus/canvas/canvasMenu";
import {CustomBlock} from "../customDefinitions/customBlock";
import "../menus/jquery-contextmenu.scss";
import {createConnection, labelBasicProps} from "../utils";
import draw2d from "draw2d";
import {LocalStorageManager} from "../LocalStorageManager";
import {DummyCommand} from "../customDefinitions/customCommands";

(window as any).draw2d = draw2d;


import {ObserverCanvas} from "./ObserverCanvas";
import {Coords} from "../types";

export class CanvasManager extends ObserverCanvas {
    private static instance: CanvasManager | null;
    private static canvasId:string;
    private static onChangeCallback: (() => void) | undefined;
    private canvas: any;

    private _jsonCanvas: any;

    public get jsonCanvas (): any {
        return this._jsonCanvas;
    }

    public set jsonCanvas (value: any) {
        this._jsonCanvas = value;
    }

    protected canvasElement!: HTMLElement;
    private reader: any;
    private writer: any;
    private openMenu: ((x: number, y: number) => any) | undefined;

    private constructor () {
        super();

        this.init();
    }

    private init = () => {
        this.canvas = new draw2d.Canvas(CanvasManager.canvasId);
        this.canvasElement = document.getElementById(CanvasManager.canvasId)!;
        this.reader = new draw2d.io.json.Reader();
        this.writer = new draw2d.io.json.Writer();
        this.jsonCanvas = "[]";

        this.loadCanvasMenu();

        this.setup();

        this.addDragEventListeners();
    }

    public static setCanvasId (canvasId: string) {
        CanvasManager.canvasId = canvasId;

        return CanvasManager;
    }

    public static setOnChangeCallback (callback: () => void) {
        CanvasManager.onChangeCallback = callback;

        return CanvasManager;
    }

    public static getInstance (): CanvasManager {
        if (!CanvasManager.instance) {
            CanvasManager.instance = new CanvasManager();
        }

        return CanvasManager.instance;
    }

    public loadCanvasMenu = () => {
        this.openMenu = canvasMenu(this.createNode, this.addNodeFromLib, this.removeNodeFromLib);
    }

    public static destroy = () => {
        if(CanvasManager.instance){
            CanvasManager.instance = null;
        }
    }

    private unload = () => {
        this.removeDragEventListeners();
        this.canvas.getCommandStack().removeEventListener(this.triggerChange);
        this.canvas.clear();
        this.canvas.destroy();
    }

    private reload = () => {
        this.unload();
        this.init();

        return CanvasManager.instance;
    }

    private setup = () => {
        this.canvas.on("contextmenu", (_emitter: any, {x, y}: Coords) => {
            if (this.canvas.currentHoverFigure) return;

            const rect = this.canvasElement.getBoundingClientRect();

            if(!this.openMenu) throw new Error("Canvas menu not loaded");

            this.openMenu(x - rect.left + window.scrollX, y - rect.top + window.scrollY);

            return false;
        });

        this.canvas.installEditPolicy(
            new draw2d.policy.connection.ComposedConnectionCreatePolicy([
                new draw2d.policy.connection.DragConnectionCreatePolicy({
                    createConnection: createConnection,
                }),
            ])
        );
        this.canvas.installEditPolicy(new draw2d.policy.canvas.SingleSelectionPolicy());
        this.canvas.installEditPolicy(new draw2d.policy.canvas.SnapToGeometryEditPolicy());
        this.canvas.installEditPolicy(new draw2d.policy.canvas.SnapToInBetweenEditPolicy());
        this.canvas.installEditPolicy(new draw2d.policy.canvas.SnapToCenterEditPolicy());

        if(CanvasManager.onChangeCallback){
            this.addChangeListener(CanvasManager.onChangeCallback);
        }

        this.canvas.getCommandStack().addEventListener(this.triggerChange);


        /* Uninstalling the default WheelZoomPolicy because it has the issue that is shrinks
         * the svg size and not the content and it leaves you with less available canvas area
         */
        const policies = this.canvas.editPolicy.clone();
        policies.each((i:number, policy:any) => {
            if (policy instanceof draw2d.policy.canvas.WheelZoomPolicy) {
                this.canvas.uninstallEditPolicy(policy);
            }
        });

        this.canvas.on("zoom", (emitter:any, event:any) => {
            console.log("Zoom level changed to:", event.value);
        });
    }

    private createNode = (coords: Coords): void => {
        const customBlock = new CustomBlock({...coords});

        const command = new draw2d.command.CommandAdd(this.canvas, customBlock, coords.x, coords.y);
        this.canvas.getCommandStack().execute(command);
    }

    private addNodeFromLib = ({x, y, nodeJson}: {x: number; y: number; nodeJson: Record<string, any>}): void => {
        nodeJson.x = x;
        nodeJson.y = y;
        nodeJson.id = draw2d.util.UUID.create();

        nodeJson.labels.forEach((label: any) => {
            label.id = draw2d.util.UUID.create();
            label.fontFamily = labelBasicProps.fontFamily;
        });

        nodeJson.ports.forEach((port: any) => {
            port.id = draw2d.util.UUID.create();

            port.labels.forEach((label: any) => {
                label.id = draw2d.util.UUID.create();
                label.fontFamily = labelBasicProps.fontFamily;
            });
        });

        const command = new draw2d.command.CommandUnmarshal(this.canvas, [nodeJson]);
        this.canvas.getCommandStack().execute(command);
    }

    private removeNodeFromLib = (libKey: string): void => {
        LocalStorageManager.removeItemFromLibrary(libKey);

        this.loadCanvasMenu();

        this.canvas.getCommandStack().execute(new DummyCommand());
    }

    public setNodeImage = (nodeId: string, imgSrc: string) => {
        const node = this.canvas.getFigure(nodeId);

        if (node) {
            const command = new draw2d.command.CommandSetImage(node, imgSrc);
            this.canvas.getCommandStack().execute(command);
        }
    }

    public toJson = async (): Promise<object[]> => {
        return new Promise((resolve) => {
            this.writer.marshal(this.canvas, (json: any) => {
                resolve(json);
            });
        });
    }

    public toPng = async (): Promise<string> => {
        return new Promise((resolve, reject) => {
            try {
                const writer = new draw2d.io.png.Writer();

                const figures = this.canvas.getFigures();
                const lines = this.canvas.getLines();
                let minX = NaN, minY = NaN, maxX = NaN, maxY = NaN;

                figures.each((_i: number, figure: any) => {
                    const x = figure.getAbsoluteX ? figure.getAbsoluteX() : figure.x;
                    const y = figure.getAbsoluteY ? figure.getAbsoluteY() : figure.y;
                    const width = figure.getWidth();
                    const height = figure.getHeight();

                    minX = !isNaN(minX) ? Math.min(minX, x) : x;
                    minY = !isNaN(minY) ? Math.min(minY, y) : y;
                    maxX = !isNaN(maxX) ? Math.max(maxX, x + width) : x + width;
                    maxY = !isNaN(maxY) ? Math.max(maxY, y + height) : y + height;

                    if (figure.getChildren && typeof figure.getChildren === "function") {
                        figure.getChildren().each((_j: number, child: any) => {
                            const cx = child.getAbsoluteX ? child.getAbsoluteX() : child.x;
                            const cy = child.getAbsoluteY ? child.getAbsoluteY() : child.y;
                            const cwidth = child.getWidth();
                            const cheight = child.getHeight();

                            minX = !isNaN(minX) ? Math.min(minX, cx) : cx;
                            minY = !isNaN(minY) ? Math.min(minY, cy) : cy;
                            maxX = !isNaN(maxX) ? Math.max(maxX, cx + cwidth) : cx + cwidth;
                            maxY = !isNaN(maxY) ? Math.max(maxY, cy + cheight) : cy + cheight;
                        });
                    }
                });

                lines.each((_i: number, line: any) => {
                    line.getVertices().each((_j: number, vertex: any) => {
                        const vx = vertex.x;
                        const vy = vertex.y;

                        minX = !isNaN(minX) ? Math.min(minX, vx) : vx;
                        minY = !isNaN(minY) ? Math.min(minY, vy) : vy;
                        maxX = !isNaN(maxX) ? Math.max(maxX, vx) : vx;
                        maxY = !isNaN(maxY) ? Math.max(maxY, vy) : vy;
                    });
                });

                if (isNaN(minX) || isNaN(minY) || isNaN(maxX) || isNaN(maxY)) {
                    minX = 0; minY = 0; maxX = this.canvas.getWidth(); maxY = this.canvas.getHeight();
                }

                const PADDING = 20;
                const area = {
                    x: Math.floor(minX) - PADDING,
                    y: Math.floor(minY) - PADDING,
                    w: Math.ceil(maxX - minX) + 2 * PADDING,
                    h: Math.ceil(maxY - minY) + 2 * PADDING
                };

                writer.marshal(this.canvas, (png: string) => {
                    resolve(png);
                }, area);
            } catch (err) {
                reject(err);
            }
        });
    }

    public stringify<T extends boolean | undefined>(sync?: T): T extends true ? string : Promise<string>;

    public stringify (sync?: boolean): Promise<string> | string {
        if (sync === true) {
            return this.jsonCanvas;
        }

        return this.toJson().then(json => JSON.stringify(json));
    }

    public parse = (json: string) => {
        this.reload(); // we need to reload the canvas to remove all previous figures

        try {
            const parsedJson = JSON.parse(json);

            this.jsonCanvas = json;

            this.reader.unmarshal(this.canvas, parsedJson);
        } catch {
            this.reader.unmarshal(this.canvas, JSON.parse(this.jsonCanvas));
        }
    }

    protected getCanvas = () => {
        return this.canvas;
    }

    protected onDragFinish = async () => {
        this.triggerChange({isPostChangeEvent: () => true});
    }

    // to be called only through the triggerChange method
    protected onChange = async (e: any): Promise<void> => {
        if(e.isPostChangeEvent()) {
            this.jsonCanvas = JSON.stringify(await this.toJson());
        }
    }
}