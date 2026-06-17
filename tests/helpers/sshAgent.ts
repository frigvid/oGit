import { execFileSync, spawnSync } from "child_process";
import { existsSync } from "fs";
import { join, dirname } from "path";

export interface AgentEnv {
    SSH_AUTH_SOCK: string;
    SSH_AGENT_PID: string;
}

function findSshAgentBinary(): string | null {
    if (process.platform === "win32") {
        try {
            const gitPath = execFileSync("where", ["git"], { encoding: "utf8", stdio: "pipe" })
                .trim().split(/\r?\n/)[0].trim();
            let dir = dirname(gitPath);
            while (dir && dir !== dirname(dir)) {
                const candidate = join(dir, "usr", "bin", "ssh-agent.exe");
                if (existsSync(candidate)) return candidate;
                dir = dirname(dir);
            }
        } catch {}

        try {
            const out = execFileSync("where", ["ssh-agent"], { encoding: "utf8", stdio: "pipe" });
            for (const line of out.trim().split(/\r?\n/)) {
                const p = line.trim();
                if (p && !/system32[\\/]openssh/i.test(p)) return p;
            }
        } catch {}

        return null;
    }

    try {
        const out = execFileSync("which", ["ssh-agent"], { encoding: "utf8", stdio: "pipe" });
        const first = out.trim().split(/\r?\n/)[0];
        if (first) return first;
    } catch {}

    return null;
}

const agentBinary = findSshAgentBinary();

export const isolatedAgentAvailable = agentBinary !== null;

function parseAgentOutput(output: string): AgentEnv | null {
    const sockMatch = output.match(/SSH_AUTH_SOCK=([^;]+)/);
    const pidMatch = output.match(/SSH_AGENT_PID=(\d+)/);
    if (!sockMatch || !pidMatch) return null;
    return {
        SSH_AUTH_SOCK: sockMatch[1].trim(),
        SSH_AGENT_PID: pidMatch[1].trim(),
    };
}

export async function withIsolatedAgent<T>(
    cb: (env: AgentEnv) => Promise<T>
): Promise<T | null> {
    if (!agentBinary) return null;

    const result = spawnSync(agentBinary, [], { encoding: "utf8" });
    if (result.status !== 0 || !result.stdout) return null;

    const agentEnv = parseAgentOutput(result.stdout);
    if (!agentEnv) return null;

    const prevSock = process.env["SSH_AUTH_SOCK"];
    const prevPid = process.env["SSH_AGENT_PID"];

    process.env["SSH_AUTH_SOCK"] = agentEnv.SSH_AUTH_SOCK;
    process.env["SSH_AGENT_PID"] = agentEnv.SSH_AGENT_PID;

    try {
        return await cb(agentEnv);
    } finally {
        try {
            process.kill(parseInt(agentEnv.SSH_AGENT_PID, 10));
        } catch {}

        if (prevSock === undefined) {
            delete process.env["SSH_AUTH_SOCK"];
        } else {
            process.env["SSH_AUTH_SOCK"] = prevSock;
        }

        if (prevPid === undefined) {
            delete process.env["SSH_AGENT_PID"];
        } else {
            process.env["SSH_AGENT_PID"] = prevPid;
        }
    }
}
