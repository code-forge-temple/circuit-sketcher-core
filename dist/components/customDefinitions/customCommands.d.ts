/************************************************************************
 *    Copyright (C) 2024 Code Forge Temple                              *
 *    This file is part of circuit-sketcher-core project                *
 *    Licensed under the GNU General Public License v3.0.               *
 *    See the LICENSE file in the project root for more information.    *
 ************************************************************************/
/** DummyCommand
 * This command will be used when the changes are to many and
 * we cannot create custom commands for each change but we still
 * need to get the canvas command stack to trigger so we can save the data there
 */
export declare const DummyCommand: any;
/** CommandRotateBlock
 * Turns a CustomBlock by quarter turns clockwise (1 clockwise, 3 counterclockwise). Its wires get
 * routed afresh for the ports' new sides; undo turns it back and puts every wire back exactly as it
 * was routed before.
 */
export declare const CommandRotateBlock: any;
