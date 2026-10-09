declare global {
    interface JQueryStatic {
        contextMenu(options: any): void;
        contextMenu(action: string): void;
    }

    // jquery-contextmenu's own opener: shows the menu registered for these elements at a page position
    interface JQuery {
        contextMenu(position: {x: number; y: number}): JQuery;
    }
}

export {};