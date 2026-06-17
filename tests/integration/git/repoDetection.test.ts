import { describe, it, expect, afterEach } from "vitest";
import { createTempDir, createNestedDir } from "../../helpers/tempRepo";
import { findGitRepoRoot } from "../../../src/git/utils/repoRoot";
import { GitRepository } from "../../../src/git/gitRepository";
import { mkdirSync } from "fs";
import { join } from "path";

let cleanup: () => void;

afterEach(() => cleanup?.());

describe("GitRepository.isGitRepo", () => {
    it("returns false for a plain directory with no .git", () => {
        const { path, cleanup: c } = createTempDir();
        cleanup = c;
        expect(GitRepository.isGitRepo(path)).toBe(false);
    });

    it("returns true after .git is present", () => {
        const { path, cleanup: c } = createTempDir();
        cleanup = c;
        mkdirSync(join(path, ".git"));
        expect(GitRepository.isGitRepo(path)).toBe(true);
    });
});

describe("findGitRepoRoot with a real git repo", () => {
    it("walks up nested directories to find the repo root", async () => {
        const { path, cleanup: c } = createTempDir();
        cleanup = c;
        mkdirSync(join(path, ".git"));
        const nested = createNestedDir(path, "a", "b", "c");
        expect(findGitRepoRoot(nested)).toBe(path);
    });
});

describe("GitRepository.getInstance", () => {
    it("rejects with Not a git repository for a plain directory", async () => {
        const { path, cleanup: c } = createTempDir();
        cleanup = c;
        await expect(GitRepository.getInstance(path))
            .rejects.toThrow("Not a git repository");
    });
});
