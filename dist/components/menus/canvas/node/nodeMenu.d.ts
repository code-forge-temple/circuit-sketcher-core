/************************************************************************
 *    Copyright (C) 2024 Code Forge Temple                              *
 *    This file is part of circuit-sketcher-core project                *
 *    Licensed under the GNU General Public License v3.0.               *
 *    See the LICENSE file in the project root for more information.    *
 ************************************************************************/
import "./nodeMenu.scss";
type SaveNodeToLibrary = () => void;
type ExportNode = () => void;
type RemoveNode = () => void;
type ChangeImage = () => void;
type GetLockedPorts = () => boolean;
type SetLockedPorts = (lockedPorts: boolean) => void;
type AddPortOnSide = (side: string, type: string) => void;
export declare const PORT_TYPE: {
    readonly IN: "in";
    readonly OUT: "out";
    readonly IO: "io";
};
export type PortType = (typeof PORT_TYPE)[keyof typeof PORT_TYPE];
export declare const nodeMenu: (addPortOnSide: AddPortOnSide, getLockedPorts: GetLockedPorts, setLockedPorts: SetLockedPorts, changeImage: ChangeImage, saveNodeToLibrary: SaveNodeToLibrary, exportNode: ExportNode, removeNode: RemoveNode) => (x: number, y: number) => void;
export {};
