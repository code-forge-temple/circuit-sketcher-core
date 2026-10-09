/************************************************************************
 *    Copyright (C) 2024 Code Forge Temple                              *
 *    This file is part of circuit-sketcher-core project                *
 *    Licensed under the GNU General Public License v3.0.               *
 *    See the LICENSE file in the project root for more information.    *
 ************************************************************************/

import {openDB} from 'idb';
import {extractGroup, Library, mergeIntoLibrary, toExportFile} from './libraryTree';
import {LibrarySchemaSchema} from './types';

type Draw2dStringifiedNode = Record<string, any>;

type LocalStorageData = {
    library: {
        [key: string]: Draw2dStringifiedNode;
    }
};

const DB_NAME = 'circuit-sketcher';
const STORE_NAME = 'library';

const dbPromise = openDB(DB_NAME, 1, {
    upgrade (db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME);
        }
    }
});

export class LocalStorageManager {
    public static async getLibrary(stringify: true): Promise<string>;
    public static async getLibrary(stringify?: false): Promise<LocalStorageData["library"]>;
    public static async getLibrary (stringify?: boolean): Promise<string | LocalStorageData["library"]> {
        const db = await dbPromise;
        const allKeys = await db.getAllKeys(STORE_NAME);
        const entries = await Promise.all(allKeys.map(async key => [key, await db.get(STORE_NAME, key)]));
        const library = Object.fromEntries(entries);

        if (stringify) {
            return JSON.stringify(library);
        }

        return library;
    }

    public static async setLibrary(library: string): Promise<void>;
    public static async setLibrary(library: LocalStorageData["library"]): Promise<void>;
    public static async setLibrary (library: string | LocalStorageData["library"]): Promise<void> {
        let libObj: LocalStorageData["library"];

        if (typeof library === "string") {
            libObj = JSON.parse(library);
        } else {
            libObj = library;
        }

        const db = await dbPromise;
        const tx = db.transaction(STORE_NAME, 'readwrite');

        await tx.store.clear();

        for (const [key, value] of Object.entries(libObj)) {
            await tx.store.put(value, key);
        }

        await tx.done;
    }

    public static async addItemToLibrary (key: string, value: Record<string, any> | undefined): Promise<void> {
        if (!value) return;

        const db = await dbPromise;

        await db.put(STORE_NAME, value, key);
    }

    public static async removeItemFromLibrary (key: string): Promise<void> {
        const db = await dbPromise;

        await db.delete(STORE_NAME, key);
    }

    /* The library as a file to share - what Manage Library's Export... on the library root writes:
     * keyed by name, without "default" (that one is shared through circuit-sketcher-lib itself).
     */
    public static async exportLibrary (): Promise<Library> {
        return toExportFile(extractGroup(await LocalStorageManager.getLibrary(), ""));
    }

    /* Merges a library or node file in, as Import... on the library root does: a name already taken
     * gets a number, and nothing goes into "default". Throws if it isn't a library or node file.
     */
    public static async importLibrary (data: unknown): Promise<{added: number; skipped: number}> {
        const {library, added, skipped} = mergeIntoLibrary(await LocalStorageManager.getLibrary(), LibrarySchemaSchema.parse(data));

        await LocalStorageManager.setLibrary(library);

        return {added: added.length, skipped};
    }
}