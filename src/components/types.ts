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

/* The resting background of a port label. Net highlighting swaps it for the connection
 * colour, so this is also the value serialization falls back to - a highlight is view
 * state and must never be written into a saved circuit.
 */
export const PORT_LABEL_BACKGROUND_COLOR = "#FFFFFF";


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
    /* library group path such as "Power/Sources" - optional, so library files written before
     * groups existed (circuit-sketcher-lib included) still validate. Unlisted fields would be
     * stripped by zod on import, so it has to be declared here. */
    group: z.string().optional(),
    // clockwise quarter turns of the image in degrees, written only once a block is turned
    imageRotation: z.number().optional(),
});

export type LibrarySchema = z.infer<typeof LibrarySchemaSchema>;

export const LibrarySchemaSchema = z.record(CustomBlockSchema);