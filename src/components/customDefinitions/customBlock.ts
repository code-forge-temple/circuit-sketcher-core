/************************************************************************
 *    Copyright (C) 2024 Code Forge Temple                              *
 *    This file is part of circuit-sketcher-core project                *
 *    Licensed under the GNU General Public License v3.0.               *
 *    See the LICENSE file in the project root for more information.    *
 ************************************************************************/

import {NODE_SIDE, nodeMenu, NodeSide, PORT_TYPE, PortType} from "../menus/canvas/node/nodeMenu";
import {openModal} from "../ModalAddImage";
import {getNestedConstructorInstanceFromPath, labelBasicProps, toCapitalCase} from "../utils";
import * as CustomLocators from "./customLocator";
import {CustomInputPort, CustomOutputPort, CustomHybridPort} from "./customPort";
import draw2d from "draw2d";
import {DummyCommand} from "./customCommands";
import {LocalStorageManager} from "../LocalStorageManager";

type LocatorKeys = keyof typeof CustomLocators;


const nodeImage = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxzdHlsZT4uc3Qwe2ZpbGw6I2NjY2NjYzt9PC9zdHlsZT48cmVjdCBjbGFzcz0ic3QwIiB3aWR0aD0iMSIgaGVpZ2h0PSIxIi8+PC9zdmc+";


export const CustomBlock = draw2d.shape.basic.Image.extend({
    NAME : "customDefinitions.CustomBlock",
    init: function (attr: any) {
        this._super($.extend({width: 100, height: 100, path: nodeImage}, attr));
        this.createContextMenu();
        this.portCounts = {top: 0, bottom: 0, left: 0, right: 0};
        this.createLabel();
    },
    setPersistentAttributes : function (memento: Record<string, any>)
    {
        this._super(memento);

        // Remove all decorations created in the constructor of this element
        this.resetChildren();

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
        //memento.customAttributes = this.customAttributes;

        // Add all decorations to the memento
        memento.labels = [];
        this.children.each((_i: number, e: any) => {
            const json = e.figure.getPersistentAttributes();
            json.locator = e.locator.NAME;
            memento.labels.push(json);
        });

        return memento;
    },
    createContextMenu: function () {
        this.onContextMenu = nodeMenu(this.addPortOnSide.bind(this), () => {
            openModal(this.id);
        }, this.saveNodeToLibrary.bind(this), this.removeNode.bind(this));
    },
    addPortOnSide: function (side: NodeSide, type: PortType) {
        if(!Object.values(NODE_SIDE).includes(side)) throw new Error("Invalid side: " + side);
        if(!Object.values(PORT_TYPE).includes(type)) throw new Error("Invalid type: " + type);

        const index = this.portCounts[side]++;
        const locatorClassName = `Custom${toCapitalCase(side)}Locator` as LocatorKeys;
        const locator = new CustomLocators[locatorClassName](index, this.portCounts[side]);
        let port;

        switch (type) {
            case "in":
                port = new CustomInputPort();
                break;
            case "out":
                port = new CustomOutputPort();
                break;
            case "io":
                port = new CustomHybridPort();
                break;
        }

        port.setLocator(locator);
        port.setName(`${side}-port-${index}`);
        port.createLabel();

        this.addPort(port); // Add port to the node
        this.relocatePorts(); // Reposition all ports to be equidistant

        this.repaint();

        const command = new DummyCommand();
        this.canvas.getCommandStack().execute(command);
    },
    createLabel: function () {
        const label = new draw2d.shape.basic.Label({text: "node-label", draggable: true, ...labelBasicProps});

        label.setColor("#000000");
        label.setFontColor("#000000");
        label.setBackgroundColor("#ffffff");
        label.setStroke(0);
        label.installEditor(new draw2d.ui.LabelInplaceEditor());
        label.deleteable = false; // we need this for Library - the label is the key

        this.add(label, new draw2d.layout.locator.DraggableLocator());
    },
    removeCreatedPort: function (port: any) { // This will be called from the custom ports
        this.removePort(port);
        this.relocatePorts(); // Reposition all ports to be equidistant
        this.repaint();

        const command = new DummyCommand();
        this.canvas.getCommandStack().execute(command);
    },
    removeNode: function () {
    // Remove all connections associated with the node's ports
        this.getPorts().each(function (_i: number, port: any) {
            port.getConnections().each(function (_j: number, connection: any) {
                connection.getCanvas().remove(connection);
            });
        });

        // Remove the node itself
        const command = new draw2d.command.CommandDelete(this);
        this.canvas.getCommandStack().execute(command);
    },
    relocatePorts: function () {
        const sides = Object.values(NODE_SIDE);

        sides.forEach((side) => {
            const ports = this.getPorts().data.filter((port: { getLocator: () => any; }) => {
                const locator = port.getLocator();
                const locatorClassName = `Custom${toCapitalCase(side)}Locator` as LocatorKeys;

                return (locator instanceof CustomLocators[locatorClassName]);
            });

            ports.forEach((port: any, index: number) => {
                const locatorClassName = `Custom${toCapitalCase(side)}Locator` as LocatorKeys;
                const locator = new CustomLocators[locatorClassName](index, ports.length);

                port.setLocator(locator);

                port.getChildren().each((_i: number, child: any) => {
                    setTimeout(() => {
                        child.repaint(); // this is necessary with a timeout because it won't work otherwise
                    }, 0);
                });
            });
        });
    },
    saveNodeToLibrary: async function () {
        const canvasJson = await this.toJson();
        const nodeJson = Object.values(canvasJson as Record<string, {id: string}>).find(({id}) => id === this.id);

        LocalStorageManager.addItemToLibrary(this.children.data[0].figure.text, nodeJson);

        this.canvas.getCommandStack().execute(new DummyCommand()); // so Obsidian saves the library
    },
    toJson: async function (): Promise<object> {
        return new Promise((resolve) => {
            (new draw2d.io.json.Writer()).marshal(this.canvas, (json: any) => {
                resolve(json);
            });
        });
    }
});

window.customDefinitions = Object.assign(window.customDefinitions || {}, {
    CustomBlock: CustomBlock
});