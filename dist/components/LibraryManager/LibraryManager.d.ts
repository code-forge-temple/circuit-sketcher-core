/************************************************************************
 *    Copyright (C) 2026 Code Forge Temple                              *
 *    This file is part of circuit-sketcher-core project                *
 *    Licensed under the GNU General Public License v3.0.               *
 *    See the LICENSE file in the project root for more information.    *
 ************************************************************************/
import React from "react";
import "./LibraryManager.scss";
type LibraryManagerProps = {
    onChange: () => void;
    onClose: () => void;
};
export declare const LibraryManager: ({ onChange, onClose }: LibraryManagerProps) => React.JSX.Element;
export {};
