/************************************************************************
 *    Copyright (C) 2024 Code Forge Temple                              *
 *    This file is part of circuit-sketcher-core project                *
 *    Licensed under the GNU General Public License v3.0.               *
 *    See the LICENSE file in the project root for more information.    *
 ************************************************************************/

import draw2d from "draw2d";

const setGetterAndSetter = (thisRef: Record<any, any>) => {
    if(thisRef != null) {
        thisRef.getterWhitelist = {
            index () {
                return thisRef.index;
            },
            total () {
                return thisRef.total;
            },
        };
        thisRef.setterWhitelist = {
            index (value: number) {
                thisRef.index = value;
            },
            total (value: number) {
                thisRef.total = value;
            },
        };
    }
}


export const CustomTopLocator = draw2d.layout.locator.Locator.extend({
    NAME : "customDefinitions.customLocators.CustomTopLocator",
    init: function (index: number, total: any) {
        this._super();

        setGetterAndSetter(this);

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

        setGetterAndSetter(this);

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

        setGetterAndSetter(this);

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

        setGetterAndSetter(this);

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

window.customDefinitions = Object.assign(window.customDefinitions || {}, {
    customLocators: {
        CustomTopLocator,
        CustomBottomLocator,
        CustomLeftLocator,
        CustomRightLocator,
    },
});

