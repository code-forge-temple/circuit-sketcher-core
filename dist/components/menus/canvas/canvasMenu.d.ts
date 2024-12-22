/************************************************************************
 *    Copyright (C) 2024 Code Forge Temple                              *
 *    This file is part of circuit-sketcher-core project                *
 *    Licensed under the GNU General Public License v3.0.               *
 *    See the LICENSE file in the project root for more information.    *
 ************************************************************************/
import "./canvasMenu.scss";
type CreateNode = ({ x, y }: {
    x: number;
    y: number;
}) => void;
type AddNodeFromLib = ({ x, y, nodeJson }: {
    x: number;
    y: number;
    nodeJson: Record<string, any>;
}) => void;
type RemoveNodeFromLib = (libKey: string) => void;
export declare const canvasMenu: (createNode: CreateNode, addNodeFromLib: AddNodeFromLib, removeNodeFromLib: RemoveNodeFromLib) => (x: number, y: number) => void;
export {};
