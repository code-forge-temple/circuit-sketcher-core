/************************************************************************
 *    Copyright (C) 2024 Code Forge Temple                              *
 *    This file is part of circuit-sketcher-core project                *
 *    Licensed under the GNU General Public License v3.0.               *
 *    See the LICENSE file in the project root for more information.    *
 ************************************************************************/

import {portMenu} from "../menus/canvas/node/port/portMenu";
import {createConnection, DEFAULT_LABEL_NAME, getNestedConstructorInstanceFromPath, isWithinVirtualBoundary, labelBasicProps, PORT_RELOCATION_OUTER_OFFSET} from "../utils";
import draw2d from "draw2d";
import {DummyCommand} from "./customCommands";
import {CustomPortLabelLocator} from "./customLocator";
import {Coords, PORT_LABEL_BACKGROUND_COLOR, SIDE} from "../types";
import {hidePortTooltip, hidePortTooltipNow, showPortTooltip} from "../portTooltip/portTooltip";
import {PORT_TYPE, PORT_TYPE_NAME, PortType} from "../menus/canvas/node/nodeMenu";

/* Mirrors the switch in CustomBlock.addPortOnSide, so a port reports the same type the
 * "Add Port..." menu used to create it.
 */
const PORT_CONSTRUCTOR_TYPES: Record<string, PortType> = {
    CustomInputPort: PORT_TYPE.IN,
    CustomOutputPort: PORT_TYPE.OUT,
    CustomHybridPort: PORT_TYPE.IO,
};

const customPortFactory = (portConstructorName: string) => {
    let basePort;

    switch(portConstructorName) {
        case "CustomInputPort":
            basePort = draw2d.InputPort;
            break;
        case "CustomOutputPort":
            basePort = draw2d.OutputPort;
            break;
        case "CustomHybridPort":
            basePort = draw2d.HybridPort;
            break;
        default:
            throw new Error("Invalid port constructor name");
    }

    const portTypeName = PORT_TYPE_NAME[PORT_CONSTRUCTOR_TYPES[portConstructorName]];

    return basePort.extend({
        NAME : `customDefinitions.customPorts.${portConstructorName}`,
        init: function () {
            this._super();

            this.createContextMenu();

            /* draw2d invokes listeners unbound, so keep arrow-bound handlers around -
             * they are reused for the port's labels, which are hit-tested separately */
            this.tooltipEnterHandler = () => this.showTypeTooltip();
            this.tooltipLeaveHandler = () => hidePortTooltip();

            this.attachTypeTooltip(this);

            this.on("dragstart", () => {
                hidePortTooltipNow();

                this.addVirtualBoundaryToParent();
            });

            this.on("drag", () => {
                const parent = this.getParent();
                const dragCoords: Coords = this.getAbsolutePosition();
                const {isWithinBoundary} = isWithinVirtualBoundary(parent, PORT_RELOCATION_OUTER_OFFSET, dragCoords);

                if(!this.getParent().lockedPorts) {
                    this.boundaryRect.setVisible(isWithinBoundary);
                }
            });

            this.on("dragend", (emitter:any, event: { x: number; y: number; shiftKey: boolean; }) => {
                const parent = this.getParent();

                this.removeVirtualBoundaryFromParent();

                parent.movePortToClosestEdge(this, event);

                if (event.shiftKey) {
                    const targetPort = this.getCanvas().getBestFigure(event.x, event.y);

                    if (targetPort && targetPort instanceof basePort && targetPort !== this) {
                        const connection = createConnection(this, targetPort);

                        this.getCanvas().add(connection);
                    }
                }
            });
        },
        /* Canvas.getBestFigure tests a port's children before the port itself, so hovering
         * a port label reports the label as the hovered figure. Both need the handler for
         * the tooltip to appear over the dot and over its label.
         */
        attachTypeTooltip: function (figure: any) {
            figure.on("mouseenter", this.tooltipEnterHandler);
            figure.on("mouseleave", this.tooltipLeaveHandler);
        },
        showTypeTooltip: function () {
            const canvas = this.getCanvas();

            if (!canvas || !portTypeName) return;

            const {x, y} = this.getAbsolutePosition();
            /* canvas -> document, which already accounts for zoom and canvas scrolling;
             * the tooltip is position:fixed, so take out the page scroll as well */
            const anchor = canvas.fromCanvasToDocumentCoordinate(x, y);

            showPortTooltip(portTypeName, {
                x: anchor.x - window.scrollX,
                y: anchor.y - window.scrollY - this.getHeight() / 2,
            });
        },
        addVirtualBoundaryToParent: function () {
            if(this.boundaryRect) return;

            const parent = this.getParent();
            const parentPosition = parent.getPosition();
            const parentWidth = parent.getWidth();
            const parentHeight = parent.getHeight();

            this.boundaryRect = new draw2d.shape.basic.Rectangle({
                x: parentPosition.x - PORT_RELOCATION_OUTER_OFFSET,
                y: parentPosition.y - PORT_RELOCATION_OUTER_OFFSET,
                width: parentWidth + PORT_RELOCATION_OUTER_OFFSET*2,
                height: parentHeight + PORT_RELOCATION_OUTER_OFFSET*2,
                stroke: 2,
                dasharray: "-",
                bgColor: null,
                color: "#007bff",
                draggable: false,
                resizeable: false,
                selectable: false,
            });

            this.canvas.add(this.boundaryRect);

            this.boundaryRect.setVisible(false);
        },
        removeVirtualBoundaryFromParent: function () {
            this.canvas.remove(this.boundaryRect);
            this.boundaryRect = null;
        },
        setPersistentAttributes : function (memento: Record<string, any>)
        {
            this._super(memento);

            // Remove all decorations created in the constructor of this element
            this.resetChildren();

            // Set custom attributes from the memento
            //this.customAttributes = memento.customAttributes;

            // Add all children from the JSON document
            memento.labels.forEach((json: any) => {
                // Create the figure stored in the JSON
                const figure = getNestedConstructorInstanceFromPath(draw2d, json.type.replace("draw2d.", ""));

                // Apply all attributes
                figure.attr(json);

                // Instantiate the locator
                let locator;

                if(json.locator.startsWith("draw2d.")) {
                    // this is a locator defined in the draw2d library
                    locator = getNestedConstructorInstanceFromPath(draw2d, json.locator.replace("draw2d.", ""));
                } else {
                    // this is one of our custom locators
                    locator = getNestedConstructorInstanceFromPath(window, json.locator);

                    if(locator.setPersistentAttributes) {
                        locator.setPersistentAttributes(json.locatorAttr);
                    }
                }

                // Add the new figure as child to this figure
                this.add(figure, locator);

                this.attachTypeTooltip(figure);
            });
        },
        getPersistentAttributes : function () {
            const memento = this._super();

            // Add custom attributes to the memento
            memento.customAttributes = this.customAttributes;

            // Add all decorations to the memento
            memento.labels = [];
            this.children.each((_i: number, e: any) => {
                const json = e.figure.getPersistentAttributes();

                /* net highlighting tints the label background; that's view state, so the
                 * saved circuit always gets the resting colour back */
                json.bgColor = PORT_LABEL_BACKGROUND_COLOR;

                json.locator = e.locator.NAME;

                if(e.locator.getPersistentAttributes) {
                    json.locatorAttr = e.locator.getPersistentAttributes();
                }

                memento.labels.push(json);
            });

            return memento;
        },
        createLabel: function (labelName?:string) {
            let oldLabelName;

            if(this.children.data.length)
            {
                oldLabelName = this.children.data[0].figure.text;

                this.resetChildren(); // we are removing the label before adding a new one
            } else if(!labelName) {
                return;
            }

            const label = new draw2d.shape.basic.Label({text: oldLabelName || labelName || DEFAULT_LABEL_NAME, ...labelBasicProps});

            label.setColor("#000000");
            label.setFontColor("#000000");
            label.setBackgroundColor(PORT_LABEL_BACKGROUND_COLOR);
            label.setStroke(0);
            label.installEditor(new draw2d.ui.LabelInplaceEditor());

            switch (this.getLocator().NAME.split(".")[2]) {
                case "CustomLeftLocator":
                    this.add(label, new CustomPortLabelLocator(SIDE.RIGHT));
                    break;
                case "CustomRightLocator":
                    this.add(label, new CustomPortLabelLocator(SIDE.LEFT));
                    break;
                case "CustomTopLocator":
                    this.add(label, new CustomPortLabelLocator(SIDE.BOTTOM));
                    break;
                case "CustomBottomLocator":
                    this.add(label, new CustomPortLabelLocator(SIDE.TOP));
                    break;
            }

            this.attachTypeTooltip(label);

            label.repaint();
        },
        createContextMenu: function () {
            this.onContextMenu = portMenu(() => {
                return this.children.data.length > 0;
            }, () => {
                this.createLabel(DEFAULT_LABEL_NAME);

                this.canvas.getCommandStack().execute(new DummyCommand());
            }, () => {
                this.resetChildren();

                this.canvas.getCommandStack().execute(new DummyCommand());
            }, () => {
                this.getParent().removeCreatedPort(this);
            });
        },
        restoreConnections: function (connections: any) {
            connections.each((_i: number, connection: any) => {
                const sourcePort = connection.getSource();
                const targetPort = connection.getTarget();

                if (sourcePort === this) {
                    connection.setSource(this);
                } else if (targetPort === this) {
                    connection.setTarget(this);
                }

                this.canvas.add(connection);
            });
        },
    });
}

export const CustomInputPort = customPortFactory("CustomInputPort");

export const CustomOutputPort = customPortFactory("CustomOutputPort");

export const CustomHybridPort = customPortFactory("CustomHybridPort");

window.customDefinitions = Object.assign(window.customDefinitions || {}, {
    customPorts: {
        CustomInputPort,
        CustomOutputPort,
        CustomHybridPort,
    }
});
