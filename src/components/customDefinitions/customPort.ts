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
import {Coords, SIDE} from "../types";

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

    return basePort.extend({
        NAME : `customDefinitions.customPorts.${portConstructorName}`,
        init: function () {
            this._super();

            this.createContextMenu();

            this.on("dragstart", () => {
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
            label.setBackgroundColor("#ffffff");
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
