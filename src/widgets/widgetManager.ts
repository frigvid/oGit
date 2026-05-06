import { FileExplorerHandler } from "../fileExplorerHandler";
import { GitWidgetFactory } from "./gitWidgetFactory";
import { Widget } from "./widget";
import { AFItem, App, FolderItem } from "obsidian";
import { join } from "path";
import { existsSync } from "fs";
import { SmartDebouncer } from "./utils/smartDebouncer";
import { GitEventBus } from "./utils/eventBus";
import { logGitError } from "../git/utils/gitErrors";

export class WidgetManager {
	private static readonly VAULT_ACTIONS_SELECTOR = '.workspace-sidedock-vault-profile .workspace-drawer-vault-actions';

	private widgets: Widget[] = [];
	private smartDebouncer: SmartDebouncer = new SmartDebouncer(3000);
	private eventBus: GitEventBus = GitEventBus.getInstance();
	private rootContainerEl: HTMLElement | null = null;

	constructor(
		private factory: GitWidgetFactory,
		private fileExplorerHandler: FileExplorerHandler,
		private basePath: string,
		private app: App
	) {
		this.update = this.update.bind(this);
	}

	public async initialize(): Promise<void> {
		await this.addWidgetsForRoot();
	}

	public async update(): Promise<void> {
		this.smartDebouncer.debounce("*", async () => {
			await this.addWidgetsForNewFolderItems();
			await this.updateExistingWidgets();
		});
	}

	public uninstallAll = () => {
		this.eventBus.clearListeners();
		this.smartDebouncer.clearAll();
		this.widgets.forEach((widget) => widget.uninstall());
		this.widgets = [];
		this.rootContainerEl?.remove();
		this.rootContainerEl = null;
	}

	private updateExistingWidgets = async () => {
		await Promise.all(this.widgets.map((widget) => widget.update()));
	};

	private addWidgetsForRoot = async () => {
		if (!existsSync(join(this.basePath, ".git"))) return;

		this.rootContainerEl = this.createRootWidgetContainer() ?? null;
		if (!this.rootContainerEl) return;

		await this.registerWidgets(this.rootContainerEl, this.basePath);
	};

	private addWidgetsForNewFolderItems = async () =>
		await this.fileExplorerHandler.doWithFolderItem(async (folderItem) => {
			if (this.isNewFolderItem(folderItem))
				await this.registerWidgets(folderItem.selfEl, this.getFullPathToItem(folderItem));
			});

	private isNewFolderItem = (folderItem: FolderItem) =>
		!this.widgets.some((widget) =>
			widget.getParent().isEqualNode(folderItem.selfEl)
		);

	private async registerWidgets(parent: HTMLElement, absPath: string): Promise<void> {
		try {
			const widgets = await this.factory.buildWidgets(parent, absPath);

			if (widgets.length > 0) {
				this.widgets.push(...widgets);

				widgets.forEach(widget => {
					this.eventBus.subscribe(absPath, (updatedRepoPath) => {
						this.smartDebouncer.debounce(updatedRepoPath+"-"+widget.getName(), async () => {
							await widget.update();
						});
					});
				});
			}
		} catch (err) {
			logGitError(err, "Failed to register widgets for", absPath);
			return;
		}
	}

	private createRootWidgetContainer(): HTMLElement | undefined {
		const drawerEl = this.app.workspace.leftSplit?.containerEl;
		if (!drawerEl) return undefined;

		const vaultActionsEl = drawerEl.querySelector<HTMLElement>(WidgetManager.VAULT_ACTIONS_SELECTOR);
		if (!vaultActionsEl) {
			console.debug("Vault-actions element not found, Obsidian may have renamed internal selectors");
			return undefined;
		}

		const rootEl = document.createElement('div');
		rootEl.id = 'git-root-widget-container';
		rootEl.setAttribute('data-path', '');
		vaultActionsEl.prepend(rootEl);

		return rootEl;
	}

	private getFullPathToItem(item: AFItem): string {
		return join(this.basePath, item.file.path);
	}
}
