import { describe, it, expect, afterEach } from "vitest";
import { createTempDir } from "../../helpers/tempRepo";
import { GitRepository } from "../../../src/git/gitRepository";

let cleanup: () => void;

afterEach(() => cleanup?.());

describe("GitRepository.initGitRepo", () => {
    it("creates a .git directory and returns a usable GitRepository", async () => {
        const { path, cleanup: c } = createTempDir();
        cleanup = c;

        GitRepository.initGitRepo(path);

        // Yield to the event loop so the fire-and-forget git.init() can finish
        await new Promise(r => setTimeout(r, 500));

        expect(GitRepository.isGitRepo(path)).toBe(true);
    });

    it("allows a subsequent getInstance call to succeed", async () => {
        const { path, cleanup: c } = createTempDir();
        cleanup = c;

        GitRepository.initGitRepo(path);
        await new Promise(r => setTimeout(r, 500));

        await expect(GitRepository.getInstance(path)).resolves.toBeDefined();
    });

    it("setup resolves without throwing on a remote-less repo", async () => {
        const { path, cleanup: c } = createTempDir();
        cleanup = c;

        GitRepository.initGitRepo(path);
        await new Promise(r => setTimeout(r, 500));

        const repo = await GitRepository.getInstance(path);
        await expect(repo.setup()).resolves.toBeUndefined();
    });
});
