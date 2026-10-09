/************************************************************************
 *    Copyright (C) 2024 Code Forge Temple                              *
 *    This file is part of circuit-sketcher-core project                *
 *    Licensed under the GNU General Public License v3.0.               *
 *    See the LICENSE file in the project root for more information.    *
 ************************************************************************/

import {MenuItem, SIDE, Side} from "../../../types";
import {openContextMenu, positionSubmenu} from "../../../utils";
import "./nodeMenu.scss";

type SaveNodeToLibrary = () => void;
type ExportNode = () => void;
type RemoveNode = () => void;
type ChangeImage = () => void;
type Rotate = (quarterTurns: number) => void;
type GetLockedPorts = () => boolean;
type SetLockedPorts = (lockedPorts: boolean) => void;
type AddPortOnSide = (side: string, type: string) => void;

export const PORT_TYPE = {
    IN: "in",
    OUT: "out",
    IO: "io",
} as const;

export type PortType = (typeof PORT_TYPE)[keyof typeof PORT_TYPE];

/* Display names for the port types. Shared with the port hover tooltip so the two can't
 * drift apart - what the menu calls a port is what the tooltip calls it.
 */
export const PORT_TYPE_NAME: Record<PortType, string> = {
    [PORT_TYPE.IN]: "In",
    [PORT_TYPE.OUT]: "Out",
    [PORT_TYPE.IO]: "IO",
};

type MenuKeys = AddPortMenuKey | "export_node" | "save_node_to_library" | "remove_node" | "change_image" | "lock_ports_relocation" | "unlock_ports_relocation" | "rotate_clockwise" | "rotate_counterclockwise";

type AddPortMenuKey = `${Side}_${PortType}`;

export const nodeMenu = (
    addPortOnSide: AddPortOnSide,
    getLockedPorts: GetLockedPorts,
    setLockedPorts: SetLockedPorts,
    rotate: Rotate,
    changeImage: ChangeImage,
    saveNodeToLibrary: SaveNodeToLibrary,
    exportNode: ExportNode,
    removeNode: RemoveNode
) =>
    (x: number, y: number) => {
        return openContextMenu({
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
                } else if (key === "export_node") {
                    exportNode();
                } else if (key === "rotate_clockwise" || key === "rotate_counterclockwise") {
                    // in quarter turns clockwise: three of them make one counterclockwise
                    rotate(key === "rotate_clockwise" ? 1 : 3);
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
            name: "Add Port...",
            className: "context-menu-icon-add-port",
            items: {
                left: {
                    name: "Left",
                    items: {
                        [`${SIDE.LEFT}_${PORT_TYPE.IO}`]: {name: PORT_TYPE_NAME[PORT_TYPE.IO], className: "context-menu-icon-add-port-left-io"},
                        [`${SIDE.LEFT}_${PORT_TYPE.IN}`]: {name: PORT_TYPE_NAME[PORT_TYPE.IN], className: "context-menu-icon-add-port-left-in"},
                        [`${SIDE.LEFT}_${PORT_TYPE.OUT}`]: {name: PORT_TYPE_NAME[PORT_TYPE.OUT], className: "context-menu-icon-add-port-left-out"},
                    },
                    className: "context-menu-icon-left",
                },
                top: {
                    name: "Top",
                    items: {
                        [`${SIDE.TOP}_${PORT_TYPE.IO}`]: {name: PORT_TYPE_NAME[PORT_TYPE.IO], className: "context-menu-icon-add-port-top-io"},
                        [`${SIDE.TOP}_${PORT_TYPE.IN}`]: {name: PORT_TYPE_NAME[PORT_TYPE.IN], className: "context-menu-icon-add-port-top-in"},
                        [`${SIDE.TOP}_${PORT_TYPE.OUT}`]: {name: PORT_TYPE_NAME[PORT_TYPE.OUT], className: "context-menu-icon-add-port-top-out"},
                    },
                    className: "context-menu-icon-top",
                },
                right: {
                    name: "Right",
                    items: {
                        [`${SIDE.RIGHT}_${PORT_TYPE.IO}`]: {name: PORT_TYPE_NAME[PORT_TYPE.IO], className: "context-menu-icon-add-port-right-io"},
                        [`${SIDE.RIGHT}_${PORT_TYPE.IN}`]: {name: PORT_TYPE_NAME[PORT_TYPE.IN], className: "context-menu-icon-add-port-right-in"},
                        [`${SIDE.RIGHT}_${PORT_TYPE.OUT}`]: {name: PORT_TYPE_NAME[PORT_TYPE.OUT], className: "context-menu-icon-add-port-right-out"},
                    },
                    className: "context-menu-icon-right",
                },
                bottom: {
                    name: "Bottom",
                    items: {
                        [`${SIDE.BOTTOM}_${PORT_TYPE.IO}`]: {name: PORT_TYPE_NAME[PORT_TYPE.IO], className: "context-menu-icon-add-port-bottom-io"},
                        [`${SIDE.BOTTOM}_${PORT_TYPE.IN}`]: {name: PORT_TYPE_NAME[PORT_TYPE.IN], className: "context-menu-icon-add-port-bottom-in"},
                        [`${SIDE.BOTTOM}_${PORT_TYPE.OUT}`]: {name: PORT_TYPE_NAME[PORT_TYPE.OUT], className: "context-menu-icon-add-port-bottom-out"},
                    },
                    className: "context-menu-icon-bottom",
                },
            },
        },
        ...lockUnlockPortsMenuItem,
        rotate: {
            name: "Rotate",
            className: "context-menu-icon-rotate-clockwise",
            items: {
                rotate_clockwise: {name: "90° Clockwise", className: "context-menu-icon-rotate-clockwise"},
                rotate_counterclockwise: {name: "90° Counterclockwise", className: "context-menu-icon-rotate-counterclockwise"},
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
        export_node: {
            name: "Export Node",
            className: "context-menu-icon-export-node",
        },
        remove_node: {
            name: "Remove Node",
            className: "context-menu-icon-remove-node",
        },
    };
};
