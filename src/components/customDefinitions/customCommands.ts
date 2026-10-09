/************************************************************************
 *    Copyright (C) 2024 Code Forge Temple                              *
 *    This file is part of circuit-sketcher-core project                *
 *    Licensed under the GNU General Public License v3.0.               *
 *    See the LICENSE file in the project root for more information.    *
 ************************************************************************/

import draw2d from "draw2d";


/** DummyCommand
 * This command will be used when the changes are to many and
 * we cannot create custom commands for each change but we still
 * need to get the canvas command stack to trigger so we can save the data there
 */
export const DummyCommand = draw2d.command.Command.extend({
    NAME: "draw2d.command.DummyCommand",

    init: function () {
        this._super("Dummy Command");
    },

    canExecute: function () { return true; },

    execute: function () {},

    undo: function () {},

    redo: function () {},
});

/** CommandRotateBlock
 * Turns a CustomBlock by quarter turns clockwise (1 clockwise, 3 counterclockwise). Its wires get
 * routed afresh for the ports' new sides; undo turns it back and puts every wire back exactly as it
 * was routed before.
 */
export const CommandRotateBlock = draw2d.command.Command.extend({
    NAME: "customDefinitions.CommandRotateBlock",

    init: function (block: any, quarterTurns: number) {
        this._super("Rotate");

        this.block = block;
        this.quarterTurns = quarterTurns;
        this.position = block.getPosition();
        this.routes = block.getConnections().asArray().map((connection: any) => ({
            connection,
            vertices: connection.getVertices().clone(true),
            routing: {...connection._routingMetaData},
        }));
    },

    canExecute: function () { return true; },

    execute: function () {
        this.block.rotate(this.quarterTurns);
    },

    undo: function () {
        this.block.rotate(-this.quarterTurns);

        // turning near the canvas edge may have moved it inside; it goes back exactly where it was
        this.block.withoutRegionConstraint(() => this.block.setPosition(this.position.x, this.position.y));

        this.routes.forEach(({connection, vertices, routing}: {connection: any; vertices: any; routing: Record<string, any>}) => {
            connection.setVertices(vertices.clone(true));
            connection._routingMetaData = {...routing};
        });
    },

    redo: function () {
        this.block.rotate(this.quarterTurns);
    },
});
