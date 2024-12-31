export declare const SIDE: {
    readonly LEFT: "left";
    readonly TOP: "top";
    readonly RIGHT: "right";
    readonly BOTTOM: "bottom";
};
export type Side = (typeof SIDE)[keyof typeof SIDE];
export type MenuItem = {
    name: string;
    className?: string;
};
export type Coords = {
    x: number;
    y: number;
};
