/************************************************************************
 *    Copyright (C) 2024 Code Forge Temple                              *
 *    This file is part of circuit-sketcher-core project                *
 *    Licensed under the GNU General Public License v3.0.               *
 *    See the LICENSE file in the project root for more information.    *
 ************************************************************************/

import {MenuItem, SIDE, Side} from "../../../types";
import {positionSubmenu} from "../../../utils";
import "./nodeMenu.scss";

type SaveNodeToLibrary = () => void;
type RemoveNode = () => void;
type ChangeImage = () => void;
type GetLockedPorts = () => boolean;
type SetLockedPorts = (lockedPorts: boolean) => void;
type AddPortOnSide = (side: string, type: string) => void;

export const PORT_TYPE = {
    IN: "in",
    OUT: "out",
    IO: "io",
} as const;

export type PortType = (typeof PORT_TYPE)[keyof typeof PORT_TYPE];

type MenuKeys = AddPortMenuKey | "save_node_to_library" | "remove_node" | "change_image" | "lock_ports_relocation" | "unlock_ports_relocation";

type AddPortMenuKey = `${Side}_${PortType}`;

export const nodeMenu = (addPortOnSide: AddPortOnSide, getLockedPorts: GetLockedPorts, setLockedPorts: SetLockedPorts, changeImage: ChangeImage, saveNodeToLibrary: SaveNodeToLibrary, removeNode: RemoveNode) =>
    (x: number, y: number) => {
        return $.contextMenu({
            selector: "body",
            events: {
                hide: function () {
                    $.contextMenu("destroy");
                },
            },
            callback: function (key: MenuKeys) {
                if (key === "remove_node") {
                    removeNode();
                } else if (key === "save_node_to_library") {
                    saveNodeToLibrary();
                } else if (key === "change_image") {
                    changeImage();
                } else if (key === "lock_ports_relocation" || key === "unlock_ports_relocation") {
                    setLockedPorts(key === "lock_ports_relocation" ? true : false);
                } else {
                    const [side, type] = key.split("_") as [Side, PortType];

                    if (Object.values(SIDE).includes(side) && Object.values(PORT_TYPE).includes(type)) {
                        addPortOnSide(side, type);
                    } else {
                        console.error("Invalid key:", key);
                    }
                }
            },
            x: x,
            y: y,
            items: nodeMenuItems(getLockedPorts),
            stopPropagation: true, // Prevent event bubbling
            positionSubmenu: function () {
                positionSubmenu(this);
            }
        });
    };

const nodeMenuItems = (getLockedPorts: GetLockedPorts) => {
    const lockUnlockPortsMenuItem: { unlock_ports_relocation?: MenuItem; lock_ports_relocation?: MenuItem } = {};

    if(getLockedPorts())
    {
        lockUnlockPortsMenuItem.unlock_ports_relocation = {
            name: "Unlock Ports Relocation",
            className: "context-menu-icon-unlock-ports",
        };
    } else {
        lockUnlockPortsMenuItem.lock_ports_relocation = {
            name: "Lock Ports Relocation",
            className: "context-menu-icon-lock-ports",
        };
    };

    return {
        add_port: {
            name: "Add Port",
            className: "context-menu-icon-add-port",
            items: {
                left: {
                    name: "Left",
                    items: {
                        [`${SIDE.LEFT}_${PORT_TYPE.IO}`]: {name: "IO"},
                        [`${SIDE.LEFT}_${PORT_TYPE.IN}`]: {name: "In"},
                        [`${SIDE.LEFT}_${PORT_TYPE.OUT}`]: {name: "Out"},
                    },
                },
                top: {
                    name: "Top",
                    items: {
                        [`${SIDE.TOP}_${PORT_TYPE.IO}`]: {name: "IO"},
                        [`${SIDE.TOP}_${PORT_TYPE.IN}`]: {name: "In"},
                        [`${SIDE.TOP}_${PORT_TYPE.OUT}`]: {name: "Out"},
                    },
                },
                right: {
                    name: "Right",
                    items: {
                        [`${SIDE.RIGHT}_${PORT_TYPE.IO}`]: {name: "IO"},
                        [`${SIDE.RIGHT}_${PORT_TYPE.IN}`]: {name: "In"},
                        [`${SIDE.RIGHT}_${PORT_TYPE.OUT}`]: {name: "Out"},
                    },
                },
                bottom: {
                    name: "Bottom",
                    items: {
                        [`${SIDE.BOTTOM}_${PORT_TYPE.IO}`]: {name: "IO"},
                        [`${SIDE.BOTTOM}_${PORT_TYPE.IN}`]: {name: "In"},
                        [`${SIDE.BOTTOM}_${PORT_TYPE.OUT}`]: {name: "Out"},
                    },
                },
            },
        },
        ...lockUnlockPortsMenuItem,
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
