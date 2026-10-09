/************************************************************************
 *    Copyright (C) 2024 Code Forge Temple                              *
 *    This file is part of circuit-sketcher-core project                *
 *    Licensed under the GNU General Public License v3.0.               *
 *    See the LICENSE file in the project root for more information.    *
 ************************************************************************/

import {LocalStorageManager} from "../../LocalStorageManager";
import {
    buildLibraryTree,
    getGroup,
    getName,
    isDefaultGroup,
    LibraryTree,
    markLibraryOrigin,
    toExportFile,
    withoutLibraryOrigin
} from "../../libraryTree";
import {LibrarySchemaSchema} from "../../types";
import {exportJsonFile, importJsonFile, openContextMenu, positionSubmenu} from "../../utils";
import "./canvasMenu.scss";

type CreateNode = ({x, y}: {x: number, y: number}) => void;
type AddNodeToCanvas = ({x, y, nodeJson}: {x: number, y: number, nodeJson: Record<string, any>}) => void;
type RemoveNodeFromLib = (libKey: string) => void;
type ManageLibrary = () => void;

type MenuKeys = "create_node" | "import_node";
type MenuItems = Record<string, any>;

const LIBRARY_PAGE_SIZE = 15;
const LIBRARY_MENU_ITEM = "library";
const HIDDEN_CLASS = "context-menu-item-hidden";

// the first entry shown on each library level (keyed by group path), remembered between openings
const pageStarts = new Map<string, number>();

const groupMenuKey = (path: string) => `group:${path}`;

// the items of a library level, reached through the keys of the group items leading down to it
const getLevelItems = (options: any, levelKeys: string[]): MenuItems =>
    levelKeys.reduce((items, key) => items[key].items, options.items[LIBRARY_MENU_ITEM].items);

const showLibraryPage = (levelItems: MenuItems, entryKeys: string[], start: number) => {
    entryKeys.forEach((key, i) => {
        const element = $(levelItems[key].$node)[0];

        if (i >= start && i < start + LIBRARY_PAGE_SIZE) {
            element.classList.remove(HIDDEN_CLASS);

            /*****jquery-contextmenu bug fix*****/
            // a submenu list gets the class names of its item, the hidden one included
            element.querySelector(":scope > ul")?.classList.remove(HIDDEN_CLASS);
            /************************************/
        } else {
            element.classList.add(HIDDEN_CLASS);
        }
    });
}

/* One level of the library menu: its groups as submenus, then its components. A level with more
 * entries than fit on a page gets Up/Down items that page through it in place.
 */
const libraryLevelItems = (level: LibraryTree, levelKeys: string[], componentItem: (libraryKey: string) => MenuItems): MenuItems => {
    const entries: [string, MenuItems][] = [
        ...level.groups.map((group): [string, MenuItems] => {
            const key = groupMenuKey(group.path);

            return [key, {
                name: group.name,
                items: libraryLevelItems(group, [...levelKeys, key], componentItem),
                className: "context-menu-icon-lib-group"
            }];
        }),
        ...level.components.map((libraryKey): [string, MenuItems] => [`component:${libraryKey}`, componentItem(libraryKey)]),
    ];

    if (entries.length <= LIBRARY_PAGE_SIZE) {
        return Object.fromEntries(entries);
    }

    const entryKeys = entries.map(([key]) => key);
    const lastStart = entries.length - LIBRARY_PAGE_SIZE;
    const start = Math.min(pageStarts.get(level.path) ?? 0, lastStart);

    pageStarts.set(level.path, start);

    entries.forEach(([, item], i) => {
        if (i < start || i >= start + LIBRARY_PAGE_SIZE) {
            item.className += ` ${HIDDEN_CLASS}`;
        }
    });

    const scroll = (pages: number) => (_key: string, options: any) => {
        const next = Math.max(0, Math.min(lastStart, (pageStarts.get(level.path) ?? 0) + pages * LIBRARY_PAGE_SIZE));

        pageStarts.set(level.path, next);
        showLibraryPage(getLevelItems(options, levelKeys), entryKeys, next);

        /* returning false keeps the menu open, after which jquery-contextmenu re-measures every menu
         * level - and each of its measurements comes out a pixel wider, so every page turn widened the
         * menus. Put the widths back once it is done; a microtask still runs before the next paint. */
        const lists: HTMLElement[] = options.$menu.find("ul").addBack().toArray();
        const widths = lists.map((list) => list.style.width);

        queueMicrotask(() => {
            lists.forEach((list, i) => {
                list.style.width = widths[i];
            });
        });

        return false;
    };

    return {
        [`scroll_up:${level.path}`]: {
            name: "Up...",
            callback: scroll(-1),
            className: "context-menu-icon-lib-scroll-up"
        },
        ...Object.fromEntries(entries),
        [`scroll_down:${level.path}`]: {
            name: "Down...",
            callback: scroll(1),
            className: "context-menu-icon-lib-scroll-down"
        },
    };
}

export const canvasMenu = (createNode: CreateNode, addNodeToCanvas: AddNodeToCanvas, removeNodeFromLib: RemoveNodeFromLib, manageLibrary: ManageLibrary) =>
    async (x: number, y: number) => {
        const canvasArea = document.getElementById("circuit-board");
        const canvasAreaRect = canvasArea!.getBoundingClientRect();
        const newX = x + canvasAreaRect.left;
        const newY = y + canvasAreaRect.top;
        const library = await LocalStorageManager.getLibrary();

        const componentItem = (libraryKey: string): MenuItems => {
            const entry = library[libraryKey];
            const name = getName(entry, libraryKey);

            return {
                name,
                items: {
                    [`add_${libraryKey}`]: {
                        name: "Add to Canvas",
                        callback: () => {
                            addNodeToCanvas({x: newX, y: newY, nodeJson: markLibraryOrigin(entry)});
                        },
                        className: "context-menu-icon-lib-add-node-from-lib"
                    },
                    /* "default" can only be placed: Sync is all that changes it, and it is shared
                     * through circuit-sketcher-lib itself rather than exported */
                    ...(isDefaultGroup(getGroup(entry)) ? {} : {
                        [`remove_${libraryKey}`]: {
                            name: "Remove from Library",
                            callback: () => {
                                removeNodeFromLib(libraryKey);
                            },
                            className: "context-menu-icon-lib-remove-node-from-lib"
                        },
                        [`export_${libraryKey}`]: {
                            name: "Export Node",
                            callback: () => {
                                exportJsonFile(toExportFile({[libraryKey]: entry}), name);
                            },
                            className: "context-menu-icon-lib-export-node"
                        }
                    }),
                },
                className: "context-menu-icon-lib-node"
            };
        };

        const separator = {
            "sep1": "---------",
        };

        // importing and exporting (the whole library, or any group of it) happens in the dialog
        const libraryActionsMenuItems = {
            "manage_library": {
                name: "Manage Library...",
                className: "context-menu-icon-lib-manage",
                callback: () => {
                    manageLibrary();
                }
            }
        };

        const libraryMenuItems = Object.keys(library).length
            ? {
                ...libraryLevelItems(buildLibraryTree(library), [], componentItem),
                ...separator,
                ...libraryActionsMenuItems
            }
            : {
                no_items: {name: "No items in library", disabled: true},
                ...separator,
                ...libraryActionsMenuItems
            };

        return openContextMenu({
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
                            // a file isn't part of this library, so the node has no group to be saved back to
                            const nodeJson = withoutLibraryOrigin(Object.values(library)[0]);

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
