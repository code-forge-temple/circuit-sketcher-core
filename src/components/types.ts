import z from "zod";

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


export const LabelSchema = z.object({
    type: z.string(),
    id: z.string(),
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
    alpha: z.number(),
    selectable: z.boolean(),
    draggable: z.boolean(),
    angle: z.number(),
    userData: z.record(z.any()),
    cssClass: z.string(),
    ports: z.array(z.any()),
    bgColor: z.string(),
    color: z.string(),
    stroke: z.number(),
    radius: z.number(),
    dasharray: z.any().nullable(),
    text: z.string(),
    outlineStroke: z.number(),
    outlineColor: z.string(),
    fontSize: z.number(),
    fontColor: z.string(),
    fontFamily: z.string(),
    bold: z.boolean(),
    editor: z.string(),
    locator: z.string(),
});

export const CustomBlockSchema = z.object({
    type: z.literal("customDefinitions.CustomBlock"),
    id: z.string(),
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
    alpha: z.number(),
    selectable: z.boolean(),
    draggable: z.boolean(),
    angle: z.number(),
    userData: z.record(z.any()),
    cssClass: z.string(),
    ports: z.array(z.any()),
    path: z.string(),
    labels: z.array(LabelSchema),
    lockedPorts: z.boolean(),
});

export type LibrarySchema = z.infer<typeof LibrarySchemaSchema>;

export const LibrarySchemaSchema = z.record(CustomBlockSchema);