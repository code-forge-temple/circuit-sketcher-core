/************************************************************************
 *    Copyright (C) 2024 Code Forge Temple                              *
 *    This file is part of circuit-sketcher-core project                *
 *    Licensed under the GNU General Public License v3.0.               *
 *    See the LICENSE file in the project root for more information.    *
 ************************************************************************/

import {nodeMenu, PORT_TYPE, PortType} from "../menus/canvas/node/nodeMenu";
import {openModal} from "../ModalAddImage";
import {DEFAULT_LABEL_NAME, exportJsonFile, getNestedConstructorInstanceFromPath, isWithinVirtualBoundary, labelBasicProps, PORT_RELOCATION_OUTER_OFFSET, toCapitalCase} from "../utils";
import * as CustomLocators from "./customLocator";
import {CustomInputPort, CustomOutputPort, CustomHybridPort} from "./customPort";
import draw2d from "draw2d";
import {CommandRotateBlock, DummyCommand} from "./customCommands";
import {LocalStorageManager} from "../LocalStorageManager";
import {findComponent, isDefaultGroup, LIBRARY_ORIGIN, libraryOrigin, listGroups, newLibraryKey, toLibraryEntry, withoutLibraryOrigin} from "../libraryTree";
import {Coords, SIDE, Side} from "../types";

type PortLocatorKeys = Exclude<keyof typeof CustomLocators, "CustomPositionLocator">;

const nodeImage = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxzdHlsZT4uc3Qwe2ZpbGw6I2NjY2NjYzt9PC9zdHlsZT48cmVjdCBjbGFzcz0ic3QwIiB3aWR0aD0iMSIgaGVpZ2h0PSIxIi8+PC9zdmc+";


// a quarter turn clockwise takes each side's ports on to the next side
const NEXT_SIDE_CLOCKWISE: Record<Side, Side> = {
    [SIDE.TOP]: SIDE.RIGHT,
    [SIDE.RIGHT]: SIDE.BOTTOM,
    [SIDE.BOTTOM]: SIDE.LEFT,
    [SIDE.LEFT]: SIDE.TOP,
};

/* ports are indexed left to right on top/bottom and top to bottom on left/right, so the left and
 * right edges come out in reverse order once turned onto the top and bottom */
const REVERSED_BY_TURN: Side[] = [SIDE.LEFT, SIDE.RIGHT];

// a port label sits on the inner side of its port (see CustomPort.createLabel)
const LABEL_SIDE: Record<Side, Side> = {
    [SIDE.LEFT]: SIDE.RIGHT,
    [SIDE.RIGHT]: SIDE.LEFT,
    [SIDE.TOP]: SIDE.BOTTOM,
    [SIDE.BOTTOM]: SIDE.TOP,
};

export const CustomBlock = draw2d.shape.basic.Image.extend({
    NAME : "customDefinitions.CustomBlock",
    init: function (attr: any) {
        this._super({width: 100, height: 100, path: nodeImage, ...attr});
        this.createContextMenu();
        this.portCounts = {top: 0, bottom: 0, left: 0, right: 0};
        this.lockedPorts = false;
        // clockwise quarter turns of the image, in degrees: 0, 90, 180 or 270
        this.imageRotation = 0;
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
            let locator;

            if(json.locator.startsWith("draw2d.")) {
                // this is a locator defined in the draw2d library
                locator = getNestedConstructorInstanceFromPath(draw2d, json.locator.replace("draw2d.", ""));
            } else {
                // this is one of our custom locators
                locator = getNestedConstructorInstanceFromPath(window, json.locator);
            }

            // Add the new figure as child to this figure
            this.add(figure, locator);
        });

        this.lockedPorts = memento.lockedPorts;

        // written only once a block has been turned, so older files and libraries load unturned
        this.imageRotation = ((memento.imageRotation ?? 0) % 360 + 360) % 360;
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

        memento.lockedPorts = this.lockedPorts;

        if (this.imageRotation) {
            memento.imageRotation = this.imageRotation;
        }

        return memento;
    },
    /* draw2d sets the image to the block's box; a turned block draws it in its own proportions,
     * turned about the block's centre (the box itself is already turned - see rotateClockwise) */
    applyTransformation: function () {
        // nothing to put back on a block that was never turned
        if (!this.imageRotation && !this.imageTurned) {
            return this;
        }

        const width = this.getWidth();
        const height = this.getHeight();
        const sideways = this.imageRotation % 180 !== 0;
        const imageWidth = sideways ? height : width;
        const imageHeight = sideways ? width : height;
        const centerX = this.getAbsoluteX() + width / 2;
        const centerY = this.getAbsoluteY() + height / 2;

        /* set in full every time: draw2d's repaint skips attributes it thinks it already applied,
         * which would leave the turned ones in place */
        this.shape.attr({
            x: centerX - imageWidth / 2,
            y: centerY - imageHeight / 2,
            width: imageWidth,
            height: imageHeight,
            transform: this.imageRotation ? `r${this.imageRotation},${centerX},${centerY}` : "",
        });

        // draw2d mirrors the size into CSS against flickering (see Image.repaint)
        $(this.shape.node).css({width: imageWidth, height: imageHeight});

        this.imageTurned = this.imageRotation !== 0;

        return this;
    },
    /* Turns the block about its centre by quarter turns clockwise (3 is a quarter turn counterclockwise):
     * the image turns, width and height swap on odd turns, and every port moves round to its turned
     * side and place, its label still on the inner side. The ports' wires leave in new directions, so
     * they are routed afresh.
     */
    rotate: function (quarterTurns: number) {
        const turns = ((quarterTurns % 4) + 4) % 4;

        if (!turns) return;

        // each port's side and place along it, turned a quarter at a time
        const places = new Map<any, {side: Side; index: number; total: number}>();

        for (const side of Object.values(SIDE)) {
            const ports = this.getPortsOnSide(side);

            ports.forEach((port: any, index: number) => places.set(port, {side, index, total: ports.length}));
        }

        for (let turn = 0; turn < turns; turn++) {
            places.forEach((place) => {
                if (REVERSED_BY_TURN.includes(place.side)) {
                    place.index = place.total - 1 - place.index;
                }

                place.side = NEXT_SIDE_CLOCKWISE[place.side];
            });
        }

        this.portCounts = {top: 0, bottom: 0, left: 0, right: 0};

        places.forEach(({side, index, total}, port) => {
            const locatorClassName = `Custom${toCapitalCase(side)}Locator` as PortLocatorKeys;

            port.setLocator(new CustomLocators[locatorClassName](index, total));

            port.children.each((_i: number, child: any) => {
                if (child.locator instanceof CustomLocators.CustomPortLabelLocator) {
                    child.locator.attr("side", LABEL_SIDE[side]);
                }
            });

            this.portCounts[side] = total;
        });

        this.imageRotation = (this.imageRotation + turns * 90) % 360;

        const {x, y} = this.getPosition();
        const width = this.getWidth();
        const height = this.getHeight();
        const sideways = turns % 2 === 1;
        const turnedWidth = sideways ? height : width;
        const turnedHeight = sideways ? width : height;

        this.withoutRegionConstraint(() => this.setDimension(turnedWidth, turnedHeight));
        // a turned box that crosses the canvas edge is moved back inside, as a drag would be
        this.setPosition(x + (width - turnedWidth) / 2, y + (height - turnedHeight) / 2);

        this.relocatePorts();

        this.getConnections().each((_i: number, connection: any) => {
            connection._routingMetaData = {routedByUserInteraction: false, fromDir: -1, toDir: -1};
            connection.routingRequired = true;
            connection.repaint();
        });

        this.repaint();
    },
    /* The canvas keeps figures inside its region, but at the edge it cuts a box short rather than
     * moving it - so a block turned near the edge would come out squashed. Runs `change` free of it.
     */
    withoutRegionConstraint: function (change: () => void) {
        const region = this.canvas?.regionDragDropConstraint;
        const index = region ? this.editPolicy.indexOf(region) : -1;

        if (index < 0) {
            change();

            return;
        }

        // taken out of the list rather than uninstalled, which would also drop its move listener
        this.editPolicy.removeElementAt(index);

        try {
            change();
        } finally {
            this.editPolicy.insertElementAt(region, index);
        }
    },
    createContextMenu: function () {
        this.onContextMenu = nodeMenu(
            this.addPortOnSide.bind(this),
            () => {
                return this.lockedPorts;
            },
            (lockedPorts: boolean) => {
                this.lockedPorts = lockedPorts;
            },
            (quarterTurns: number) => {
                this.canvas.getCommandStack().execute(new CommandRotateBlock(this, quarterTurns));
            },
            () => {
                openModal(this.id);
            },
            this.saveNodeToLibrary.bind(this),
            async () => {
                const {nodeJson, nodeLabel} = await this.extractNodeData();

                exportJsonFile({[nodeLabel]: nodeJson && withoutLibraryOrigin(nodeJson)}, nodeLabel);
            },
            this.removeNode.bind(this)
        );
    },
    addPortOnSide: function (side: Side, type: PortType) {
        if(!Object.values(SIDE).includes(side)) throw new Error("Invalid side: " + side);
        if(!Object.values(PORT_TYPE).includes(type)) throw new Error("Invalid type: " + type);

        const index = this.portCounts[side]++;
        const locatorClassName = `Custom${toCapitalCase(side)}Locator` as PortLocatorKeys;
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
        port.setName(draw2d.util.UUID.create()); //!important to set a unique name for the port as this is used to identify the port in the connections
        port.createLabel(DEFAULT_LABEL_NAME);

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
    getPortsOnSide: function (side: Side) {
        if(!Object.values(SIDE).includes(side)) throw new Error("Invalid side: " + side);

        const locatorClassName = `Custom${toCapitalCase(side)}Locator` as PortLocatorKeys;

        return this.getPorts().data
            .filter((port: { getLocator: () => any; }) => port.getLocator() instanceof CustomLocators[locatorClassName])
            .sort((a: any, b: any) => a.getLocator().attr("index") - b.getLocator().attr("index")); // !important sorting by locator index ascending since this.getPorts().data does not know about our locators indexing
    },
    getPortSide: function (port: any) {
        const locator = port.getLocator();

        return Object.values(SIDE).find(side => {
            const locatorClassName = `Custom${toCapitalCase(side)}Locator` as PortLocatorKeys;

            return locator instanceof CustomLocators[locatorClassName];
        });
    },
    movePortToClosestEdge: function (port: any, dropCoords: Coords) {
        if(this.lockedPorts) {
            return;
        }

        const {isWithinBoundary, boundaryTopLeft, boundaryBottomRight} = isWithinVirtualBoundary(this, PORT_RELOCATION_OUTER_OFFSET, dropCoords);

        if (!isWithinBoundary) {
            return;
        }

        const distances = {
            top: dropCoords.y - boundaryTopLeft.y,
            bottom: boundaryBottomRight.y - dropCoords.y,
            left: dropCoords.x - boundaryTopLeft.x,
            right: boundaryBottomRight.x - dropCoords.x,
        };
        const closestSide = (Object.keys(distances) as Array<keyof typeof distances>).reduce((a, b) => distances[a] < distances[b] ? a : b);
        const currentSide = this.getPortSide(port);

        if (currentSide) {
            this.portCounts[currentSide]--;
        }

        // Store the connections before removing the port
        const oldConnections = port.getConnections().clone();

        this.removePort(port);

        let targetPorts = this.getPortsOnSide(closestSide); // the ports are sorted ascending by locator index

        if(currentSide === closestSide) {
            targetPorts = targetPorts.map((port: any, index: number) => {
                const locator = port.getLocator();

                locator.attr("index", index); // we need to reindex since we have removed the port that is repositioning

                return port;
            });
        }

        let insertionIndex = targetPorts.length;
        let incrementNext = false;

        for (let index = 0; index < targetPorts.length; index++) {
            const targetPort = targetPorts[index];
            const targetPortPosition = targetPort.getAbsolutePosition();

            if (closestSide === SIDE.TOP || closestSide === SIDE.BOTTOM) {
                if (dropCoords.x < targetPortPosition.x) {
                    if(!incrementNext) {
                        insertionIndex = index;
                    }

                    incrementNext = true;
                }
            } else { // LEFT or RIGHT
                if (dropCoords.y < targetPortPosition.y) {
                    if(!incrementNext) {
                        insertionIndex = index;
                    }

                    incrementNext = true;
                }
            }

            if(incrementNext) {
                targetPort.getLocator().attr("index", targetPort.getLocator().attr("index") + 1);
            }
        }

        this.portCounts[closestSide]++;

        const locatorClassName = `Custom${toCapitalCase(closestSide)}Locator` as PortLocatorKeys;
        const locator = new CustomLocators[locatorClassName](insertionIndex, this.portCounts[closestSide]);

        port.setLocator(locator);

        this.addPort(port, locator);

        port.createLabel(); // we need to recreate the label because it might have a different locator now
        port.restoreConnections(oldConnections);

        // Trigger a redraw of the port's label
        port.getChildren().each((_i: number, child: any) => {
            child.repaint();
        });

        this.relocatePorts();
        this.repaint();
    },
    relocatePorts: function () {
        const sides = Object.values(SIDE);

        sides.forEach((side) => {
            const ports = this.getPorts().data.filter((port: { getLocator: () => any; }) => {
                const locator = port.getLocator();
                const locatorClassName = `Custom${toCapitalCase(side)}Locator` as PortLocatorKeys;

                return (locator instanceof CustomLocators[locatorClassName]);
            });

            // Sort the ports by their locator's "index" attribute before repositioning
            ports.sort((a: any, b: any) => {
                const indexA = a.getLocator().attr("index");
                const indexB = b.getLocator().attr("index");
                return indexA - indexB;
            }).forEach((port: any, index: number) => {
                const locatorClassName = `Custom${toCapitalCase(side)}Locator` as PortLocatorKeys;
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
    extractNodeData: async function () {
        const canvasJson = await this.toJson();
        const nodeJson = Object.values(canvasJson as Record<string, {id: string}>).find(({id}) => id === this.id);
        const nodeLabel = this.children.data[0].figure.text;

        return {
            nodeJson,
            nodeLabel
        }
    },
    saveNodeToLibrary: async function () {
        const {nodeJson, nodeLabel} = await this.extractNodeData();

        if (!nodeJson) return;

        const library = await LocalStorageManager.getLibrary();
        /* back into the group it was placed from, as long as that group still exists - except
         * "default", which only Sync changes: edits to one of its components are saved as your own */
        const origin = libraryOrigin(nodeJson);
        const group = isDefaultGroup(origin) || !listGroups(library).includes(origin) ? "" : origin;
        const key = findComponent(library, group, nodeLabel) ?? newLibraryKey();

        await LocalStorageManager.addItemToLibrary(key, toLibraryEntry(nodeJson, group));

        // saving it again later goes to the same place
        this.setUserData({...this.getUserData(), [LIBRARY_ORIGIN]: group});

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