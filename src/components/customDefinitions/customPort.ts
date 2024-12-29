/************************************************************************
 *    Copyright (C) 2024 Code Forge Temple                              *
 *    This file is part of circuit-sketcher-core project                *
 *    Licensed under the GNU General Public License v3.0.               *
 *    See the LICENSE file in the project root for more information.    *
 ************************************************************************/

import {portMenu} from "../menus/canvas/node/port/portMenu";
import {Coords, createConnection, getNestedConstructorInstanceFromPath, isWithinVirtualBoundary, labelBasicProps, PORT_RELOCATION_OUTER_OFFSET} from "../utils";
import draw2d from "draw2d";
import {DummyCommand} from "./customCommands";

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

                this.boundaryRect.setVisible(isWithinBoundary);
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
                const locator = getNestedConstructorInstanceFromPath(draw2d, json.locator.replace("draw2d.", ""));

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
                memento.labels.push(json);
            });

            return memento;
        },
        createLabel: function () {
            const label = new draw2d.shape.basic.Label({text: this.getName(), ...labelBasicProps});

            label.setColor("#000000");
            label.setFontColor("#000000");
            label.setBackgroundColor("#ffffff");
            label.setStroke(0);
            label.installEditor(new draw2d.ui.LabelInplaceEditor());

            this.add(label, new draw2d.layout.locator.BottomLocator());
        },
        createContextMenu: function () {
            this.onContextMenu = portMenu(() => {
                this.createLabel(true);

                this.canvas.getCommandStack().execute(new DummyCommand());
            }, () => {
                this.resetChildren();

                this.canvas.getCommandStack().execute(new DummyCommand());
            }, () => {
                this.getParent().removeCreatedPort(this);
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
