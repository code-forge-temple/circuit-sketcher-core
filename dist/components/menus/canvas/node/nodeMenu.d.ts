/************************************************************************
 *    Copyright (C) 2024 Code Forge Temple                              *
 *    This file is part of circuit-sketcher-core project                *
 *    Licensed under the GNU General Public License v3.0.               *
 *    See the LICENSE file in the project root for more information.    *
 ************************************************************************/
import "./nodeMenu.scss";
type SaveNodeToLibrary = () => void;
type RemoveNode = () => void;
type ChangeImage = () => void;
type AddPortOnSide = (side: string, type: string) => void;
export declare const NODE_SIDE: {
    readonly LEFT: "left";
    readonly TOP: "top";
    readonly RIGHT: "right";
    readonly BOTTOM: "bottom";
};
export type NodeSide = (typeof NODE_SIDE)[keyof typeof NODE_SIDE];
export declare const PORT_TYPE: {
    readonly IN: "in";
    readonly OUT: "out";
    readonly IO: "io";
};
export type PortType = (typeof PORT_TYPE)[keyof typeof PORT_TYPE];
export declare const nodeMenu: (addPortOnSide: AddPortOnSide, changeImage: ChangeImage, saveNodeToLibrary: SaveNodeToLibrary, removeNode: RemoveNode) => (x: number, y: number) => void;
export {};
