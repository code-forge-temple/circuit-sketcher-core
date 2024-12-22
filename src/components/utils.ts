/************************************************************************
 *    Copyright (C) 2024 Code Forge Temple                              *
 *    This file is part of circuit-sketcher-core project                *
 *    Licensed under the GNU General Public License v3.0.               *
 *    See the LICENSE file in the project root for more information.    *
 ************************************************************************/

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