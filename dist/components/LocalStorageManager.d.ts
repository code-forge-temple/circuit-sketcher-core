/************************************************************************
 *    Copyright (C) 2024 Code Forge Temple                              *
 *    This file is part of circuit-sketcher-core project                *
 *    Licensed under the GNU General Public License v3.0.               *
 *    See the LICENSE file in the project root for more information.    *
 ************************************************************************/
type Draw2dStringifiedNode = Record<string, any>;
type LocalStorageData = {
    library: {
        [key: string]: Draw2dStringifiedNode;
    };
};
export declare class LocalStorageManager {
    static getLibrary(stringify: true): Promise<string>;
    static getLibrary(stringify?: false): Promise<LocalStorageData["library"]>;
    static setLibrary(library: string): Promise<void>;
    static setLibrary(library: LocalStorageData["library"]): Promise<void>;
    static addItemToLibrary(key: string, value: Record<string, any> | undefined): Promise<void>;
    static removeItemFromLibrary(key: string): Promise<void>;
}
export {};
