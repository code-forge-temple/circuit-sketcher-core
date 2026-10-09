/************************************************************************
 *    Copyright (C) 2026 Code Forge Temple                              *
 *    This file is part of circuit-sketcher-core project                *
 *    Licensed under the GNU General Public License v3.0.               *
 *    See the LICENSE file in the project root for more information.    *
 ************************************************************************/

import React, {useEffect, useMemo, useState} from "react";
import {LocalStorageManager} from "../LocalStorageManager";
import {
    buildLibraryTree,
    DEFAULT_GROUP,
    DEFAULT_LIBRARY_URL,
    deleteGroup,
    deletedGroupPath,
    extractGroup,
    findComponent,
    getGroup,
    getName,
    groupName,
    isDefaultGroup,
    isGroupNameValid,
    isInGroup,
    joinGroups,
    Library,
    LibraryTree,
    listGroups,
    mergeIntoLibrary,
    moveComponent,
    movedGroupPath,
    moveGroup,
    parentGroup,
    renameComponent,
    renameGroup,
    renamedGroupPath,
    syncDefaultGroup,
    toExportFile
} from "../libraryTree";
import {LibrarySchemaSchema} from "../types";
import {exportJsonFile, importJsonFile} from "../utils";
import "./LibraryManager.scss";

type Editing =
    | {kind: "component"; key: string; value: string}
    | {kind: "group"; path: string; value: string}
    | {kind: "new-group"; parent: string; value: string};

type Dragged =
    | {kind: "component"; key: string}
    | {kind: "group"; path: string};

type LibraryManagerProps = {
    // the library was changed (and is already stored)
    onChange: () => void;
    onClose: () => void;
};

const INDENT_PX = 18;

const describeGroup = (group: string) => group ? `"${group}"` : "the library root";

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

export const LibraryManager = ({onChange, onClose}: LibraryManagerProps) => {
    const [library, setLibrary] = useState<Library | null>(null);
    /* a group only exists through its components, so one created here (or emptied here) is
     * remembered for this session until a component lands in it */
    const [emptyGroups, setEmptyGroups] = useState<string[]>([]);
    const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
    const [editing, setEditing] = useState<Editing | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [dragged, setDragged] = useState<Dragged | null>(null);
    // the group a drop would land in right now, highlighted while dragging
    const [dropTarget, setDropTarget] = useState<string | null>(null);
    const [syncing, setSyncing] = useState(false);

    useEffect(() => {
        LocalStorageManager.getLibrary().then(setLibrary);
    }, []);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape" && !editing) {
                onClose();
            }
        };

        window.addEventListener("keydown", onKeyDown);

        return () => window.removeEventListener("keydown", onKeyDown);
    }, [editing, onClose]);

    // "default" is listed even while it is empty - that's where its Sync button lives
    const shownGroups = useMemo(() => [DEFAULT_GROUP, ...emptyGroups], [emptyGroups]);
    const groups = useMemo(() => library ? listGroups(library, shownGroups) : [], [library, shownGroups]);
    const tree = useMemo(() => library ? buildLibraryTree(library, shownGroups) : null, [library, shownGroups]);

    const hasComponents = (group: string) =>
        !!library && Object.values(library).some((entry) => !group || isInGroup(getGroup(entry), group));

    const expand = (group: string) => {
        setCollapsed((current) => new Set([...current].filter((path) => path !== group)));
    };

    const save = async (next: Library, nextEmptyGroups: string[] = emptyGroups) => {
        await LocalStorageManager.setLibrary(next);

        const used = listGroups(next);

        setLibrary(next);
        setEmptyGroups([...new Set(nextEmptyGroups)].filter((group) => group && !used.includes(group)));
        setEditing(null);
        setMessage(null);

        onChange();
    };

    const renamedNote = (renamed: string[]) =>
        renamed.length ? ` Renamed ${renamed.map((name) => `"${name}"`).join(", ")}: the name was taken there.` : "";

    const stopEditing = () => {
        setEditing(null);
        setMessage(null);
    };

    const commitEditing = async () => {
        if (!library || !editing) return;

        const value = editing.value.trim();

        if (editing.kind === "component") {
            const {key} = editing;
            const group = getGroup(library[key]);

            if (value === getName(library[key], key)) return stopEditing();

            if (!value) return setMessage("A component needs a name.");

            if (findComponent(library, group, value) !== undefined) return setMessage(`${describeGroup(group)} already has a "${value}".`);

            return save(renameComponent(library, key, value));
        }

        if (!isGroupNameValid(value)) return setMessage("A group name can't be empty or contain \"/\".");

        if (editing.kind === "group") {
            const {path} = editing;

            if (value === groupName(path)) return stopEditing();

            if (groups.includes(joinGroups(parentGroup(path), value))) return setMessage(`There already is a group "${value}" there.`);

            const nextEmptyGroups = emptyGroups.map((group) => renamedGroupPath(group, path, value));

            if (!hasComponents(path)) {
                setEmptyGroups(nextEmptyGroups);

                return stopEditing();
            }

            return save(renameGroup(library, path, value), nextEmptyGroups);
        }

        const path = joinGroups(editing.parent, value);

        if (groups.includes(path)) return setMessage(`There already is a group "${value}" there.`);

        setEmptyGroups([...emptyGroups, path]);
        stopEditing();
    };

    const startNewGroup = (parent: string) => {
        // the name field shows up inside the parent, so it has to be expanded
        expand(parent);
        setEditing({kind: "new-group", parent, value: ""});
        setMessage(null);
    };

    const removeGroup = async (path: string) => {
        if (!library) return;

        if (!window.confirm(`Delete the group "${groupName(path)}"? Its components and subgroups move up into ${describeGroup(parentGroup(path))}.`)) return;

        // the deleted group itself maps onto its parent, which is fine to keep listed
        const nextEmptyGroups = emptyGroups.map((group) => deletedGroupPath(group, path)).filter(Boolean);

        if (!hasComponents(path)) {
            setEmptyGroups(nextEmptyGroups);

            return;
        }

        const {library: next, renamed} = deleteGroup(library, path);

        await save(next, nextEmptyGroups);

        if (renamed.length) setMessage(renamedNote(renamed).trim());
    };

    const removeComponent = async (key: string) => {
        if (!library) return;

        if (!window.confirm(`Delete "${getName(library[key], key)}" from the library?`)) return;

        const next = {...library};

        delete next[key];

        // keep its group on screen even if this was the group's last component
        await save(next, [...emptyGroups, getGroup(library[key])]);
    };

    const move = async (key: string, group: string) => {
        if (!library) return;

        const {library: next, renamed} = moveComponent(library, key, group);

        await save(next, [...emptyGroups, getGroup(library[key])]);

        if (renamed.length) setMessage(renamedNote(renamed).trim());
    };

    const moveGroupInto = async (group: string, into: string) => {
        if (!library) return;

        // its old parent stays on screen even if this was all it held
        const nextEmptyGroups = [...emptyGroups.map((path) => movedGroupPath(path, group, into)), parentGroup(group)];

        setCollapsed((current) => new Set([...current].map((path) => movedGroupPath(path, group, into))));

        if (!hasComponents(group)) {
            setEmptyGroups([...new Set(nextEmptyGroups)].filter(Boolean));

            return;
        }

        await save(moveGroup(library, group, into), nextEmptyGroups);
    };

    const importInto = async (group: string) => {
        if (!library) return;

        let data: unknown;

        try {
            data = await importJsonFile();
        } catch {
            return setMessage("That file isn't valid JSON.");
        }

        const parsed = LibrarySchemaSchema.safeParse(data);

        if (!parsed.success) return setMessage("That file isn't a library or node export.");

        const {library: next, added, skipped} = mergeIntoLibrary(library, parsed.data, group);
        const skippedNote = skipped ? ` Skipped ${plural(skipped, "component")} meant for "${DEFAULT_GROUP}", which only Sync fills.` : "";

        await save(next);

        expand(group);
        setMessage(`Imported ${plural(added.length, "component")} into ${describeGroup(group)}.${skippedNote}`);
    };

    const syncDefault = async () => {
        if (!library) return;

        if (hasComponents(DEFAULT_GROUP) && !window.confirm(`Replace everything in "${DEFAULT_GROUP}" with the latest default library?`)) return;

        setSyncing(true);
        setMessage("Downloading the default library...");

        try {
            const response = await fetch(DEFAULT_LIBRARY_URL, {cache: "no-store"});

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const parsed = LibrarySchemaSchema.safeParse(await response.json());

            if (!parsed.success) {
                setMessage("The downloaded default library isn't in a format this version understands - nothing was changed.");

                return;
            }

            const {library: next, added} = syncDefaultGroup(library, parsed.data);

            await save(next);

            expand(DEFAULT_GROUP);
            setMessage(`Synced ${plural(added.length, "component")} into "${DEFAULT_GROUP}".`);
        } catch {
            setMessage("Couldn't download the default library (no connection?) - nothing was changed.");
        } finally {
            setSyncing(false);
        }
    };

    const exportGroup = (group: string) => {
        if (!library) return;

        exportJsonFile(toExportFile(extractGroup(library, group)), group ? groupName(group) : "library");
    };

    const exportComponent = (key: string) => {
        if (!library) return;

        const name = getName(library[key], key);

        exportJsonFile(toExportFile({[key]: library[key]}), name);
    };

    const endDrag = () => {
        setDragged(null);
        setDropTarget(null);
    };

    const canDrop = (into: string) => {
        if (!dragged || !library || isDefaultGroup(into)) return false;

        if (dragged.kind === "component") return getGroup(library[dragged.key]) !== into;

        const {path} = dragged;

        // not into itself or below itself, not where it already is, not onto a same-named group
        return !isInGroup(into, path) && parentGroup(path) !== into && !groups.includes(joinGroups(into, groupName(path)));
    };

    const dragHandlers = (item: Dragged) => ({
        draggable: true,
        onDragStart: (event: React.DragEvent) => {
            event.dataTransfer.effectAllowed = "move";
            // a drag that carries no data doesn't start everywhere
            event.dataTransfer.setData("text/plain", item.kind === "component" ? item.key : item.path);
            setDragged(item);
            setMessage(null);
        },
        onDragEnd: endDrag,
    });

    // `into` is the group a drop lands in: a group row's own group, a component row's group
    const dropHandlers = (into: string) => ({
        onDragOver: (event: React.DragEvent) => {
            if (!dragged) return;

            const allowed = canDrop(into);

            if (allowed) {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
            }

            setDropTarget(allowed ? into : null);
        },
        onDrop: (event: React.DragEvent) => {
            event.preventDefault();

            const item = dragged;
            const allowed = canDrop(into);

            endDrag();

            if (!item || !allowed) return;

            if (item.kind === "component") {
                move(item.key, into);
            } else {
                moveGroupInto(item.path, into);
            }

            // show where it went
            expand(into);
        },
    });

    const toggle = (path: string) => {
        setCollapsed((current) => {
            const next = new Set(current);

            if (next.has(path)) {
                next.delete(path);
            } else {
                next.add(path);
            }

            return next;
        });
    };

    const nameInput = (value: string) => (
        <span className="lm-edit">
            <input
                autoFocus
                value={value}
                onChange={(event) => setEditing((current) => current && {...current, value: event.target.value})}
                onKeyDown={(event) => {
                    if (event.key === "Enter") {
                        commitEditing();
                    } else if (event.key === "Escape") {
                        event.stopPropagation();
                        stopEditing();
                    }
                }} />
            <button type="button" onClick={commitEditing}>OK</button>
            <button type="button" onClick={stopEditing}>Cancel</button>
        </span>
    );

    const renderComponent = (key: string, depth: number) => {
        const entry = library![key];
        const name = getName(entry, key);
        // what Sync puts in "default" is only ever replaced by the next Sync
        const readOnly = isDefaultGroup(getGroup(entry));
        const isEditing = editing?.kind === "component" && editing.key === key;
        const isDragged = dragged?.kind === "component" && dragged.key === key;

        return (
            <li key={`c:${key}`}>
                <div
                    className={`lm-row${isDragged ? " lm-dragging" : ""}`}
                    style={{paddingLeft: depth * INDENT_PX}}
                    {...(isEditing || readOnly ? {} : dragHandlers({kind: "component", key}))}
                    {...dropHandlers(getGroup(entry))}>
                    <span className="lm-toggle" />
                    <span className="lm-icon lm-icon-component" />
                    {isEditing ? nameInput(editing.value) : <span className="lm-name" title={name}>{name}</span>}
                    {!isEditing && !readOnly && (
                        <span className="lm-actions">
                            <button type="button" onClick={() => exportComponent(key)}>Export...</button>
                            <button type="button" onClick={() => setEditing({kind: "component", key, value: name})}>Rename</button>
                            <button type="button" onClick={() => removeComponent(key)}>Delete</button>
                        </span>
                    )}
                </div>
            </li>
        );
    };

    const groupActions = (node: LibraryTree) => {
        /* "default" only downloads - it is shared by pointing to circuit-sketcher-lib, not by
         * exporting it, so neither it nor anything in it has any other action */
        if (node.path === DEFAULT_GROUP) {
            return (
                <button type="button" title="Replace this group with the latest library from circuit-sketcher-lib" disabled={syncing} onClick={syncDefault}>
                    Sync...
                </button>
            );
        }

        if (isDefaultGroup(node.path)) return null;

        return (
            <>
                <button type="button" onClick={() => startNewGroup(node.path)}>New subgroup</button>
                <button type="button" title={`Import a library or node file into ${describeGroup(node.path)}`} onClick={() => importInto(node.path)}>
                    Import...
                </button>
                <button
                    type="button"
                    title={node.path ? `Export "${node.path}" with its subgroups` : "Export the whole library (\"default\" aside)"}
                    disabled={!library || !Object.keys(extractGroup(library, node.path)).length}
                    onClick={() => exportGroup(node.path)}>
                    Export...
                </button>
                {node.path !== "" && <button type="button" onClick={() => setEditing({kind: "group", path: node.path, value: node.name})}>Rename</button>}
                {node.path !== "" && <button type="button" onClick={() => removeGroup(node.path)}>Delete</button>}
            </>
        );
    };

    const renderGroup = (node: LibraryTree, depth: number): React.ReactNode => {
        const isRoot = node.path === "";
        const movable = !isRoot && !isDefaultGroup(node.path);
        const isCollapsed = collapsed.has(node.path);
        const isEditing = editing?.kind === "group" && editing.path === node.path;
        const isEmpty = !node.groups.length && !node.components.length;
        const isDragged = dragged?.kind === "group" && dragged.path === node.path;
        const rowClass = ["lm-row", "lm-group", dropTarget === node.path && "lm-drop", isDragged && "lm-dragging"];

        return (
            <li key={`g:${node.path}`}>
                <div
                    className={rowClass.filter(Boolean).join(" ")}
                    style={{paddingLeft: depth * INDENT_PX}}
                    {...(movable && !isEditing ? dragHandlers({kind: "group", path: node.path}) : {})}
                    {...dropHandlers(node.path)}>
                    <span className="lm-toggle" onClick={() => toggle(node.path)}>{isCollapsed ? "▸" : "▾"}</span>
                    <span className="lm-icon lm-icon-group" />
                    {isEditing ? nameInput(editing.value) : <span className="lm-name" onClick={() => toggle(node.path)}>{isRoot ? "Library" : node.name}</span>}
                    {!isEditing && <span className="lm-actions">{groupActions(node)}</span>}
                </div>
                {!isCollapsed && (
                    <ul>
                        {editing?.kind === "new-group" && editing.parent === node.path && (
                            <li>
                                <div className="lm-row" style={{paddingLeft: (depth + 1) * INDENT_PX}}>
                                    <span className="lm-toggle" />
                                    <span className="lm-icon lm-icon-group" />
                                    {nameInput(editing.value)}
                                </div>
                            </li>
                        )}
                        {node.groups.map((group) => renderGroup(group, depth + 1))}
                        {node.components.map((key) => renderComponent(key, depth + 1))}
                        {isEmpty && !isRoot && (
                            <li className="lm-hint" style={{paddingLeft: (depth + 1) * INDENT_PX}} {...dropHandlers(node.path)}>
                                {node.path === DEFAULT_GROUP
                                    ? "Empty - Sync... downloads the default library into it"
                                    : "Empty - drag or import components into it to keep it"}
                            </li>
                        )}
                    </ul>
                )}
            </li>
        );
    };

    return (
        <div className="circuit-sketcher-core lm-overlay">
            {/* labelled by its heading, not aria-label: Obsidian shows every aria-label as a hover tooltip */}
            <div className="lm-dialog" role="dialog" aria-labelledby="lm-title">
                <span className="lm-close" onClick={onClose}>Close</span>
                <h1 id="lm-title">Manage Library</h1>
                {message && <div className="lm-message">{message}</div>}
                <div className="lm-tree" onDragLeave={(event) => {
                    // dragged out of the tree altogether: nothing would take the drop now
                    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                        setDropTarget(null);
                    }
                }}>
                    {tree ? <ul>{renderGroup(tree, 0)}</ul> : <span className="lm-hint">Loading...</span>}
                </div>
            </div>
        </div>
    );
}
