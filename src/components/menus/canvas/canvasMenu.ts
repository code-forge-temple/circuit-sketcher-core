/************************************************************************
 *    Copyright (C) 2024 Code Forge Temple                              *
 *    This file is part of circuit-sketcher-core project                *
 *    Licensed under the GNU General Public License v3.0.               *
 *    See the LICENSE file in the project root for more information.    *
 ************************************************************************/

import {LocalStorageManager} from "../../LocalStorageManager";
import {positionSubmenu} from "../../utils";
import "./canvasMenu.scss";

type CreateNode = ({x, y}: {x: number, y: number}) => void;
type AddNodeFromLib = ({x, y, nodeJson}: {x: number, y: number, nodeJson: Record<string, any>}) => void;
type RemoveNodeFromLib = (libKey: string) => void;

type LibraryNodeKey = string;

export const canvasMenu = (createNode: CreateNode, addNodeFromLib: AddNodeFromLib, removeNodeFromLib: RemoveNodeFromLib) =>
    (x: number, y: number) => {
        const canvasArea = document.getElementById("circuit-board");
        const canvasAreaRect = canvasArea!.getBoundingClientRect();
        const newX = x + canvasAreaRect.left;
        const newY = y + canvasAreaRect.top;
        const library = LocalStorageManager.getLibrary();
        const libItems = Object.keys(library).map((key) => {
            return {
                name: key,
                items: {
                    [`add_${key}`]: {
                        name: "Add to Canvas",
                        callback: (menuKey: `add_${LibraryNodeKey}`) => {
                            const libraryNodeKey = menuKey.replace("add_", "");

                            addNodeFromLib({x: newX, y: newY, nodeJson: library[libraryNodeKey]});
                        }
                    },
                    [`remove_${key}`]: {
                        name: "Remove from Library",
                        callback: (menuKey: `remove_${LibraryNodeKey}`) => {
                            const libraryNodeKey = menuKey.replace("remove_", "");

                            removeNodeFromLib(libraryNodeKey);
                        }
                    }
                }
            };
        });

        return $.contextMenu({
            selector: "body",
            events: {
                hide: function () {
                    $.contextMenu("destroy");
                },
            },
            callback: function () {
                createNode({x: newX, y: newY});
            },
            x: x,
            y: y,
            items: {
                create_node: {
                    name: "Create Node",
                    className: "context-menu-icon-create-node"
                },
                add_node_from_lib: {
                    name: "Add Node from Library",
                    items: libItems.length ? libItems : [{name: "No items in library", disabled: true}],
                    className: "context-menu-icon-add-node-from-lib"
                },
            },
            stopPropagation: true, // Prevent event bubbling
            positionSubmenu: function () {
                positionSubmenu(this);
            }
        });
    };