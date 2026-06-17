import GitFileExplorerPlugin from "./../main";
import { App, PluginSettingTab, Setting } from "obsidian";

export interface GitFileExplorerPluginSettings {
	gitChangesWidgetActive: boolean;
	enableNavColorUpdater: boolean;
	promptCommitMsg: boolean;
	gitSyncWidgetActive: boolean;
	navColorStyle: "colored-text" | "margin-highlight";
	autoSyncOnStartup: boolean;
	autoSyncFrequency: number;
	sshOverride: boolean;
	sshDir: string;
	sshExec: string;
	useSecretStorage: boolean;
}

export const DEFAULT_SETTINGS: Partial<GitFileExplorerPluginSettings> = {
	promptCommitMsg: true,
	enableNavColorUpdater: true,
	gitChangesWidgetActive: true,
	gitSyncWidgetActive: true,
	navColorStyle: "colored-text",
	autoSyncOnStartup: false,
	autoSyncFrequency: 0,
	sshOverride: false,
	useSecretStorage: false,
};

export class GitFileExplorerSettingTab extends PluginSettingTab {
	constructor(app: App, private plugin: GitFileExplorerPlugin) {
		super(app, plugin);
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();
		
		let gitChangesSettingsContainer: HTMLElement;

		new Setting(containerEl)
			.setName("Activate git changes widget")
			.setDesc(
				"Show a widget in the file explorer with a counter of the current staged and unstaged changes"
			)
			.setHeading()
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.gitChangesWidgetActive)
					.onChange(async (value) => {
						this.plugin.settings.gitChangesWidgetActive = value;
						await this.plugin.saveSettings();
						
						this.renderGitChangesSettings(gitChangesSettingsContainer, value);
					})
			);

		gitChangesSettingsContainer = containerEl.createDiv();

		this.renderGitChangesSettings(gitChangesSettingsContainer, this.plugin.settings.gitChangesWidgetActive);

		let autoSyncSettingsContainer: HTMLElement;

		new Setting(containerEl)
			.setName("Activate git sync widget")
			.setDesc(
				"Show a widget in the file explorer with a button to sync with the remote repository"
			)
			.setHeading()
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.gitSyncWidgetActive)
					.onChange(async (value) => {
						this.plugin.settings.gitSyncWidgetActive = value;
						await this.plugin.saveSettings();
						
						this.renderAutoSyncSettings(autoSyncSettingsContainer, value);
					})
			);

		autoSyncSettingsContainer = containerEl.createDiv();

		this.renderAutoSyncSettings(autoSyncSettingsContainer, this.plugin.settings.gitSyncWidgetActive);

		containerEl
			.createEl("p")
			.createEl("i")
			.setText("Changes require restarting Obsidian");

		const advancedDetails = containerEl.createEl("details");
		advancedDetails.createEl("summary", { text: "Advanced Options" });
		const advancedContainer = advancedDetails.createDiv();
		this.renderAdvancedOptions(advancedContainer);

		this.containerEl.createEl("h2", {
			text: "About",
		});

		const paragraph = containerEl.createEl("small");
		paragraph.setText("Made with ☕ by ");
		paragraph
			.createEl("a", {
				href: "https://blog.mmolina.me",
			})
			.setText("Mateus Molina");
	}

	private renderGitChangesSettings(container: HTMLElement, isVisible: boolean): void {
		container.empty();
		
		if (isVisible) {
			new Setting(container)
				.setName("Enable prompting commit message")
				.setDesc(
					"Prompt for a commit message when saving a file. If disabled, the commit message is in the format 'Backup @ {iso-timestamp}'"
				)
				.addToggle((toggle) =>
					toggle
						.setValue(this.plugin.settings.promptCommitMsg)
						.onChange(async (value) => {
							this.plugin.settings.promptCommitMsg = value;
							await this.plugin.saveSettings();
						})
				);

			new Setting(container)
				.setName("Change color of changed files in the file explorer")
				.addToggle((toggle) =>
					toggle
						.setValue(this.plugin.settings.enableNavColorUpdater)
						.onChange(async (value) => {
							this.plugin.settings.enableNavColorUpdater = value;
							await this.plugin.saveSettings();
						})
				);

			new Setting(container)
				.setName("Changed files style")
				.setDesc("Choose how changed files should be highlighted in the file explorer")
				.addDropdown((dropdown) =>
					dropdown
						.addOption("colored-text", "Colored text")
						.addOption("margin-highlight", "Margin highlight + colored text")
						.setValue(this.plugin.settings.navColorStyle)
						.onChange(async (value: string) => {
							this.plugin.settings.navColorStyle = value as "colored-text" | "margin-highlight";
							await this.plugin.saveSettings();
						})
				);
		}
	}

	private renderAdvancedOptions(container: HTMLElement): void {
		container.empty();

		new Setting(container)
			.setName("Override SSH defaults")
			.setDesc("Use a custom SSH directory and executable for git and SSH operations performed by the plugin.")
			.addToggle(toggle =>
				toggle
					.setValue(this.plugin.settings.sshOverride)
					.onChange(async (value) => {
						this.plugin.settings.sshOverride = value;
						if (!value)
							await this.plugin.detectAndApplySshDefaults();
						await this.plugin.saveSettings();
						this.renderAdvancedOptions(container);
					})
			);

		new Setting(container)
			.setName("SSH directory")
			.setDesc("Path to a directory containing an SSH config file and identity files. Only affects operations performed by the plugin.")
			.addText(text =>
				text
					.setValue(this.plugin.settings.sshDir ?? "")
					.setDisabled(!this.plugin.settings.sshOverride)
					.onChange(async (value) => {
						this.plugin.settings.sshDir = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(container)
			.setName("SSH executable")
			.setDesc("Path to the ssh executable used by plugin git/ssh operations. When override is off, the plugin uses your global git core.sshCommand if set, otherwise the first ssh on PATH.")
			.addText(text =>
				text
					.setValue(this.plugin.settings.sshExec ?? "")
					.setDisabled(!this.plugin.settings.sshOverride)
					.onChange(async (value) => {
						this.plugin.settings.sshExec = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(container)
			.setName("Use Obsidian's Keychain")
			.setDesc("Let the plugin store and persist sensitive values (e.g. SSH key passphrases) in Obsidian's secure secret storage. If this setting is off, it'll only be used as an intermediary when adding an identity to the SSH agent, for example. Persistence only lasts until Obsidian is closed or if the plugin gets disabled.")
			.addToggle(toggle =>
				toggle
					.setValue(this.plugin.settings.useSecretStorage)
					.onChange(async (value) => {
						this.plugin.settings.useSecretStorage = value;
						await this.plugin.saveSettings();
					})
			);
	}

	private renderAutoSyncSettings(container: HTMLElement, isVisible: boolean): void {
		container.empty();
		
		if (isVisible) {
			new Setting(container)
				.setName("Auto-sync on startup")
				.setDesc(
					"Automatically sync repositories when Obsidian starts"
				)
				.addToggle((toggle) =>
					toggle
						.setValue(this.plugin.settings.autoSyncOnStartup)
						.onChange(async (value) => {
							this.plugin.settings.autoSyncOnStartup = value;
							await this.plugin.saveSettings();
						})
				);

			new Setting(container)
				.setName("Auto-sync frequency (minutes)")
				.setDesc(
					"How often to automatically sync repositories (0 to disable periodic sync)"
				)
				.addSlider((slider) =>
					slider
						.setLimits(0, 240, 5)
						.setValue(this.plugin.settings.autoSyncFrequency)
						.setDynamicTooltip()
						.onChange(async (value) => {
							this.plugin.settings.autoSyncFrequency = value;
							await this.plugin.saveSettings();
						})
				);
		}
	}
}
