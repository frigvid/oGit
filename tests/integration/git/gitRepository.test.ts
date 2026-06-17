import { describe, it, expect, afterEach } from "vitest";
import { execFileSync } from "child_process";
import { createTempGitRepo, writeRepoFile } from "../../helpers/tempRepo";
import { GitRepository } from "../../../src/git/gitRepository";

let cleanup: () => void;

afterEach(() => cleanup?.());

describe("GitRepository — commit workflow", () => {
    it("stages all files and commits, producing exactly one commit in the log", async () => {
        const { path, cleanup: c } = await createTempGitRepo();
        cleanup = c;

        writeRepoFile(path, "README.md", "# hello\n");
        const repo = await GitRepository.getInstance(path);
        await repo.stageAll();
        await repo.commit("initial");

        const log = execFileSync("git", ["log", "--oneline"], { cwd: path, encoding: "utf8" });
        expect(log.trim().split("\n")).toHaveLength(1);
    });
});

describe("GitRepository — remote detection", () => {
    it("hasRemote returns false on a freshly initialised repo", async () => {
        const { path, cleanup: c } = await createTempGitRepo();
        cleanup = c;
        const repo = await GitRepository.getInstance(path);
        expect(await repo.hasRemote()).toBe(false);
    });

    it("hasRemote returns true after adding a remote", async () => {
        const { path, git, cleanup: c } = await createTempGitRepo();
        cleanup = c;
        writeRepoFile(path, "README.md", "# hello\n");
        await git.add(".");
        await git.commit("initial");
        await git.addRemote("origin", "git@github.com:fake/fake.git");
        const repo = await GitRepository.getInstance(path);
        expect(await repo.hasRemote()).toBe(true);
    });
});

describe("GitRepository — branch and changed files", () => {
    it("getRemoteBranch returns the current local HEAD branch name", async () => {
        const { path, git, cleanup: c } = await createTempGitRepo();
        cleanup = c;

        writeRepoFile(path, "README.md", "# hello\n");
        await git.add(".");
        await git.commit("initial");

        const repo = await GitRepository.getInstance(path);
        const branch = await repo.getRemoteBranch();
        expect(typeof branch).toBe("string");
        expect(branch.trim().length).toBeGreaterThan(0);
    });

    it("getChangedFiles reflects an unstaged file", async () => {
        const { path, cleanup: c } = await createTempGitRepo();
        cleanup = c;

        writeRepoFile(path, "README.md", "# hello\n");
        const repo = await GitRepository.getInstance(path);
        const files = await repo.getChangedFiles();

        expect(files.some(f => f.path === "README.md")).toBe(true);
    });
});
