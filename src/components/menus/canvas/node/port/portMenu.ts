/************************************************************************
 *    Copyright (C) 2024 Code Forge Temple                              *
 *    This file is part of circuit-sketcher-core project                *
 *    Licensed under the GNU General Public License v3.0.               *
 *    See the LICENSE file in the project root for more information.    *
 ************************************************************************/

import {MenuItem} from '../../../../types';
import {positionSubmenu} from '../../../../utils';
import './portMenu.scss';

type AddPortLabel = (port:any) => void;
type RemoveCreatedPort = (port: any) => void;
type RemovePortLabel = () => void;
type HasLabel = () => boolean;

export const portMenu = (hasLabel: HasLabel, addPortLabel: AddPortLabel, removePortLabel: RemovePortLabel, removeCreatedPort: RemoveCreatedPort) =>
    (x: number, y: number) => {
        return $.contextMenu({
            selector: "body",
            events: {
                hide: function () {
                    $.contextMenu("destroy");
                },
            },
            callback: function (key:string) {
                if (key === "label_add") {
                    addPortLabel(this);
                } else if (key === "label_remove") {
                    removePortLabel();
                } else if (key === "remove_port") {
                    removeCreatedPort(this);
                }
            },
            x: x,
            y: y,
            items: portMenuItems(hasLabel),
            stopPropagation: true, // Prevent event bubbling
            positionSubmenu: function () {
                positionSubmenu(this);
            }
        });
    };

const portMenuItems = (hasLabel: HasLabel) => {
    const manageLabelMenuItem: { label_add?: MenuItem; label_remove?: MenuItem } = {};

    if(!hasLabel())
    {
        manageLabelMenuItem.label_add = {
            name: "Add",
        };
    } else {
        manageLabelMenuItem.label_remove = {
            name: "Remove",
        };
    };

    return {
        label: {
            name: "Manage Label",
            className: "context-menu-icon-manage-label",
            items: {
                ...manageLabelMenuItem,
            },
        },
        remove_port: {
            name: "Remove Port",
            className: "context-menu-icon-remove-port",
        },
    }
};