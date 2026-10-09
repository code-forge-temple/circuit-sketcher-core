/************************************************************************
 *    Copyright (C) 2026 Code Forge Temple                              *
 *    This file is part of circuit-sketcher-core project                *
 *    Licensed under the GNU General Public License v3.0.               *
 *    See the LICENSE file in the project root for more information.    *
 ************************************************************************/
export type LibraryEntry = Record<string, any> & {
    group?: string;
};
export type Library = Record<string, LibraryEntry>;
export type LibraryTree = {
    path: string;
    name: string;
    groups: LibraryTree[];
    components: string[];
};
export declare const DEFAULT_GROUP = "default";
export declare const DEFAULT_LIBRARY_URL = "https://raw.githubusercontent.com/code-forge-temple/circuit-sketcher-lib/main/assets/lib/library.json";
export declare const LIBRARY_ORIGIN = "libraryGroup";
export declare const normalizeGroup: (group?: string) => string;
export declare const joinGroups: (...groups: (string | undefined)[]) => string;
export declare const parentGroup: (group: string) => string;
export declare const groupName: (group: string) => string;
export declare const isGroupNameValid: (name: string) => boolean;
export declare const isInGroup: (group: string, ancestor: string) => boolean;
export declare const isDefaultGroup: (group: string) => boolean;
export declare const getGroup: (entry: LibraryEntry) => string;
export declare const getName: (entry: LibraryEntry, key?: string) => string;
export declare const newLibraryKey: () => string;
/** A placed library component, marked with the group it came from. */
export declare const markLibraryOrigin: (entry: LibraryEntry) => LibraryEntry;
export declare const libraryOrigin: (node: Record<string, any>) => string;
/** The node without its origin mark - for what is written to the library or to an exported file. */
export declare const withoutLibraryOrigin: <T extends Record<string, any>>(node: T) => T;
export declare const toLibraryEntry: (node: Record<string, any>, group: string) => LibraryEntry;
export declare const findComponent: (library: Library, group: string, name: string) => string | undefined;
/** `name`, or the first free numbered variant of it ("resistor 1") within `group`. */
export declare const freeName: (library: Library, group: string, name: string, ignoreKey?: string) => string;
/** Every group in use, its parents included, plus the given (still empty) ones - sorted by path. */
export declare const listGroups: (library: Library, extraGroups?: string[]) => string[];
export declare const buildLibraryTree: (library: Library, extraGroups?: string[]) => LibraryTree;
export declare const renameComponent: (library: Library, key: string, newName: string) => Library;
export declare const moveComponent: (library: Library, key: string, group: string) => {
    library: Library;
    renamed: string[];
};
/** Where a group path ends up when `group` is renamed: its subgroups move along with it. */
export declare const renamedGroupPath: (path: string, group: string, newName: string) => string;
/** Where a group path ends up when `group` is deleted: its contents move up into its parent. */
export declare const deletedGroupPath: (path: string, group: string) => string;
/** Where a group path ends up when `group` is moved into `into` ("" for the root). */
export declare const movedGroupPath: (path: string, group: string, into: string) => string;
export declare const renameGroup: (library: Library, group: string, newName: string) => Library;
export declare const moveGroup: (library: Library, group: string, into: string) => Library;
/** Deleting a group moves its content up into its parent, where names can clash. */
export declare const deleteGroup: (library: Library, group: string) => {
    library: Library;
    renamed: string[];
};
export declare const extractGroup: (library: Library, group: string) => Library;
export declare const toExportFile: (entries: Library) => Library;
export declare const mergeIntoLibrary: (library: Library, incoming: Library, intoGroup?: string, intoDefault?: boolean) => {
    library: Library;
    added: string[];
    skipped: number;
};
/** The library with all of "default" replaced by `published`. */
export declare const syncDefaultGroup: (library: Library, published: Library) => {
    library: Library;
    added: string[];
};
