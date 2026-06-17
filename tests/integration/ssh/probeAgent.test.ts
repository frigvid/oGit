import { describe, it, expect } from "vitest";
import { vi } from "vitest";
import { App } from "obsidian";
import { SshAddHandler } from "../../../src/sshAddHandler";
import { withIsolatedAgent, isolatedAgentAvailable } from "../../helpers/sshAgent";

function makeHandler() {
    const settings = { useSecretStorage: false, sshExec: "", sshDir: "", sshOverride: false };
    return new SshAddHandler(new App(), "/base", settings as any);
}

describe.skipIf(!isolatedAgentAvailable)("SshAddHandler.probeAgent — agent running", () => {
    it("returns true when an ssh-agent is available", async () => {
        const result = await withIsolatedAgent(async () => {
            const h = makeHandler();
            return (h as any).probeAgent();
        });
        expect(result).toBe(true);
    });
});

describe("SshAddHandler.probeAgent — no agent", () => {
    it("returns false when SSH_AUTH_SOCK points to a non-existent socket", async () => {
        vi.stubEnv("SSH_AUTH_SOCK", "/nonexistent-socket-path");
        const h = makeHandler();
        const result = await (h as any).probeAgent();
        expect(result).toBe(false);
    });
});
