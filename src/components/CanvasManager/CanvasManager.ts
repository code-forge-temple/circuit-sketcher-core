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
import {openLibraryManager} from "../LibraryManager";

(window as any).draw2d = draw2d;


import {ObserverCanvas} from "./ObserverCanvas";
import {contentBounds} from "./contentBounds";
import {Coords} from "../types";

const IDENTITY_MATRIX = "matrix(1,0,0,1,0,0)";

/* The circuit file's entry for the zoom it was left at. Not a draw2d figure: versions from before it
 * existed log it as an unknown type, skip it, and open at 100%.
 */
const VIEW_ENTRY_TYPE = "customDefinitions.CanvasView";

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

        this.canvasElement.addEventListener("contextmenu", this.preventBrowserMenu);
    }

    // our menus open from code (see openContextMenu), so the browser's own one is kept off the canvas
    private preventBrowserMenu = (event: Event) => {
        event.preventDefault();
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
        this.openMenu = canvasMenu(this.createNode, this.addNodeToCanvas, this.removeNodeFromLib, this.manageLibrary);
    }

    public static destroy = () => {
        if(CanvasManager.instance){
            CanvasManager.instance.unload();
            CanvasManager.instance = null;
        }
    }

    private unload = () => {
        this.removeDragEventListeners();
        this.canvasElement.removeEventListener("contextmenu", this.preventBrowserMenu);
        this.canvas.getCommandStack().removeEventListener(this.triggerChange);
        this.canvas.clear();
        this.canvas.destroy();

        /* draw2d's destroy() leaves the mouse handlers and the droppable it put on the canvas
         * element, and a reload reuses that element - each one would keep the old canvas alive
         */
        const html = this.canvas.html;

        if (html.droppable("instance")) {
            html.droppable("destroy");
        }

        html.off();
    }

    private reload = () => {
        this.unload();
        this.init();

        return CanvasManager.instance;
    }

    private setup = () => {
        this.canvas.on("contextmenu", (_emitter: any, {figure, x, y}: Coords & {figure: any}) => {
            /* only for the blank canvas - a figure under the pointer opens its own menu. draw2d tells us
             * which one was hit; the hover state goes stale while a menu covers the canvas */
            if (figure) return;

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

    private addNodeToCanvas = ({x, y, nodeJson}: {x: number; y: number; nodeJson: Record<string, any>}): void => {
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

    private removeNodeFromLib = async (libKey: string): Promise<void> => {
        await LocalStorageManager.removeItemFromLibrary(libKey);

        this.loadCanvasMenu();

        this.canvas.getCommandStack().execute(new DummyCommand());
    }

    private manageLibrary = () => {
        /* the dialog can outlive this canvas (another file opened meanwhile), so its changes go
         * to whichever canvas is current - the change event is what makes Obsidian save the library */
        openLibraryManager(() => CanvasManager.instance?.libraryChanged());
    }

    private libraryChanged = () => {
        this.canvas.getCommandStack().execute(new DummyCommand());
    }

    public setNodeImage = (nodeId: string, imgSrc: string) => {
        const node = this.canvas.getFigure(nodeId);

        if (node) {
            const command = new draw2d.command.CommandSetImage(node, imgSrc);
            this.canvas.getCommandStack().execute(command);
        }
    }

    /* The circuit as saved: draw2d's figures, plus the zoom as one extra entry once it isn't 100%.
     * Pans and zooms move the figures' coordinates (see DraggableCanvas), so they only show the
     * circuit as it was left at the zoom they were saved with.
     */
    public toJson = async (): Promise<object[]> => {
        return new Promise((resolve) => {
            this.writer.marshal(this.canvas, (json: any) => {
                const zoom = this.getZoom();

                // a circuit at 100% is saved exactly as before the zoom existed
                resolve(Math.abs(zoom - 1) > 1e-6 ? [...json, {type: VIEW_ENTRY_TYPE, zoom}] : json);
            });
        });
    }

    public toPng = async (): Promise<string> => {
        return new Promise((resolve, reject) => {
            try {
                const writer = new draw2d.io.png.Writer();
                const {minX, minY, maxX, maxY} = contentBounds(this.canvas) ?? {minX: 0, minY: 0, maxX: this.canvas.getWidth(), maxY: this.canvas.getHeight()};

                const PADDING = 20;
                const area = {
                    x: Math.floor(minX) - PADDING,
                    y: Math.floor(minY) - PADDING,
                    w: Math.ceil(maxX - minX) + 2 * PADDING,
                    h: Math.ceil(maxY - minY) + 2 * PADDING
                };

                /* draw2d's png writer unselects and reselects the selection to keep its handles
                 * out of the picture - flag it, so that isn't taken for an edit (a change would
                 * request another save, which exports the png again: an endless save loop)
                 */
                this.canvas.exportingImage = true;

                /* the writer draws the svg as it is shown - zoomed, and cut to what is in sight. For
                 * the export, size it to the circuit at 1:1 instead (the writer reads the svg right
                 * away, so it is back as it was before anything is painted)
                 */
                const paper = this.canvas.paper;
                const {width, height} = paper;
                const viewBox = paper._viewBox ? [...paper._viewBox] : [0, 0, width, height];
                // mid-pan or mid-zoom the svg shows a viewBox Raphael doesn't know about (see DraggableCanvas.paintFrame)
                const shownViewBox = paper.canvas.getAttribute("viewBox");

                /* Raphael gives every gradient (the ports' fill) an identity gradientTransform, and for
                 * one of those canvg paints the gradient as a pattern that covers only 0,0 to the image
                 * size - a port at negative coordinates (after a pan or a zoom) would come out unfilled
                 */
                const identityTransforms = [...paper.canvas.querySelectorAll("[gradientTransform]")]
                    .filter((gradient: Element) => gradient.getAttribute("gradientTransform") === IDENTITY_MATRIX);

                paper.setSize(area.w, area.h);
                paper.setViewBox(area.x, area.y, area.w, area.h);
                identityTransforms.forEach((gradient) => gradient.removeAttribute("gradientTransform"));

                try {
                    writer.marshal(this.canvas, (png: string) => {
                        resolve(png);
                    }, {x: 0, y: 0, w: area.w, h: area.h});
                } finally {
                    identityTransforms.forEach((gradient) => gradient.setAttribute("gradientTransform", IDENTITY_MATRIX));
                    paper.setSize(width, height);
                    paper.setViewBox(...viewBox);

                    if (shownViewBox) {
                        paper.canvas.setAttribute("viewBox", shownViewBox);
                    }

                    this.canvas.exportingImage = false;
                }
            } catch (err) {
                reject(err);
            }
        });
    }

    /* Fits the drawing area to the canvas element after the element changed size. It only
     * resizes the svg, so it is cheap and keeps the figures, selection and undo history -
     * unlike rebuilding the canvas through stringify() + parse().
     */
    public resize = () => {
        const width = this.canvasElement.clientWidth;
        const height = this.canvasElement.clientHeight;

        // a hidden view measures 0x0; keep the last real size until it is shown again
        if (width <= 0 || height <= 0) return;

        // a wheel zoom still settling is worked out for the old size
        this.applyZoom();

        /* created while hidden: draw2d measured every label as 0x0, so lay the circuit out
         * once more now that it is visible - from the last saved state, as opening it would */
        if (!this.canvas.initialWidth || !this.canvas.initialHeight) {
            this.parse(this.jsonCanvas);

            return;
        }

        if (width === this.canvas.initialWidth && height === this.canvas.initialHeight) return;

        const zoom = this.canvas.zoomFactor || 1;

        this.canvas.initialWidth = width;
        this.canvas.initialHeight = height;

        this.canvas.paper.setSize(width, height);

        /* setSize re-applies the previous viewBox (set by a pan or a zoom), which would
         * stretch the scene over the new size - match it to the new size instead */
        if (this.canvas.paper._viewBox) {
            this.canvas.paper.setViewBox(0, 0, width * zoom, height * zoom);
        }

        // figures can't be dragged outside this region - what is in sight at the current zoom
        this.canvas.regionDragDropConstraint.setBoundingBox(new draw2d.geo.Rectangle(0, 0, width * zoom, height * zoom));
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

            this.load(parsedJson);
        } catch {
            this.load(JSON.parse(this.jsonCanvas));
        }
    }

    // draw2d gets the figures; the view entry (see toJson) is ours - draw2d would log it as unknown
    private load = (entries: any[]) => {
        const view = entries.find((entry) => entry?.type === VIEW_ENTRY_TYPE);

        this.reader.unmarshal(this.canvas, entries.filter((entry) => entry?.type !== VIEW_ENTRY_TYPE));

        this.restoreZoom(view?.zoom ?? 1);
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