import { describe, it, expect } from "vitest";
import { parseRemoteUrl, resolveWebHostname } from "../../../../src/git/utils/remoteUrl";

describe("resolveWebHostname", () => {
    it("maps ssh.github.com to github.com", () => {
        expect(resolveWebHostname("ssh.github.com")).toBe("github.com");
    });
    it("maps altssh.gitlab.com to gitlab.com", () => {
        expect(resolveWebHostname("altssh.gitlab.com")).toBe("gitlab.com");
    });
    it("passes through unmapped hosts unchanged", () => {
        expect(resolveWebHostname("github.com")).toBe("github.com");
        expect(resolveWebHostname("bitbucket.org")).toBe("bitbucket.org");
    });
});

describe("parseRemoteUrl", () => {
    it("parses http remote", () => {
        expect(parseRemoteUrl("http://github.com/user/repo.git"))
            .toEqual({ kind: "http", webUrl: "http://github.com/user/repo" });
    });
    it("parses https remote and strips .git", () => {
        expect(parseRemoteUrl("https://github.com/user/repo.git"))
            .toEqual({ kind: "http", webUrl: "https://github.com/user/repo" });
    });
    it("parses https remote without .git suffix", () => {
        expect(parseRemoteUrl("https://github.com/user/repo"))
            .toEqual({ kind: "http", webUrl: "https://github.com/user/repo" });
    });
    it("parses ssh-userhost remote", () => {
        expect(parseRemoteUrl("git@github.com:user/repo.git"))
            .toEqual({ kind: "ssh-userhost", host: "github.com", path: "user/repo.git" });
    });
    it("parses ssh-alias remote (no @ in left side)", () => {
        expect(parseRemoteUrl("myhost:user/repo.git"))
            .toEqual({ kind: "ssh-alias", alias: "myhost", path: "user/repo.git" });
    });
    it("parses ssh-url remote", () => {
        expect(parseRemoteUrl("ssh://git@github.com/user/repo.git"))
            .toEqual({ kind: "ssh-url", host: "github.com", path: "user/repo.git" });
    });
    it("returns unknown for plain domain without protocol", () => {
        expect(parseRemoteUrl("github.com/user/repo").kind).toBe("unknown");
    });
    it("returns unknown for ssh-url missing slash after host", () => {
        expect(parseRemoteUrl("ssh://git@github.com").kind).toBe("unknown");
    });
    it("returns unknown for colon-form without .git suffix", () => {
        expect(parseRemoteUrl("git@github.com:user/repo").kind).toBe("unknown");
    });
    it("trims surrounding whitespace", () => {
        expect(parseRemoteUrl("  https://github.com/user/repo.git  "))
            .toEqual({ kind: "http", webUrl: "https://github.com/user/repo" });
    });
    it("returns unknown for empty input", () => {
        expect(parseRemoteUrl("").kind).toBe("unknown");
    });
});
