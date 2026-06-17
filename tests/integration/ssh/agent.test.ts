import { describe, it, expect } from "vitest";
import { execFileSync } from "child_process";
import { withIsolatedAgent, isolatedAgentAvailable } from "../../helpers/sshAgent";

describe.skipIf(!isolatedAgentAvailable)("withIsolatedAgent", () => {
    it("spawns an agent with SSH_AUTH_SOCK set and the agent is empty on start", async () => {
        await withIsolatedAgent(async (env) => {
            expect(env.SSH_AUTH_SOCK).toBeTruthy();
            expect(env.SSH_AGENT_PID).toBeTruthy();

            let exitCode: number | null = null;
            try {
                execFileSync("ssh-add", ["-l"], {
                    env: { ...process.env, SSH_AUTH_SOCK: env.SSH_AUTH_SOCK },
                    stdio: "pipe",
                });
            } catch (err: any) {
                exitCode = err.status;
            }
            expect(exitCode).toBe(1);
        });
    });

    it("restores SSH_AUTH_SOCK in process.env after the callback", async () => {
        const before = process.env["SSH_AUTH_SOCK"];

        await withIsolatedAgent(async (env) => {
            expect(process.env["SSH_AUTH_SOCK"]).toBe(env.SSH_AUTH_SOCK);
        });

        expect(process.env["SSH_AUTH_SOCK"]).toBe(before);
    });
});
