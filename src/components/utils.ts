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

export const DEFAULT_LABEL_NAME = "label-name";