/************************************************************************
 *    Copyright (C) 2024 Code Forge Temple                              *
 *    This file is part of circuit-sketcher-core project                *
 *    Licensed under the GNU General Public License v3.0.               *
 *    See the LICENSE file in the project root for more information.    *
 ************************************************************************/

import draw2d from "draw2d";
import {SIDE, Side} from "../types";

const setGetterAndSetter = (thisRef: Record<any, any>, attributes: string[]) => {
    if(thisRef != null) {
        thisRef.getterWhitelist = {};
        thisRef.setterWhitelist = {};

        attributes.forEach(attr => {
            thisRef.getterWhitelist[attr] = function () {
                return thisRef[attr];
            };
            thisRef.setterWhitelist[attr] = function (value: any) {
                thisRef[attr] = value;
            };
        });
    }
};


export const CustomTopLocator = draw2d.layout.locator.Locator.extend({
    NAME : "customDefinitions.customLocators.CustomTopLocator",
    init: function (index: number, total: any) {
        this._super();

        setGetterAndSetter(this, ["index", "total"]);

        if(index !== undefined) {
            this.attr("index", index);
        }

        if(total !== undefined) {
            this.attr("total", total);
        }
    },
    relocate: function (_index: number, figure: any) {
        const parent = figure.getParent();
        const x = (parent.getWidth() / (this.attr("total") + 1)) * (this.attr("index") + 1);
        const y = 0;
        figure.setPosition(x, y);
    },
});

export const CustomBottomLocator = draw2d.layout.locator.Locator.extend({
    NAME : "customDefinitions.customLocators.CustomBottomLocator",
    init: function (index: number, total: number) {
        this._super();

        setGetterAndSetter(this, ["index", "total"]);

        if(index !== undefined) {
            this.attr("index", index);
        }

        if(total !== undefined) {
            this.attr("total", total);
        }
    },
    relocate: function (_index: number, figure: any) {
        const parent = figure.getParent();
        const x = (parent.getWidth() / (this.attr("total") + 1)) * (this.attr("index") + 1);
        const y = parent.getHeight();
        figure.setPosition(x, y);
    },
});

export const CustomLeftLocator = draw2d.layout.locator.Locator.extend({
    NAME : "customDefinitions.customLocators.CustomLeftLocator",
    init: function (index: number, total: number) {
        this._super();

        setGetterAndSetter(this, ["index", "total"]);

        if(index !== undefined) {
            this.attr("index", index);
        }

        if(total !== undefined) {
            this.attr("total", total);
        }
    },
    relocate: function (_index: number, figure: any) {
        const parent = figure.getParent();
        const x = 0;
        const y = (parent.getHeight() / (this.attr("total") + 1)) * (this.attr("index") + 1);
        figure.setPosition(x, y);
    },
});

export const CustomRightLocator = draw2d.layout.locator.Locator.extend({
    NAME : "customDefinitions.customLocators.CustomRightLocator",
    init: function (index: number, total: number) {
        this._super();

        setGetterAndSetter(this, ["index", "total"]);

        if(index !== undefined) {
            this.attr("index", index);
        }

        if(total !== undefined) {
            this.attr("total", total);
        }
    },
    relocate: function (_index: number, figure: any) {
        const parent = figure.getParent();

        const x = parent.getWidth();
        const y = (parent.getHeight() / (this.attr("total") + 1)) * (this.attr("index") + 1);

        figure.setPosition(x, y);
    },
});

export const CustomPortLabelLocator = draw2d.layout.locator.Locator.extend({
    NAME: "customDefinitions.customLocators.CustomPortLabelLocator",
    init: function (side: Side) {
        this._super();

        setGetterAndSetter(this, ["side"]);

        if(side !== undefined) {
            this.attr("side", side);
        }
    },
    relocate: function (_index: number, figure: any) {
        const portWidth = 10;
        const portHeight = 10;
        const labelWidth = figure.getWidth();
        const labelHeight = figure.getHeight();
        const side = this.attr("side") as Side;

        switch (side) {
            case SIDE.LEFT:
                figure.setPosition(-labelWidth - 15, - labelHeight / 2);
                break;
            case SIDE.RIGHT:
                figure.setPosition(portWidth + 5, - labelHeight / 2);
                break;
            case SIDE.TOP:
                figure.setPosition(- labelWidth / 2, -labelHeight - 15);
                break;
            case SIDE.BOTTOM:
                figure.setPosition(- labelWidth / 2, portHeight + 5);
                break;
        }
    },
    // this will be called in the customPorts class since the label does not have this functionality in draw2d
    setPersistentAttributes : function (attr: Record<string, any>)
    {
        this.attr("side", attr.side);
    },
    // this will be called in the customPorts class since the label does not have this functionality in draw2d
    getPersistentAttributes : function () {
        return {
            side: this.attr("side"),
        };
    },
});

window.customDefinitions = Object.assign(window.customDefinitions || {}, {
    customLocators: {
        CustomTopLocator,
        CustomBottomLocator,
        CustomLeftLocator,
        CustomRightLocator,
        CustomPortLabelLocator,
    },
});

