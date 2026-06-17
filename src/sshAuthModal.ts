import { App, ButtonComponent, Modal, Notice, Setting, TextComponent } from "obsidian";
import { AddResult } from "./ssh/askpass";

export class SshAuthModal extends Modal {
	private passphrase = "";
	private submitting = false;
	private button!: ButtonComponent;
	private inputComp!: TextComponent;
	private errorEl!: HTMLElement;

	constructor(
		app: App,
		private keyPath: string,
		private onSubmit: (passphrase: string) => Promise<AddResult>
	) {
		super(app);
	}

	onOpen() {
		const { contentEl } = this;

		contentEl.createEl("p", { text: `Unlocking: ${this.keyPath}` });

		this.errorEl = contentEl.createEl("p", { cls: "ogit-modal-error" });
		this.errorEl.style.color = "var(--text-error)";
		this.errorEl.style.display = "none";

		const setting = new Setting(contentEl)
			.setName("Passphrase")
			.addText(t => {
				t.inputEl.type = "password";
				t.onChange(v => { this.passphrase = v; });
				this.inputComp = t;
			});

		setting.settingEl.addEventListener("keydown", e => {
			if (e.key === "Enter") this.submit();
		});

		new Setting(contentEl).addButton(b => {
			b.setButtonText("Add").setCta().onClick(() => this.submit());
			this.button = b;
		});
	}

	private async submit() {
		if (this.submitting) return;
		this.submitting = true;
		this.button.setDisabled(true);
		this.errorEl.style.display = "none";

		const result = await this.onSubmit(this.passphrase);

		if (result.ok) {
			this.close();
			return;
		}

		if (result.kind === "wrong-passphrase") {
			this.errorEl.textContent = "Wrong passphrase, try again";
			this.errorEl.style.display = "";
			this.passphrase = "";
			this.inputComp.setValue("");
			this.inputComp.inputEl.focus();
		} else {
			this.close();
			new Notice("ssh-add failed: " + (result.detail ?? "unknown error"));
		}

		this.submitting = false;
		this.button.setDisabled(false);
	}

	onClose() {
		this.contentEl.empty();
	}
}
