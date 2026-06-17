export class TAbstractFile {
    constructor(public path: string = "") {}
}

export class TFile extends TAbstractFile {}

export class TFolder extends TAbstractFile {
    children: TAbstractFile[] = [];
}

export class View {
    containerEl: HTMLElement = {} as HTMLElement;
}

export class WorkspaceItem {
    containerEl: HTMLElement = {} as HTMLElement;
}

export class FileExplorer extends View {
    fileItems: Record<string, unknown> = {};
    files: WeakMap<HTMLDivElement, TAbstractFile> = new WeakMap();
    getViewType() { return "file-explorer"; }
    getDisplayText() { return "File explorer"; }
    async onClose() {}
}

export class FileSystemAdapter {
    getBasePath(): string { return ""; }
}

export class SecretStorage {
    private store = new Map<string, string>();
    setSecret(id: string, value: string): void { this.store.set(id, value); }
    getSecret(id: string): string | null { return this.store.get(id) ?? null; }
    listSecrets(): string[] { return [...this.store.keys()]; }
    deleteSecret(id: string): void { this.store.delete(id); }
}

export class App {
    secretStorage: SecretStorage = new SecretStorage();
    vault = {
        adapter: new FileSystemAdapter(),
        on: (_event: string, _cb: () => void) => ({ id: 0 }),
    };
    workspace = {
        onLayoutReady: (_cb: () => void) => {},
    };
}

export class Plugin {
    app: App;
    manifest: unknown;
    constructor(app: App, manifest: unknown = {}) {
        this.app = app;
        this.manifest = manifest;
    }
    async loadData(): Promise<Record<string, unknown>> { return {}; }
    async saveData(_data: unknown): Promise<void> {}
    addSettingTab(_tab: unknown): void {}
    registerEvent(event: unknown): unknown { return event; }
}

export class PluginSettingTab {
    containerEl: HTMLElement = { empty: () => {}, createEl: () => ({}) } as unknown as HTMLElement;
    constructor(_app: App, _plugin: Plugin) {}
    display(): void {}
}

export class Modal {
    contentEl: HTMLElement = { empty: () => {}, createEl: () => ({}) } as unknown as HTMLElement;
    constructor(_app: App) {}
    open(): void {}
    close(): void {}
    onOpen(): void {}
    onClose(): void {}
}

export class Setting {
    constructor(_containerEl: HTMLElement) {}
    setName(_name: string): this { return this; }
    setDesc(_desc: string): this { return this; }
    addText(_cb: (_text: unknown) => void): this { return this; }
    addToggle(_cb: (_toggle: unknown) => void): this { return this; }
    addButton(_cb: (_btn: unknown) => void): this { return this; }
    addDropdown(_cb: (_dd: unknown) => void): this { return this; }
    addSlider(_cb: (_sl: unknown) => void): this { return this; }
}

export class Notice {
    constructor(_message: string, _timeout?: number) {}
}

export class Menu {
    addItem(_cb: (_item: MenuItem) => void): this { return this; }
    showAtMouseEvent(_event: MouseEvent): void {}
}

export class MenuItem {
    setTitle(_title: string): this { return this; }
    setIcon(_icon: string): this { return this; }
    onClick(_cb: () => void): this { return this; }
}

export type AFItem = FolderItem | FileItem;

export interface FileItem {
    el: HTMLDivElement;
    file: TFile;
    fileExplorer: FileExplorer;
    info: unknown;
    selfEl: HTMLDivElement;
    innerEl: HTMLDivElement;
}

export interface FolderItem {
    el: HTMLDivElement;
    fileExplorer: FileExplorer;
    info: unknown;
    selfEl: HTMLDivElement;
    innerEl: HTMLDivElement;
    file: TFolder;
    children: AFItem[];
    childrenEl: HTMLDivElement;
    collapseIndicatorEl: HTMLDivElement;
    collapsed: boolean;
    pusherEl: HTMLDivElement;
}
