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
    }
};

export class LocalStorageManager {
    private static LOCAL_STORAGE_KEY = "circuit-sketcher";

    private static getLocalStorageData (): LocalStorageData {
        const data = window.localStorage.getItem(LocalStorageManager.LOCAL_STORAGE_KEY);
        return data ? JSON.parse(data) : {library: {}};
    }

    private static setLocalStorageData (data: LocalStorageData): void {
        window.localStorage.setItem(LocalStorageManager.LOCAL_STORAGE_KEY, JSON.stringify(data));
    }

    public static getLibrary(stringify: true): string;
    public static getLibrary(stringify?: false): LocalStorageData["library"];

    public static getLibrary (stringify?: boolean): string | LocalStorageData["library"] {
        if (stringify === true) {
            return JSON.stringify(LocalStorageManager.getLocalStorageData().library) as any;
        }

        return LocalStorageManager.getLocalStorageData().library as any;
    }

    public static setLibrary (library: string): void {
        const data = LocalStorageManager.getLocalStorageData();

        data.library = JSON.parse(library);

        LocalStorageManager.setLocalStorageData(data);
    }

    public static addItemToLibrary (key: string, value: Record<string, any> | undefined): void {
        if (!value) return;

        const data = LocalStorageManager.getLocalStorageData();

        data.library[key] = value;

        LocalStorageManager.setLocalStorageData(data);
    }

    public static removeItemFromLibrary (key: string): void {
        const data = LocalStorageManager.getLocalStorageData();

        delete data.library[key];

        LocalStorageManager.setLocalStorageData(data);
    }
}