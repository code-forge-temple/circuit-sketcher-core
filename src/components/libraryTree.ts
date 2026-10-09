/************************************************************************
 *    Copyright (C) 2026 Code Forge Temple                              *
 *    This file is part of circuit-sketcher-core project                *
 *    Licensed under the GNU General Public License v3.0.               *
 *    See the LICENSE file in the project root for more information.    *
 ************************************************************************/

import draw2d from "draw2d";

/* The library maps a key to a CustomBlock memento with an optional "group": a path such as
 * "Power/Sources". The key only identifies the entry - a component's name is the text of its first
 * label (the name drawn on the node), and it has to be unique only within its group. Libraries from
 * before groups existed use the name as the key; they load as they are, new entries get generated
 * keys. There is no list of groups: a group exists through its components ("default" aside).
 */
export type LibraryEntry = Record<string, any> & {group?: string};

export type Library = Record<string, LibraryEntry>;

export type LibraryTree = {
    path: string; // "" for the library root
    name: string;
    groups: LibraryTree[];
    components: string[]; // keys
};

/* "default" holds the library published in circuit-sketcher-lib. It is always there, can't be renamed
 * or deleted, and its content is read-only: Sync replaces all of it with the latest download.
 */
export const DEFAULT_GROUP = "default";

export const DEFAULT_LIBRARY_URL = "https://raw.githubusercontent.com/code-forge-temple/circuit-sketcher-lib/main/assets/lib/library.json";

// kept in a placed node's userData: the group it was placed from, which "Save Node to Library" saves back to
export const LIBRARY_ORIGIN = "libraryGroup";

const SEPARATOR = "/";

const byName = (a: string, b: string) => a.localeCompare(b, undefined, {numeric: true, sensitivity: "base"});

export const normalizeGroup = (group?: string): string =>
    (group ?? "").split(SEPARATOR).map((segment) => segment.trim()).filter(Boolean).join(SEPARATOR);

export const joinGroups = (...groups: (string | undefined)[]): string => normalizeGroup(groups.filter(Boolean).join(SEPARATOR));

export const parentGroup = (group: string): string => group.split(SEPARATOR).slice(0, -1).join(SEPARATOR);

export const groupName = (group: string): string => group.split(SEPARATOR).pop() ?? "";

export const isGroupNameValid = (name: string): boolean => name.trim() !== "" && !name.includes(SEPARATOR);

export const isInGroup = (group: string, ancestor: string): boolean => group === ancestor || group.startsWith(ancestor + SEPARATOR);

export const isDefaultGroup = (group: string): boolean => isInGroup(normalizeGroup(group), DEFAULT_GROUP);

export const getGroup = (entry: LibraryEntry): string => normalizeGroup(entry.group);

export const getName = (entry: LibraryEntry, key = ""): string => entry.labels?.[0]?.text ?? key;

export const newLibraryKey = (): string => draw2d.util.UUID.create();

const withGroup = (entry: LibraryEntry, group: string): LibraryEntry => {
    const next = {...entry};

    delete next.group;

    if (group) {
        next.group = group;
    }

    return next;
};

const withName = (entry: LibraryEntry, name: string): LibraryEntry => ({
    ...entry,
    labels: (entry.labels ?? []).map((label: Record<string, any>, i: number) => i === 0 ? {...label, text: name} : label),
});

/** A placed library component, marked with the group it came from. */
export const markLibraryOrigin = (entry: LibraryEntry): LibraryEntry =>
    ({...entry, userData: {...entry.userData, [LIBRARY_ORIGIN]: getGroup(entry)}});

export const libraryOrigin = (node: Record<string, any>): string => normalizeGroup(node.userData?.[LIBRARY_ORIGIN]);

/** The node without its origin mark - for what is written to the library or to an exported file. */
export const withoutLibraryOrigin = <T extends Record<string, any>>(node: T): T => {
    if (!node.userData || !(LIBRARY_ORIGIN in node.userData)) return node;

    const userData = {...node.userData};

    delete userData[LIBRARY_ORIGIN];

    return {...node, userData};
};

export const toLibraryEntry = (node: Record<string, any>, group: string): LibraryEntry => withGroup(withoutLibraryOrigin(node), group);

export const findComponent = (library: Library, group: string, name: string): string | undefined =>
    Object.keys(library).find((key) => getGroup(library[key]) === group && getName(library[key], key) === name);

/** `name`, or the first free numbered variant of it ("resistor 1") within `group`. */
export const freeName = (library: Library, group: string, name: string, ignoreKey?: string): string => {
    const taken = new Set(Object.entries(library)
        .filter(([key, entry]) => key !== ignoreKey && getGroup(entry) === group)
        .map(([key, entry]) => getName(entry, key)));

    if (!taken.has(name)) return name;

    let counter = 1;

    while (taken.has(`${name} ${counter}`)) {
        counter++;
    }

    return `${name} ${counter}`;
};

// entries that just changed group get a free name there, should theirs already be taken
const settleNames = (library: Library, keys: string[]): {library: Library; renamed: string[]} => {
    const next = {...library};
    const renamed: string[] = [];

    for (const key of keys) {
        const name = getName(next[key], key);
        const free = freeName(next, getGroup(next[key]), name, key);

        if (free !== name) {
            next[key] = withName(next[key], free);
            renamed.push(free);
        }
    }

    return {library: next, renamed};
};

/** Every group in use, its parents included, plus the given (still empty) ones - sorted by path. */
export const listGroups = (library: Library, extraGroups: string[] = []): string[] => {
    const groups = new Set<string>();
    const add = (group: string) => {
        for (let path = normalizeGroup(group); path; path = parentGroup(path)) {
            groups.add(path);
        }
    };

    Object.values(library).forEach((entry) => add(getGroup(entry)));
    extraGroups.forEach(add);

    return [...groups].sort(byName);
};

export const buildLibraryTree = (library: Library, extraGroups: string[] = []): LibraryTree => {
    const root: LibraryTree = {path: "", name: "", groups: [], components: []};
    const nodes = new Map<string, LibraryTree>([["", root]]);
    const depth = (path: string) => path.split(SEPARATOR).length;

    // shallowest first, so a group's parent node always exists by the time the group is added
    for (const path of listGroups(library, extraGroups).sort((a, b) => depth(a) - depth(b))) {
        const node: LibraryTree = {path, name: groupName(path), groups: [], components: []};

        nodes.set(path, node);
        nodes.get(parentGroup(path))!.groups.push(node);
    }

    for (const [key, entry] of Object.entries(library)) {
        nodes.get(getGroup(entry))!.components.push(key);
    }

    for (const node of nodes.values()) {
        // "default" leads, the rest by name
        node.groups.sort((a, b) => Number(b.path === DEFAULT_GROUP) - Number(a.path === DEFAULT_GROUP) || byName(a.name, b.name));
        node.components.sort((a, b) => byName(getName(library[a], a), getName(library[b], b)));
    }

    return root;
};

export const renameComponent = (library: Library, key: string, newName: string): Library =>
    ({...library, [key]: withName(library[key], newName)});

export const moveComponent = (library: Library, key: string, group: string): {library: Library; renamed: string[]} =>
    settleNames({...library, [key]: withGroup(library[key], normalizeGroup(group))}, [key]);

// a group and everything below it re-rooted at `newPath`
const relocatedGroupPath = (path: string, group: string, newPath: string): string =>
    isInGroup(path, group) ? newPath + path.slice(group.length) : path;

/** Where a group path ends up when `group` is renamed: its subgroups move along with it. */
export const renamedGroupPath = (path: string, group: string, newName: string): string =>
    relocatedGroupPath(path, group, joinGroups(parentGroup(group), newName));

/** Where a group path ends up when `group` is deleted: its contents move up into its parent. */
export const deletedGroupPath = (path: string, group: string): string =>
    isInGroup(path, group) ? joinGroups(parentGroup(group), path.slice(group.length)) : path;

/** Where a group path ends up when `group` is moved into `into` ("" for the root). */
export const movedGroupPath = (path: string, group: string, into: string): string =>
    relocatedGroupPath(path, group, joinGroups(into, groupName(group)));

const regroup = (library: Library, move: (group: string) => string): {library: Library; moved: string[]} => {
    const moved: string[] = [];
    const next = Object.fromEntries(Object.entries(library).map(([key, entry]) => {
        const group = getGroup(entry);
        const target = move(group);

        if (target !== group) {
            moved.push(key);
        }

        return [key, withGroup(entry, target)];
    }));

    return {library: next, moved};
};

// renaming or moving a whole group can't clash: the group's new path is free, or the move isn't offered
export const renameGroup = (library: Library, group: string, newName: string): Library =>
    regroup(library, (path) => renamedGroupPath(path, group, newName)).library;

export const moveGroup = (library: Library, group: string, into: string): Library =>
    regroup(library, (path) => movedGroupPath(path, group, into)).library;

/** Deleting a group moves its content up into its parent, where names can clash. */
export const deleteGroup = (library: Library, group: string): {library: Library; renamed: string[]} => {
    const {library: next, moved} = regroup(library, (path) => deletedGroupPath(path, group));

    return settleNames(next, moved);
};

/* The components in `group` and below, with paths starting at the group itself, so importing them
 * anywhere recreates the folder ("" takes the whole library). "default" is never part of it: it's
 * shared through circuit-sketcher-lib itself, and an import would skip it anyway.
 */
export const extractGroup = (library: Library, group: string): Library => {
    const cut = parentGroup(group).length;

    return Object.fromEntries(Object.entries(library)
        .filter(([, entry]) => !isDefaultGroup(getGroup(entry)) && (!group || isInGroup(getGroup(entry), group)))
        .map(([key, entry]) => [key, withGroup(entry, normalizeGroup(getGroup(entry).slice(cut)))]));
};

/* Exported files are keyed by name, as they always were (older versions show the key as the name);
 * the same name from two groups gets a numbered key, the name itself stays in the label.
 */
export const toExportFile = (entries: Library): Library => {
    const file: Library = {};

    for (const [key, entry] of Object.entries(entries)) {
        const name = getName(entry, key);
        let fileKey = name;

        for (let counter = 1; file[fileKey] !== undefined; counter++) {
            fileKey = `${name} ${counter}`;
        }

        file[fileKey] = withoutLibraryOrigin(entry);
    }

    return file;
};

/* Adds the components of an imported library or node file below `intoGroup`, keeping the file's own
 * groups. A name already taken in its group gets a numbered one ("resistor 1"). Nothing goes into
 * "default" this way unless `intoDefault` - only Sync fills it.
 */
export const mergeIntoLibrary = (library: Library, incoming: Library, intoGroup = "", intoDefault = false): {library: Library; added: string[]; skipped: number} => {
    const next = {...library};
    const added: string[] = [];
    let skipped = 0;

    for (const [fileKey, entry] of Object.entries(incoming)) {
        const group = joinGroups(intoGroup, getGroup(entry));

        if (!intoDefault && isDefaultGroup(group)) {
            skipped++;

            continue;
        }

        const name = freeName(next, group, getName(entry, fileKey));

        next[newLibraryKey()] = withName(toLibraryEntry(entry, group), name);
        added.push(name);
    }

    return {library: next, added, skipped};
};

/** The library with all of "default" replaced by `published`. */
export const syncDefaultGroup = (library: Library, published: Library): {library: Library; added: string[]} => {
    const own = Object.fromEntries(Object.entries(library).filter(([, entry]) => !isDefaultGroup(getGroup(entry))));
    const {library: next, added} = mergeIntoLibrary(own, published, DEFAULT_GROUP, true);

    return {library: next, added};
};
