import { execFileSync } from "child_process";
import { afterEach } from "vitest";
import { vi } from "vitest";

function binaryOnPath(name: string): boolean {
    const cmd = process.platform === "win32" ? "where" : "which";
    try {
        execFileSync(cmd, [name], { stdio: "pipe" });
        return true;
    } catch {
        return false;
    }
}

const REQUIRED_BINARIES = ["git", "ssh", "ssh-add", "ssh-keygen"];
const missing = REQUIRED_BINARIES.filter(b => !binaryOnPath(b));

if (missing.length > 0) {
    throw new Error(
        `Required binaries not found on PATH: ${missing.join(", ")}\n` +
        `Install Git (which bundles ssh, ssh-add, ssh-keygen) and rerun.\n` +
        `On Windows: ensure Git for Windows is installed and its usr/bin is on PATH.`
    );
}

for (const key of [
    "EDITOR", "GIT_EDITOR", "GIT_SEQUENCE_EDITOR",
    "GIT_ASKPASS", "SSH_ASKPASS",
    "GIT_CONFIG_GLOBAL", "GIT_CONFIG_SYSTEM", "GIT_CONFIG_COUNT", "GIT_EXEC_PATH", "PREFIX",
    "GIT_EXTERNAL_DIFF", "GIT_PAGER", "PAGER",
    "GIT_PROXY_COMMAND", "GIT_TEMPLATE_DIR",
]) delete process.env[key];

afterEach(() => {
    vi.unstubAllEnvs();
});
