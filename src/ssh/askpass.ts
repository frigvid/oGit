import { spawn } from "child_process";
import { mkdtempSync, writeFileSync, chmodSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

export type AddResult =
	| { ok: true }
	| { ok: false; kind: "wrong-passphrase" | "other"; detail?: string };

export type SshFlavor = "posix" | "msys" | "win-native";

export function detectFlavor(sshAddExec: string): SshFlavor {
	if (process.platform !== "win32") return "posix";
	const lower = sshAddExec.toLowerCase();
	if (
		/\\(usr|mingw\d+)\\bin\\/.test(lower) ||
		lower.includes("\\git\\") ||
		lower.includes("\\portablegit\\")
	) return "msys";
	if (lower.includes("\\system32\\openssh\\")) return "win-native";
	return "win-native";
}

export function toMsysPath(nativePath: string): string {
	if (/^[A-Za-z]:[\\\/]/.test(nativePath)) {
		return "/" + nativePath[0].toLowerCase() + nativePath.slice(2).replace(/\\/g, "/");
	}
	return nativePath.replace(/\\/g, "/");
}

function classifyStderr(stderr: string): "wrong-passphrase" | "other" {
	if (/bad pass(phrase|word)|incorrect pass|wrong pass/i.test(stderr)) return "wrong-passphrase";
	return "other";
}

export function runWithAskpass(
	sshAddExec: string,
	keyPath: string,
	passphrase: string,
): Promise<AddResult> {
	const flavor = detectFlavor(sshAddExec);
	const tmpDir = mkdtempSync(join(tmpdir(), "ogit-askpass-"));

	try {
		let helperPath: string;

		if (flavor === "win-native") {
			// Uses PowerShell to read SSH_PASSPHRASE so special characters survive cmd expansion.
			helperPath = join(tmpDir, "askpass.bat");
			writeFileSync(
				helperPath,
				"@powershell -NoProfile -NonInteractive -Command \"[Console]::Write($env:SSH_PASSPHRASE)\"\r\n",
				"utf8",
			);
		} else {
			helperPath = join(tmpDir, "askpass.sh");
			writeFileSync(
				helperPath,
				"#!/bin/sh\nprintf '%s' \"$SSH_PASSPHRASE\"\n",
				"utf8",
			);
			if (flavor === "posix") chmodSync(helperPath, 0o700);
		}

		const askpassEnvValue = flavor === "msys" ? toMsysPath(helperPath) : helperPath;
		const spawnEnv: NodeJS.ProcessEnv = {
			...process.env,
			DISPLAY: process.env.DISPLAY ?? "unused",
			SSH_ASKPASS: askpassEnvValue,
			SSH_ASKPASS_REQUIRE: "force",
			SSH_PASSPHRASE: passphrase,
		};

		return new Promise<AddResult>((resolve) => {
			const child = spawn(sshAddExec, [keyPath], {
				env: spawnEnv,
				stdio: ["ignore", "pipe", "pipe"],
				windowsHide: true,
			});

			let stderr = "";
			child.stderr.on("data", (d: Buffer) => { stderr += d.toString(); });

			const timeout = setTimeout(() => {
				child.kill();
				console.error("[ogit] ssh-add: timed out after 10s");
				resolve({ ok: false, kind: "other", detail: "timed out" });
			}, 10_000);

			child.on("error", (err: Error) => {
				clearTimeout(timeout);
				console.error("[ogit] ssh-add: spawn failed:", err);
				resolve({ ok: false, kind: "other", detail: err.message });
			});

			child.on("close", (code: number | null) => {
				clearTimeout(timeout);
				rmSync(tmpDir, { recursive: true, force: true });
				if (code === 0) {
					console.info("[ogit] ssh-add: identity added:", keyPath);
					resolve({ ok: true });
				} else {
					const trimmed = stderr.trim();
					const kind = classifyStderr(trimmed);
					console.error("[ogit] ssh-add failed:", trimmed || `exit ${code}`);
					resolve({ ok: false, kind, detail: trimmed || `exit ${code}` });
				}
			});
		});
	} catch (err: any) {
		rmSync(tmpDir, { recursive: true, force: true });
		return Promise.resolve({ ok: false, kind: "other", detail: String(err?.message ?? err) });
	}
}

if (import.meta.vitest) {
	const { describe, it, expect } = import.meta.vitest;

	describe("detectFlavor", () => {
		it("returns posix on non-win32", () => {
			const originalPlatform = process.platform;
			Object.defineProperty(process, "platform", { value: "linux", configurable: true });
			try {
				expect(detectFlavor("ssh-add")).toBe("posix");
				expect(detectFlavor("/usr/bin/ssh-add")).toBe("posix");
			} finally {
				Object.defineProperty(process, "platform", { value: originalPlatform, configurable: true });
			}
		});

		it("returns msys for Git-for-Windows usr/bin path", () => {
			const originalPlatform = process.platform;
			Object.defineProperty(process, "platform", { value: "win32", configurable: true });
			try {
				expect(detectFlavor("C:\\Program Files\\Git\\usr\\bin\\ssh-add.exe")).toBe("msys");
				expect(detectFlavor("C:\\PortableGit\\usr\\bin\\ssh-add.exe")).toBe("msys");
				expect(detectFlavor("C:\\Program Files\\Git\\mingw64\\bin\\ssh-add.exe")).toBe("msys");
			} finally {
				Object.defineProperty(process, "platform", { value: originalPlatform, configurable: true });
			}
		});

		it("returns win-native for Microsoft System32 path", () => {
			const originalPlatform = process.platform;
			Object.defineProperty(process, "platform", { value: "win32", configurable: true });
			try {
				expect(detectFlavor("C:\\Windows\\System32\\OpenSSH\\ssh-add.exe")).toBe("win-native");
			} finally {
				Object.defineProperty(process, "platform", { value: originalPlatform, configurable: true });
			}
		});

		it("defaults to win-native for unknown Windows path", () => {
			const originalPlatform = process.platform;
			Object.defineProperty(process, "platform", { value: "win32", configurable: true });
			try {
				expect(detectFlavor("ssh-add")).toBe("win-native");
				expect(detectFlavor("C:\\Tools\\OpenSSH\\ssh-add.exe")).toBe("win-native");
			} finally {
				Object.defineProperty(process, "platform", { value: originalPlatform, configurable: true });
			}
		});
	});

	describe("toMsysPath", () => {
		it("converts C:\\foo\\bar to /c/foo/bar", () => {
			expect(toMsysPath("C:\\foo\\bar")).toBe("/c/foo/bar");
		});

		it("converts drive letter to lowercase", () => {
			expect(toMsysPath("D:\\Users\\alice\\key.sh")).toBe("/d/Users/alice/key.sh");
		});

		it("leaves non-drive paths unchanged (forward slash)", () => {
			expect(toMsysPath("/tmp/askpass.sh")).toBe("/tmp/askpass.sh");
		});

		it("converts backslashes without drive prefix", () => {
			expect(toMsysPath("foo\\bar\\baz")).toBe("foo/bar/baz");
		});
	});
}
