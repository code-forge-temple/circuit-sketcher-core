/************************************************************************
 *    Copyright (C) 2024 Code Forge Temple                              *
 *    This file is part of circuit-sketcher-core project                *
 *    Licensed under the GNU General Public License v3.0.               *
 *    See the LICENSE file in the project root for more information.    *
 ************************************************************************/

import draw2d from "draw2d";

export const toCapitalCase = (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

export type Coords = {
    x: number;
    y: number;
};

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

    const viewportWidth = $(window).width();

    if(viewportWidth === undefined) return;

    if(currentMenuRect.x + currentMenuRect.width + submenuRect.width < viewportWidth - 10) {
        $submenu.css({left: `${currentMenuRect.width - 5}px`});
    } else {
        $submenu.css({left: `${-submenuRect.width + 5}px`});
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

const router = new draw2d.layout.connection.InteractiveManhattanConnectionRouter();

router.abortRoutingOnFirstVertexNode = false;

export const createConnection = function (sourcePort:any, targetPort:any) {
    const connection = new draw2d.Connection({
        outlineColor: "#00A8F0",
        outlineStroke: 1,
        router,
        stroke: 1,
        radius: 2,
    });

    if (sourcePort) {
        connection.setSource(sourcePort);
        connection.setTarget(targetPort);
    }

    return connection;
};
