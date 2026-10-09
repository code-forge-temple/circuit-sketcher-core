/************************************************************************
 *    Copyright (C) 2026 Code Forge Temple                              *
 *    This file is part of circuit-sketcher-core project                *
 *    Licensed under the GNU General Public License v3.0.               *
 *    See the LICENSE file in the project root for more information.    *
 ************************************************************************/

import React from "react";
import {createRoot, Root} from "react-dom/client";
import {LibraryManager} from "./LibraryManager";

let openRoot: Root | null = null;

/* Core mounts the dialog itself, so neither the Obsidian plugin nor the app has to render it
 * (unlike ModalAddImage). Opening it again while it is open does nothing.
 */
export const openLibraryManager = (onChange: () => void) => {
    if (openRoot) return;

    const host = document.createElement("div");

    document.body.appendChild(host);

    const root = createRoot(host);

    const close = () => {
        openRoot = null;

        // unmounting from inside the dialog's own event handler has to wait for it to finish
        setTimeout(() => {
            root.unmount();
            host.remove();
        }, 0);
    };

    openRoot = root;
    root.render(<LibraryManager onChange={onChange} onClose={close} />);
};
