export function logGitError(err: unknown, errorMsg: string, repoPath: string): void {
    if (err instanceof Error && err.message.startsWith("Not a git repository")) {
        return;
    }

    if (err === "No remote branch") {
        console.warn("No remote branch for repo", repoPath);
        return;
    }

    const spawned = extractSpawnedSshCommand(err);
    if (spawned) {
        console.error(errorMsg, repoPath, "\n  Spawned: " + spawned, "\n", err);
        return;
    }

    console.error(errorMsg, repoPath, err);
}

function extractSpawnedSshCommand(err: unknown): string | undefined {
    const msg = err instanceof Error ? err.message : typeof err === "string" ? err : "";
    const lines = msg.split(/\r?\n/).filter(line => /trace:\s+run_command:.*\bssh\b/i.test(line));
    if (lines.length === 0) return undefined;
    return lines.map(l => l.replace(/^.*trace:\s+run_command:\s*/, "").trim()).join("\n  ");
}
