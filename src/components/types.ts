export const SIDE = {
    LEFT: "left",
    TOP: "top",
    RIGHT: "right",
    BOTTOM: "bottom",
} as const;

export type Side = (typeof SIDE)[keyof typeof SIDE];

export type MenuItem = {
    name: string;
    className?: string;
};

export type Coords = {
    x: number;
    y: number;
};