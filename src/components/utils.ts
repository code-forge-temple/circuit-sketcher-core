/************************************************************************
 *    Copyright (C) 2024 Code Forge Temple                              *
 *    This file is part of circuit-sketcher-core project                *
 *    Licensed under the GNU General Public License v3.0.               *
 *    See the LICENSE file in the project root for more information.    *
 ************************************************************************/

import {Coords} from "./types";
import {CustomConnection} from "./customDefinitions/customConnection";

export const toCapitalCase = (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

export const labelBasicProps = {
    fontFamily: `'Consolas', monospace`
};

const getNestedProperty = (obj:any, path:string) => {
    return path.split(".").reduce((acc, part) => acc && acc[part], obj);
};

export const getNestedConstructorInstanceFromPath = (obj: any, path: string) => {
    const Ctor = getNestedProperty(obj, path);

    if (Ctor !== undefined) {
        return new Ctor();
    } else {
        throw new Error(`Constructor ${path} is not defined in ${obj}`);
    }
}

const CONTEXT_MENU_TRIGGER = "body";

// where the last mouse button went down - the spot a context menu opens at
let pointer: Coords = {x: 0, y: 0};

document.addEventListener("mousedown", (event) => {
    pointer = {x: event.pageX, y: event.pageY};
}, {capture: true, passive: true});

/* jquery-contextmenu picks an item on "mouseup" of any button. On macOS a menu opens while the right
 * button is still down, right under the pointer, so releasing it picked the item there and the menu
 * just flashed. Only the left button chooses an item - for every menu, draw2d's segment menu included.
 */
document.addEventListener("mouseup", (event) => {
    if (event.button !== 0 && event.target instanceof Element && event.target.closest(".context-menu-item")) {
        event.stopPropagation();
    }
}, true);

/* Opens a context menu from our own code instead of leaving it to the browser's "contextmenu" event.
 * macOS fires that event when the right button goes down (Windows when it comes up), so on a Mac it
 * arrived before the canvas menu - built asynchronously - was registered: nothing showed, and the next
 * right click opened the stale menu left over from the previous one.
 */
export const openContextMenu = (options: Record<string, any>) => {
    // one menu at a time
    $.contextMenu("destroy");

    // a menu destroyed while open leaves its trigger marked active, and an active trigger opens nothing
    $(CONTEXT_MENU_TRIGGER).removeClass("context-menu-active").removeData("contextMenu");

    $.contextMenu({...options, selector: CONTEXT_MENU_TRIGGER, trigger: "none"});

    $(CONTEXT_MENU_TRIGGER).contextMenu(pointer);
};

export const positionSubmenu = (menu: any) => {
    const $submenu = $(menu).children("ul.context-menu-list");
    const submenuRect = $submenu[0].getBoundingClientRect();
    const currentMenuRect = $(menu).parent()[0].getBoundingClientRect();
    const currentMenuItemRect = $(menu)[0].getBoundingClientRect();

    const viewportWidth = $(window).width();
    const viewportHeight = $(window).height();

    if(viewportWidth === undefined || viewportHeight === undefined) return;

    if(currentMenuRect.x + currentMenuRect.width + submenuRect.width < viewportWidth - 10) {
        $submenu.css({left: `${currentMenuRect.width - 5}px`});
    } else {
        $submenu.css({left: `${-submenuRect.width + 5}px`});
    }

    if (currentMenuRect.y + currentMenuRect.height + submenuRect.height > viewportHeight - 10) {
        $submenu.css({top: `${-submenuRect.height + currentMenuItemRect.height}px`});
    }
}

export const PORT_RELOCATION_OUTER_OFFSET = 40;

export const isWithinVirtualBoundary = (figure: any, OFFSET: number, coords: Coords) => {
    const position = figure.getAbsolutePosition();
    const width = figure.getWidth();
    const height = figure.getHeight();

    const boundaryTopLeft = {
        x: position.x - OFFSET,
        y: position.y - OFFSET
    };
    const boundaryBottomRight = {
        x: position.x + width + OFFSET,
        y: position.y + height + OFFSET
    };

    const isWithinBoundary =
        coords.x >= boundaryTopLeft.x &&
        coords.x <= boundaryBottomRight.x &&
        coords.y >= boundaryTopLeft.y &&
        coords.y <= boundaryBottomRight.y;

    return {
        isWithinBoundary,
        boundaryTopLeft,
        boundaryBottomRight
    }
}

export const createConnection = function (sourcePort: any, targetPort: any) {
    const connection = new CustomConnection();

    if (sourcePort) {
        connection.setSource(sourcePort);
        connection.setTarget(targetPort);
    }

    return connection;
};

export const exportJsonFile = (nodeData: Record<string, any>, fileName: string) => {
    // eslint-disable-next-line no-control-regex
    const safeFileName = fileName.replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_");
    const blob = new Blob([JSON.stringify(nodeData, null, 4)], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = `${safeFileName}.json`;

    document.body.appendChild(a);

    a.click();

    URL.revokeObjectURL(url);

    a.remove();
}

export const importJsonFile = () => {
    return new Promise((resolve, reject) => {
        const fileInput = document.createElement("input");

        fileInput.type = "file";
        fileInput.accept = ".json";
        fileInput.onchange = (event) => {
            const target = event.target as HTMLInputElement;

            if (target.files && target.files.length > 0) {
                const reader = new FileReader();

                reader.onload = (e) => {
                    const content = e.target?.result;

                    if (content) {
                        try {
                            resolve(JSON.parse(content as string));
                        } catch (error) {
                            console.error("Error parsing JSON:", error);

                            reject(error);
                        } finally {
                            fileInput.remove();
                        }
                    }
                };

                reader.readAsText(target.files[0]);
            }
        };

        fileInput.click();
    });
}

export const DEFAULT_LABEL_NAME = "label-name";