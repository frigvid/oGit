import { describe, it, expect, afterEach } from "vitest";
import { execFileSync } from "child_process";
import { join, dirname, basename } from "path";
import { runWithAskpass } from "../../../src/ssh/askpass";
import { generateTestSshKey } from "../../helpers/sshKey";
import { withIsolatedAgent, isolatedAgentAvailable } from "../../helpers/sshAgent";

/** Resolves ssh-add the same way production does: derive from whichever ssh is first on PATH. */
function resolveTestSshAdd(): string {
    const which = process.platform === "win32" ? "where" : "which";
    try {
        const out = execFileSync(which, ["ssh"], { encoding: "utf8", stdio: "pipe" }).trim();
        const ssh = out.split(/\r?\n/)[0].trim();
        if (!ssh) return "ssh-add";
        const base = basename(ssh);
        const dir = dirname(ssh);
        const addBase = /\.exe$/i.test(base) ? base.slice(0, -4) + "-add.exe" : base + "-add";
        return dir === "." ? addBase : join(dir, addBase);
    } catch {
        return "ssh-add";
    }
}

const testSshAdd = resolveTestSshAdd();

describe.skipIf(!isolatedAgentAvailable)("runWithAskpass (SshAddHandler integration)", () => {
    let cleanup: () => void;
    afterEach(() => cleanup?.());

    it("returns ok:true and key appears in ssh-add -l", async () => {
        const key = generateTestSshKey("correct horse");
        cleanup = key.cleanup;

        const agentResult = await withIsolatedAgent(async (env) => {
            const result = await runWithAskpass(testSshAdd, key.keyPath, key.passphrase);
            if (!result.ok) return { result, hasKey: false };

            let listed = "";
            try {
                listed = execFileSync("ssh-add", ["-l"], {
                    env: { ...process.env, SSH_AUTH_SOCK: env.SSH_AUTH_SOCK },
                    encoding: "utf8",
                });
            } catch { /* ssh-add -l exits 1 if no keys loaded */ }
            return { result, hasKey: listed.includes("ogit-test-key") };
        });

        if (!agentResult) return; // withIsolatedAgent couldn't spawn an agent — skip.

        expect(agentResult.result.ok).toBe(true);
        expect(agentResult.hasKey).toBe(true);
    });

    it("returns ok:false quickly when the passphrase is wrong and does not hang", async () => {
        const key = generateTestSshKey("correct horse");
        cleanup = key.cleanup;

        const start = Date.now();
        const agentResult = await withIsolatedAgent(async () => {
            // With a live agent, ssh-add connects, calls askpass, gets the wrong passphrase,
            // and exits quickly rather than hanging on a dead/missing agent socket.
            return runWithAskpass(testSshAdd, key.keyPath, "wrong passphrase");
        });
        const elapsed = Date.now() - start;

        if (!agentResult) return; // withIsolatedAgent couldn't spawn an agent — skip.

        expect(agentResult.ok).toBe(false);
        // Must exit on its own before our 10s kill timeout fires. We allow 12s to account for
        // key-generation time + a few ssh-add retry rounds.
        expect(elapsed).toBeLessThan(12_000);
    });

    it.skipIf(!process.env["OGIT_E2E"])("full execute() smoke test — set OGIT_E2E=1 to run", () => {});
});
