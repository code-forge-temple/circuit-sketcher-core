/************************************************************************
 *    Copyright (C) 2024 Code Forge Temple                              *
 *    This file is part of circuit-sketcher-core project                *
 *    Licensed under the GNU General Public License v3.0.               *
 *    See the LICENSE file in the project root for more information.    *
 ************************************************************************/

import {LocalStorageManager} from "../../LocalStorageManager";
import {LibrarySchemaSchema} from "../../types";
import {exportJsonFile, importJsonFile, positionSubmenu} from "../../utils";
import "./canvasMenu.scss";

type CreateNode = ({x, y}: {x: number, y: number}) => void;
type AddNodeToCanvas = ({x, y, nodeJson}: {x: number, y: number, nodeJson: Record<string, any>}) => void;
type RemoveNodeFromLib = (libKey: string) => void;
type ImportLibrary = (library: Record<string, any>) => void;

type LibraryNodeKey = string;

type MenuKeys = "create_node" | "import_node";
const LIBRARY_PAGE_SIZE = 15;
let startIdx = 0;
const LIBRARY_MENU_ITEM = "library";

const toggleLibraryMenuItems = (menuLibraryItemsArray: any[], libraryItemsArray: any[], startIdx: number, endIdx: number) => {
    for (let i = 0; i < libraryItemsArray.length; i++) {
        const itemName = libraryItemsArray[i].name;
        const element = $(menuLibraryItemsArray[itemName].$node)[0];

        if (i >= startIdx && i < endIdx) {
            element.classList.remove("context-menu-item-hidden");

            /*****jquery-contextmenu bug fix*****/
            const children = element.querySelectorAll(".context-menu-item-hidden");

            for (let j = 0; j < children.length; j++) {
                children[j].classList.remove("context-menu-item-hidden");
            }
            /************************************/
        } else {
            element.classList.add("context-menu-item-hidden");
        }
    }
}

export const canvasMenu = (createNode: CreateNode, addNodeToCanvas: AddNodeToCanvas, removeNodeFromLib: RemoveNodeFromLib, importLibrary: ImportLibrary) =>
    async (x: number, y: number) => {
        const canvasArea = document.getElementById("circuit-board");
        const canvasAreaRect = canvasArea!.getBoundingClientRect();
        const newX = x + canvasAreaRect.left;
        const newY = y + canvasAreaRect.top;
        const library = await LocalStorageManager.getLibrary();
        const endIdx = Math.min(startIdx + LIBRARY_PAGE_SIZE, Object.keys(library).length);
        const libraryItemsArray = Object.keys(library).map((key, idx) => {
            let className = "context-menu-icon-lib-node";

            if (idx < startIdx || idx >= endIdx) {
                className += " context-menu-item-hidden";
            }

            return {
                name: key,
                items: {
                    [`add_${key}`]: {
                        name: "Add to Canvas",
                        callback: (menuKey: `add_${LibraryNodeKey}`) => {
                            const libraryNodeKey = menuKey.replace("add_", "");

                            addNodeToCanvas({x: newX, y: newY, nodeJson: library[libraryNodeKey]});
                        },
                        className: "context-menu-icon-lib-add-node-from-lib"
                    },
                    [`remove_${key}`]: {
                        name: "Remove from Library",
                        callback: (menuKey: `remove_${LibraryNodeKey}`) => {
                            const libraryNodeKey = menuKey.replace("remove_", "");

                            removeNodeFromLib(libraryNodeKey);
                        },
                        className: "context-menu-icon-lib-remove-node-from-lib"
                    },
                    [`export_${key}`]: {
                        name: "Export Node",
                        callback: (menuKey: `export_${LibraryNodeKey}`) => {
                            const libraryNodeKey = menuKey.replace("export_", "");
                            const data = {[libraryNodeKey]: library[libraryNodeKey]};

                            exportJsonFile(data, libraryNodeKey);
                        },
                        className: "context-menu-icon-lib-export-node"
                    }
                },
                className
            };
        });

        const scrollLibraryUpDownClassName = libraryItemsArray.length > LIBRARY_PAGE_SIZE ? "" : " context-menu-item-hidden";

        const scrollLibraryUp = {
            name: "Up...",
            callback: (key:any, options:any) => {
                startIdx = Math.max(0, startIdx - LIBRARY_PAGE_SIZE);
                const endIdx = Math.min(startIdx + LIBRARY_PAGE_SIZE, libraryItemsArray.length);

                toggleLibraryMenuItems(options.items[LIBRARY_MENU_ITEM].items, libraryItemsArray, startIdx, endIdx);

                return false;
            },
            className: "context-menu-icon-lib-scroll-up" + scrollLibraryUpDownClassName
        };

        console.log("libraryItemsArray.length", libraryItemsArray.length);

        const scrollLibraryDown = {
            name: "Down...",
            callback: (key:any, options:any) => {
                startIdx = Math.min(libraryItemsArray.length - LIBRARY_PAGE_SIZE, startIdx + LIBRARY_PAGE_SIZE);
                const endIdx = Math.min(startIdx + LIBRARY_PAGE_SIZE, libraryItemsArray.length);

                toggleLibraryMenuItems(options.items[LIBRARY_MENU_ITEM].items, libraryItemsArray, startIdx, endIdx);

                return false;
            },
            className: "context-menu-icon-lib-scroll-down" + scrollLibraryUpDownClassName
        };

        const separator = {
            "sep1": "---------",
        };

        const libraryActionsMenuItems = {
            "import_library": {
                name: "Import Library",
                className: "context-menu-icon-lib-import-library",
                callback: () => {
                    importJsonFile().then((data) => {
                        try{
                            const library = LibrarySchemaSchema.parse(data);

                            importLibrary(library);
                        }
                        catch {
                            alert("Invalid library format");
                        }
                    });
                }
            },
            "export_library": {
                name: "Export Library",
                className: "context-menu-icon-lib-export-library",
                callback: async () => {
                    const library = await LocalStorageManager.getLibrary();

                    exportJsonFile(library, "library");
                }
            }
        };

        const libraryMenuItems = libraryItemsArray.length
            ? {
                "scroll_library_up": scrollLibraryUp,
                ...Object.fromEntries(libraryItemsArray.map((item) => [item.name, item])),
                "scroll_library_down": scrollLibraryDown,
                ...separator,
                ...libraryActionsMenuItems
            }
            : {
                no_items: {name: "No items in library", disabled: true},
                ...separator,
                ...libraryActionsMenuItems
            };

        return $.contextMenu({
            selector: "body",
            events: {
                hide: function () {
                    $.contextMenu("destroy");
                },
            },
            callback: function (key: MenuKeys) {
                if(key === "create_node") {
                    createNode({x: newX, y: newY});
                } else if(key === "import_node") {
                    importJsonFile().then((data) => {
                        try {
                            const library = LibrarySchemaSchema.parse(data);
                            const nodeJson = Object.values(library)[0];

                            addNodeToCanvas({x: newX, y: newY, nodeJson});
                        }
                        catch {
                            alert("Invalid node format");
                        }
                    });
                }
            },
            x: x,
            y: y,
            items: {
                create_node: {
                    name: "Create Node",
                    className: "context-menu-icon-create-node"
                },
                import_node: {
                    name: "Import Node",
                    className: "context-menu-icon-import-node"
                },
                [LIBRARY_MENU_ITEM]: {
                    name: "Library...",
                    items: libraryMenuItems,
                    className: "context-menu-icon-library"
                },
            },
            stopPropagation: true,
            positionSubmenu: function () {
                positionSubmenu(this);
            }
        });
    };