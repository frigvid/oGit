import { describe, it, expect, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { existsSync } from "fs";
import { App } from "obsidian";
import { SshAddHandler } from "../../../src/sshAddHandler";
import { generateTestSshKey } from "../../helpers/sshKey";

describe("SshAddHandler.resolveKeyPath", () => {
    let cleanups: Array<() => void> = [];

    afterEach(() => {
        cleanups.forEach(c => c());
        cleanups = [];
    });

    it("resolves an IdentityFile from a custom ssh config to an existing path", async () => {
        const key = generateTestSshKey("test-passphrase");
        cleanups.push(key.cleanup);

        const sshDir = mkdtempSync(join(tmpdir(), "ogit-sshtest-"));
        cleanups.push(() => rmSync(sshDir, { recursive: true, force: true }));

        const keyPathForward = key.keyPath.replace(/\\/g, "/");
        writeFileSync(join(sshDir, "config"), `Host test-host\n    IdentityFile ${keyPathForward}\n`);

        const settings = { useSecretStorage: false, sshExec: "", sshDir, sshOverride: true };
        const handler = new SshAddHandler(new App(), "/base", settings as any);

        const resolved: string | null = await (handler as any).resolveKeyPath("test-host");

        expect(resolved).not.toBeNull();
        expect(existsSync(resolved!)).toBe(true);
    });
});
