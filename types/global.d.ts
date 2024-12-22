declare global {
    interface JQueryStatic {
        contextMenu(options: any): void;
        contextMenu(action: string): void;
    }
}

export {};