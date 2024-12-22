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