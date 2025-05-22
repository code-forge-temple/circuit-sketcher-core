/************************************************************************
 *    Copyright (C) 2024 Code Forge Temple                              *
 *    This file is part of circuit-sketcher-core project                *
 *    Licensed under the GNU General Public License v3.0.               *
 *    See the LICENSE file in the project root for more information.    *
 ************************************************************************/
import { Coords } from "./types";
export declare const toCapitalCase: (str: string) => string;
export declare const labelBasicProps: {
    fontFamily: string;
};
export declare const getNestedConstructorInstanceFromPath: (obj: any, path: string) => any;
export declare const positionSubmenu: (menu: any) => void;
export declare const PORT_RELOCATION_OUTER_OFFSET = 40;
export declare const isWithinVirtualBoundary: (figure: any, OFFSET: number, coords: Coords) => {
    isWithinBoundary: boolean;
    boundaryTopLeft: {
        x: number;
        y: number;
    };
    boundaryBottomRight: {
        x: any;
        y: any;
    };
};
export declare const createConnection: (sourcePort: any, targetPort: any) => any;
export declare const exportJsonFile: (nodeData: Record<string, any>, fileName: string) => void;
export declare const importJsonFile: () => Promise<unknown>;
export declare const DEFAULT_LABEL_NAME = "label-name";
