import {
    mkdtempSync as createTempDirSync,
    rmSync as removeDirSync,
    mkdirSync as createDirSync,
    writeFileSync as writeFileContents,
} from "fs";
import { join } from "path";
import { tmpdir } from "os";
import simpleGit from "simple-git";

/** Creates a temp directory and returns its path plus a cleanup function. */
export function createTempDir(prefix = "ogit-test-"): { path: string; cleanup: () => void } {
    const path = createTempDirSync(join(tmpdir(), prefix));
    return { path, cleanup: () => removeDirSync(path, { recursive: true, force: true }) };
}

/**
 * Creates an initialized git repository in a temp directory.
 * Configures local user identity so commits work without a global git config.
 * Returns the repo path, a simpleGit instance scoped to it, and a cleanup function.
 */
export async function createTempGitRepo(): Promise<{
    path: string;
    git: ReturnType<typeof simpleGit>;
    cleanup: () => void;
}> {
    const { path, cleanup } = createTempDir();
    const git = simpleGit(path);
    await git.init();
    await git.addConfig("user.email", "test@ogit.test");
    await git.addConfig("user.name", "oGit Test");
    return { path, git, cleanup };
}

/** Writes a file into a repo directory and returns its relative path. */
export function writeRepoFile(repoPath: string, name: string, content = "content\n"): string {
    writeFileContents(join(repoPath, name), content);
    return name;
}

/** Creates nested sub-directories under repoPath and returns the deepest path. */
export function createNestedDir(repoPath: string, ...parts: string[]): string {
    const fullPath = join(repoPath, ...parts);
    createDirSync(fullPath, { recursive: true });
    return fullPath;
}
