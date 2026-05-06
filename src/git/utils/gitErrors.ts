export function logGitError(err: unknown, errorMsg: string, repoPath: string): void {
    if (err instanceof Error && err.message.startsWith("Not a git repository")) {
        return;
    }

    if (err === "No remote branch") {
        console.warn("No remote branch for repo", repoPath);
        return;
    }
    
    console.error(errorMsg, repoPath, err);
}
