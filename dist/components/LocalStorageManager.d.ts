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
    private static LOCAL_STORAGE_KEY;
    private static getLocalStorageData;
    private static setLocalStorageData;
    static getLibrary(stringify: true): string;
    static getLibrary(stringify?: false): LocalStorageData["library"];
    static setLibrary(library: string): void;
    static addItemToLibrary(key: string, value: Record<string, any> | undefined): void;
    static removeItemFromLibrary(key: string): void;
}
export {};
