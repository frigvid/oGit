import { App, TFile, TFolder } from "obsidian";
import { execFile } from "child_process";
import { promisify } from "util";
import { existsSync, readFileSync, mkdtempSync, writeFileSync, rmSync } from "fs";
import { join, dirname } from "path";
import { homedir, tmpdir } from "os";
import { createHash } from "crypto";
import { CapabilityProvider } from "./capabilityProvider";
import { GitRepository } from "./git/gitRepository";
import { parseRemoteUrl } from "./git/utils/remoteUrl";
import { buildSshArgs, buildSshAddExec, buildSshExec } from "./git/utils/sshOptions";
import { readOriginRemoteUrl } from "./git/utils/repoRoot";
import { GitFileExplorerPluginSettings } from "./settings";
import { SshAuthModal } from "./sshAuthModal";
import { runWithAskpass } from "./ssh/askpass";

const execFileAsync = promisify(execFile);

export class SshAddHandler implements CapabilityProvider {
	private static COMMAND_NAME = "Add identity to ssh-agent";
	private static COMMAND_ID = "ssh-add-identity";
	private afterAddCallback?: () => void;

	constructor(
		private app: App,
		private basePath: string,
		private settings: GitFileExplorerPluginSettings
	) {}

	withCallback(callback: () => void): this {
		this.afterAddCallback = callback;
		return this;
	}

	public getCommandName(): string { return SshAddHandler.COMMAND_NAME; }
	public getIcon(): string { return "key"; }
	public getCommandId(): string { return SshAddHandler.COMMAND_ID; }

	public shouldShowFor(fileOrFolder: TFile | TFolder): boolean {
		if (!(fileOrFolder instanceof TFolder)) return false;
		const absPath = join(this.basePath, fileOrFolder.path);
		if (!GitRepository.isGitRepo(absPath)) return false;
		const url = readOriginRemoteUrl(absPath);
		if (!url) return false;
		return parseRemoteUrl(url).kind.startsWith("ssh-");
	}

	public async execute(fileOrFolder: TFile | TFolder): Promise<void> {
		if (!(fileOrFolder instanceof TFolder)) return;

		const repoRoot = join(this.basePath, fileOrFolder.path);
		if (!GitRepository.isGitRepo(repoRoot)) {
			console.warn("[ogit] ssh-add: not a git repo at", repoRoot);
			return;
		}

		const url = readOriginRemoteUrl(repoRoot);
		if (!url) {
			console.warn("[ogit] ssh-add: no origin remote found in", repoRoot);
			return;
		}

		const parsed = parseRemoteUrl(url);
		let host: string;
		if (parsed.kind === "ssh-alias") {
			host = parsed.alias;
		} else if (parsed.kind === "ssh-userhost" || parsed.kind === "ssh-url") {
			host = parsed.host;
		} else {
			console.warn("[ogit] ssh-add: remote is not SSH-shaped:", url);
			return;
		}

		const keyPath = await this.resolveKeyPath(host);
		if (!keyPath) {
			console.warn("[ogit] ssh-add: no identity files found for", host);
			return;
		}

		const agentOk = await this.probeAgent();
		if (!agentOk) {
			console.warn("[ogit] ssh-add: ssh-agent is not running. Start it (Windows: Start-Service ssh-agent; POSIX: eval $(ssh-agent -s))");
			return;
		}

		const sshAddExec = buildSshAddExec(this.settings);

		if (!this.settings.useSecretStorage) {
			new SshAuthModal(this.app, keyPath, async (passphrase) => {
				const result = await runWithAskpass(sshAddExec, keyPath, passphrase);
				if (result.ok) this.afterAddCallback?.();
				return result;
			}).open();
			return;
		}

		const id = this.secretId(keyPath);
		const cached = this.app.secretStorage.getSecret(id);
		if (cached) {
			const result = await runWithAskpass(sshAddExec, keyPath, cached);
			if (result.ok) {
				console.info("[ogit] ssh-add: identity added (cached passphrase):", keyPath);
				this.afterAddCallback?.();
				return;
			}
			if (result.kind === "wrong-passphrase") {
				this.app.secretStorage.deleteSecret(id);
				console.info("[ogit] ssh-add: cached passphrase rejected, prompting");
			} else {
				console.error("[ogit] ssh-add: non-passphrase failure with cached secret:", result.detail);
				return;
			}
		}

		new SshAuthModal(this.app, keyPath, async (passphrase) => {
			const result = await runWithAskpass(sshAddExec, keyPath, passphrase);
			if (result.ok) {
				this.app.secretStorage.setSecret(id, passphrase);
				this.afterAddCallback?.();
			}
			return result;
		}).open();
	}

	private async resolveKeyPath(host: string): Promise<string | null> {
		const sshArgs = buildSshArgs(this.settings);
		let stdout: string;
		try {
			const result = await execFileAsync(
				buildSshExec(this.settings),
				[...sshArgs, "-G", host],
				{ timeout: 5000 }
			);
			stdout = result.stdout as string;
		} catch (err) {
			console.error("[ogit] ssh-add: ssh -G failed:", err);
			return null;
		}

		const candidates: string[] = [];
		for (const line of stdout.split(/\r?\n/)) {
			const m = line.match(/^identityfile\s+(.+)$/i);
			if (m) candidates.push(m[1].trim());
		}

		if (candidates.length === 0) {
			console.warn("[ogit] ssh-add: ssh -G returned no identityfile entries for", host);
			return null;
		}

		for (const raw of candidates) {
			const normalized = this.normalizeSshPath(raw);
			if (existsSync(normalized)) {
				console.debug("[ogit] ssh-add: identity match", { host, raw, normalized });
				return normalized;
			}
			console.debug("[ogit] ssh-add: identity miss", { host, raw, normalized });
		}

		const fallback = candidates[0];
		console.warn("[ogit] ssh-add: no identity file resolved on disk; passing raw to ssh-add:", fallback);
		return fallback;
	}

	private normalizeSshPath(raw: string): string {
		const homeDir = this.settings.sshDir ? dirname(this.settings.sshDir) : homedir();
		const username = process.env.USER || process.env.USERNAME || "";

		let p = raw
			.replace(/%d/g, homeDir)
			.replace(/%u/g, username)
			.replace(/%%/g, "%");

		if (p === "~") {
			p = homeDir;
		} else if (p.startsWith("~/")) {
			p = join(homeDir, p.slice(2));
		}

		if (process.platform === "win32" && /^\/[a-z]\//i.test(p)) {
			const drive = p[1].toUpperCase();
			const rest = p.slice(3).replace(/\//g, "\\");
			p = `${drive}:\\${rest}`;
		}

		return p;
	}

	private async probeAgent(): Promise<boolean> {
		try {
			await execFileAsync(buildSshAddExec(this.settings), ["-l"], { timeout: 5000 });
			return true;
		} catch (err: any) {
			if (err?.code === 2) return false;
			return true;
		}
	}

	private secretId(keyPath: string): string {
		const pubPath = keyPath + ".pub";
		const seed = existsSync(pubPath) ? readFileSync(pubPath, "utf8").trim() : keyPath;
		return "ogit-" + createHash("sha256").update(seed).digest("hex").slice(0, 59);
	}
}

if (import.meta.vitest) {
	const { describe, it, expect, afterEach, vi } = import.meta.vitest;

	function makeHandler(sshDir = "") {
		const settings = { useSecretStorage: false, sshExec: "", sshDir, sshOverride: false };
		return new SshAddHandler(new App(), "/base", settings as any);
	}

	describe("normalizeSshPath", () => {
		const fakeHome = join(tmpdir(), "ogit-fake-home");
		const fakeSshDir = join(fakeHome, ".ssh");

		afterEach(() => {
			vi.unstubAllEnvs();
		});

		it("expands %d to homeDir derived from sshDir", () => {
			const h = makeHandler(fakeSshDir);
			expect((h as any).normalizeSshPath("%d/key")).toBe(fakeHome + "/key");
		});

		it("expands %u to the current user env var", () => {
			vi.stubEnv("USER", "alice");
			vi.stubEnv("USERNAME", "");
			const h = makeHandler(fakeSshDir);
			expect((h as any).normalizeSshPath("%u-key")).toBe("alice-key");
		});

		it("expands %% to a literal percent", () => {
			const h = makeHandler(fakeSshDir);
			expect((h as any).normalizeSshPath("pre%%suf")).toBe("pre%suf");
		});

		it("expands bare ~ to homeDir", () => {
			const h = makeHandler(fakeSshDir);
			expect((h as any).normalizeSshPath("~")).toBe(fakeHome);
		});

		it("expands ~/subpath to join(homeDir, subpath)", () => {
			const h = makeHandler(fakeSshDir);
			expect((h as any).normalizeSshPath("~/subdir/key")).toBe(join(fakeHome, "subdir", "key"));
		});

		it("converts MSYS /c/Users/... to C:\\Users\\... on win32", () => {
			const originalPlatform = process.platform;
			try {
				Object.defineProperty(process, "platform", { value: "win32", configurable: true });
				const h = makeHandler();
				expect((h as any).normalizeSshPath("/c/Users/alice/key"))
					.toBe("C:\\Users\\alice\\key");
			} finally {
				Object.defineProperty(process, "platform", { value: originalPlatform, configurable: true });
			}
		});
	});

	describe("secretId", () => {
		let tmpDir: string;
		let cleanup: () => void;

		afterEach(() => {
			cleanup?.();
		});

		it("hashes pub-file content when .pub exists, prefixed ogit-, length 64", () => {
			tmpDir = mkdtempSync(join(tmpdir(), "ogit-secretid-"));
			cleanup = () => rmSync(tmpDir, { recursive: true, force: true });

			const keyPath = join(tmpDir, "test_key");
			const pubContent = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAA fake@test\n";
			writeFileSync(keyPath + ".pub", pubContent);

			const h = makeHandler();
			const id: string = (h as any).secretId(keyPath);

			expect(id).toMatch(/^ogit-/);
			expect(id).toHaveLength(64);
			const expected = "ogit-" + createHash("sha256")
				.update(pubContent.trim()).digest("hex").slice(0, 59);
			expect(id).toBe(expected);
		});

		it("hashes keyPath string when .pub does not exist, prefixed ogit-, length 64", () => {
			tmpDir = mkdtempSync(join(tmpdir(), "ogit-secretid-"));
			cleanup = () => rmSync(tmpDir, { recursive: true, force: true });

			const keyPath = join(tmpDir, "no_pub_key");

			const h = makeHandler();
			const id: string = (h as any).secretId(keyPath);

			expect(id).toMatch(/^ogit-/);
			expect(id).toHaveLength(64);
			const expected = "ogit-" + createHash("sha256").update(keyPath).digest("hex").slice(0, 59);
			expect(id).toBe(expected);
		});
	});
}
