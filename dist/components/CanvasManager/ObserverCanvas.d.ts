/************************************************************************
 *    Copyright (C) 2024 Code Forge Temple                              *
 *    This file is part of circuit-sketcher-core project                *
 *    Licensed under the GNU General Public License v3.0.               *
 *    See the LICENSE file in the project root for more information.    *
 ************************************************************************/
import { DraggableCanvas } from "./DraggableCanvas";
export declare abstract class ObserverCanvas extends DraggableCanvas {
    protected abstract onChange(...args: any[]): Promise<void>;
    private listeners;
    addChangeListener(callback: () => void): void;
    removeChangeListener(callback: () => void): void;
    protected triggerChange: (...args: any[]) => Promise<void>;
}
