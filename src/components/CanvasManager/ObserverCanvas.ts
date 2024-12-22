/************************************************************************
 *    Copyright (C) 2024 Code Forge Temple                              *
 *    This file is part of circuit-sketcher-core project                *
 *    Licensed under the GNU General Public License v3.0.               *
 *    See the LICENSE file in the project root for more information.    *
 ************************************************************************/

import {DraggableCanvas} from "./DraggableCanvas";

export abstract class ObserverCanvas extends DraggableCanvas {
    protected abstract onChange(...args: any[]): Promise<void>;

    private listeners: (() => void)[] = [];

    public addChangeListener (callback: () => void) {
        this.listeners.push(callback);
    }

    public removeChangeListener (callback: () => void) {
        this.listeners = this.listeners.filter((listener) => listener !== callback);
    }

    protected triggerChange = async (...args: any[]) => {
        await this.onChange(...args);

        this.listeners.forEach((listener) => listener());
    }

}