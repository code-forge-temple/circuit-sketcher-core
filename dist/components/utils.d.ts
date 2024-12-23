/************************************************************************
 *    Copyright (C) 2024 Code Forge Temple                              *
 *    This file is part of circuit-sketcher-core project                *
 *    Licensed under the GNU General Public License v3.0.               *
 *    See the LICENSE file in the project root for more information.    *
 ************************************************************************/
export declare const toCapitalCase: (str: string) => string;
export type Coords = {
    x: number;
    y: number;
};
export declare const labelBasicProps: {
    fontFamily: string;
};
export declare const getNestedConstructorInstanceFromPath: (obj: any, path: string) => any;
export declare const positionSubmenu: (menu: any) => void;
