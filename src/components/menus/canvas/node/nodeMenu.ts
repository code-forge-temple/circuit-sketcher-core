/************************************************************************
 *    Copyright (C) 2024 Code Forge Temple                              *
 *    This file is part of circuit-sketcher-core project                *
 *    Licensed under the GNU General Public License v3.0.               *
 *    See the LICENSE file in the project root for more information.    *
 ************************************************************************/

import {positionSubmenu} from "../../../utils";
import "./nodeMenu.scss";

type SaveNodeToLibrary = () => void;
type RemoveNode = () => void;
type ChangeImage = () => void;
type AddPortOnSide = (side: string, type: string) => void;

export const NODE_SIDE = {
    LEFT: "left",
    TOP: "top",
    RIGHT: "right",
    BOTTOM: "bottom",
} as const;

export type NodeSide = (typeof NODE_SIDE)[keyof typeof NODE_SIDE];

export const PORT_TYPE = {
    IN: "in",
    OUT: "out",
    IO: "io",
} as const;

export type PortType = (typeof PORT_TYPE)[keyof typeof PORT_TYPE];

type AddPortMenuKey = `${NodeSide}_${PortType}`;

export const nodeMenu = (addPortOnSide: AddPortOnSide, changeImage: ChangeImage, saveNodeToLibrary: SaveNodeToLibrary, removeNode: RemoveNode) =>
    (x: number, y: number) => {
        return $.contextMenu({
            selector: "body",
            events: {
                hide: function () {
                    $.contextMenu("destroy");
                },
            },
            callback: function (key: AddPortMenuKey | "save_node_to_library" | "remove_node" | "change_image") {
                if (key === "remove_node") {
                    removeNode();
                } else if (key === "save_node_to_library") {
                    saveNodeToLibrary();
                } else if (key === "change_image") {
                    changeImage();
                } else {
                    const [side, type] = key.split("_") as [NodeSide, PortType];

                    if (Object.values(NODE_SIDE).includes(side) && Object.values(PORT_TYPE).includes(type)) {
                        addPortOnSide(side, type);
                    } else {
                        console.error("Invalid key:", key);
                    }
                }
            },
            x: x,
            y: y,
            items: nodeMenuItems(),
            stopPropagation: true, // Prevent event bubbling
            positionSubmenu: function () {
                positionSubmenu(this);
            }
        });
    };

const nodeMenuItems = () => {
    return {
        add_port: {
            name: "Add Port",
            className: "context-menu-icon-add-port",
            items: {
                left: {
                    name: "Left",
                    items: {
                        [`${NODE_SIDE.LEFT}_${PORT_TYPE.IO}`]: {name: "IO"},
                        [`${NODE_SIDE.LEFT}_${PORT_TYPE.IN}`]: {name: "In"},
                        [`${NODE_SIDE.LEFT}_${PORT_TYPE.OUT}`]: {name: "Out"},
                    },
                },
                top: {
                    name: "Top",
                    items: {
                        [`${NODE_SIDE.TOP}_${PORT_TYPE.IO}`]: {name: "IO"},
                        [`${NODE_SIDE.TOP}_${PORT_TYPE.IN}`]: {name: "In"},
                        [`${NODE_SIDE.TOP}_${PORT_TYPE.OUT}`]: {name: "Out"},
                    },
                },
                right: {
                    name: "Right",
                    items: {
                        [`${NODE_SIDE.RIGHT}_${PORT_TYPE.IO}`]: {name: "IO"},
                        [`${NODE_SIDE.RIGHT}_${PORT_TYPE.IN}`]: {name: "In"},
                        [`${NODE_SIDE.RIGHT}_${PORT_TYPE.OUT}`]: {name: "Out"},
                    },
                },
                bottom: {
                    name: "Bottom",
                    items: {
                        [`${NODE_SIDE.BOTTOM}_${PORT_TYPE.IO}`]: {name: "IO"},
                        [`${NODE_SIDE.BOTTOM}_${PORT_TYPE.IN}`]: {name: "In"},
                        [`${NODE_SIDE.BOTTOM}_${PORT_TYPE.OUT}`]: {name: "Out"},
                    },
                },
            },
        },
        change_image: {
            name: "Change Image",
            className: "context-menu-icon-change-image",
        },
        save_node_to_library: {
            name: "Save Node to Library",
            className: "context-menu-icon-save-node-to-library",
        },
        remove_node: {
            name: "Remove Node",
            className: "context-menu-icon-remove-node",
        },
    };
};
