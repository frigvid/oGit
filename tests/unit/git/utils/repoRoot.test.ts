import { describe, it, expect, afterEach } from "vitest";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { createTempDir } from "../../../helpers/tempRepo";
import { findGitRepoRoot, readOriginRemoteUrl } from "../../../../src/git/utils/repoRoot";

describe("findGitRepoRoot", () => {
    let cleanup: () => void;

    afterEach(() => cleanup?.());

    it("returns the directory itself when it contains .git", () => {
        const { path, cleanup: c } = createTempDir();
        cleanup = c;
        mkdirSync(join(path, ".git"));
        expect(findGitRepoRoot(path)).toBe(path);
    });

    it("walks up from a nested directory to find the repo root", () => {
        const { path, cleanup: c } = createTempDir();
        cleanup = c;
        mkdirSync(join(path, ".git"));
        const nested = join(path, "a", "b", "c");
        mkdirSync(nested, { recursive: true });
        expect(findGitRepoRoot(nested)).toBe(path);
    });

    it("returns null when no .git directory exists in the hierarchy", () => {
        const { path, cleanup: c } = createTempDir();
        cleanup = c;
        // no .git created
        expect(findGitRepoRoot(path)).toBeNull();
    });
});

describe("readOriginRemoteUrl", () => {
    let cleanup: () => void;

    afterEach(() => cleanup?.());

    function makeRepo(configContent: string): string {
        const { path, cleanup: c } = createTempDir();
        cleanup = c;
        mkdirSync(join(path, ".git"));
        writeFileSync(join(path, ".git", "config"), configContent);
        return path;
    }

    it("returns the origin URL from a standard config", () => {
        const root = makeRepo(
            `[core]\n\trepositoryformatversion = 0\n[remote "origin"]\n\turl = git@github.com:user/repo.git\n\tfetch = +refs/heads/*:refs/remotes/origin/*\n`
        );
        expect(readOriginRemoteUrl(root)).toBe("git@github.com:user/repo.git");
    });

    it("returns the origin URL when multiple remotes are present", () => {
        const root = makeRepo(
            `[remote "upstream"]\n\turl = https://github.com/upstream/repo.git\n[remote "origin"]\n\turl = git@github.com:fork/repo.git\n`
        );
        expect(readOriginRemoteUrl(root)).toBe("git@github.com:fork/repo.git");
    });

    it("returns null when no origin remote is configured", () => {
        const root = makeRepo(`[core]\n\trepositoryformatversion = 0\n`);
        expect(readOriginRemoteUrl(root)).toBeNull();
    });

    it("parses CRLF line endings correctly (Windows git config style)", () => {
        const root = makeRepo(
            `[core]\r\n\trepositoryformatversion = 0\r\n[remote "origin"]\r\n\turl = git@github.com:user/repo.git\r\n`
        );
        expect(readOriginRemoteUrl(root)).toBe("git@github.com:user/repo.git");
    });

    it("returns null for a malformed or empty config file", () => {
        const root = makeRepo("not a valid git config @@@@");
        expect(readOriginRemoteUrl(root)).toBeNull();
    });
});
