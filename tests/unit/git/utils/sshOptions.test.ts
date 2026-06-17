import { describe, it, expect } from "vitest";
import { join } from "path";
import {
    buildSshExec,
    buildSshAddExec,
    buildGitSshCommand,
    buildSshArgs,
    type SshSettings,
} from "../../../../src/git/utils/sshOptions";

const base: SshSettings = { sshExec: "", sshOverride: false, sshDir: "" };

describe("buildSshExec", () => {
    it("returns ssh when settings are undefined", () => {
        expect(buildSshExec(undefined)).toBe("ssh");
    });
    it("returns ssh when sshExec is empty", () => {
        expect(buildSshExec({ ...base, sshExec: "" })).toBe("ssh");
    });
    it("returns the configured sshExec path", () => {
        expect(buildSshExec({ ...base, sshExec: "/usr/bin/ssh" })).toBe("/usr/bin/ssh");
    });
});

describe("buildSshAddExec", () => {
    it("returns ssh-add when settings are undefined", () => {
        expect(buildSshAddExec(undefined)).toBe("ssh-add");
    });
    it("returns bare ssh-add when exec is the plain name ssh", () => {
        expect(buildSshAddExec({ ...base, sshExec: "ssh" })).toBe("ssh-add");
    });
    it("derives ssh-add next to ssh for an absolute path", () => {
        const dir = join("/", "usr", "bin");
        expect(buildSshAddExec({ ...base, sshExec: join(dir, "ssh") }))
            .toBe(join(dir, "ssh-add"));
    });
    it("derives ssh-add.exe next to ssh.exe for a .exe path", () => {
        const dir = join("/", "Git", "usr", "bin");
        expect(buildSshAddExec({ ...base, sshExec: join(dir, "ssh.exe") }))
            .toBe(join(dir, "ssh-add.exe"));
    });
});

describe("buildGitSshCommand", () => {
    it("returns ssh -o BatchMode=yes when settings are undefined", () => {
        expect(buildGitSshCommand(undefined)).toBe("ssh -o BatchMode=yes");
    });
    it("includes -F config when sshOverride and sshDir are set", () => {
        const sshDir = join("/", "home", "user", ".ssh");
        const cmd = buildGitSshCommand({ ...base, sshExec: "ssh", sshOverride: true, sshDir });
        const configPath = join(sshDir, "config").replace(/\\/g, "/");
        expect(cmd).toContain(`-F "${configPath}"`);
        expect(cmd).toContain("-o BatchMode=yes");
    });
    it("omits -F when sshOverride is true but sshDir is empty", () => {
        expect(buildGitSshCommand({ ...base, sshOverride: true, sshDir: "" }))
            .not.toContain("-F");
    });
    it("wraps exec in quotes when the path contains spaces", () => {
        const cmd = buildGitSshCommand({ ...base, sshExec: "/path with spaces/ssh" });
        expect(cmd.startsWith('"')).toBe(true);
    });
});

describe("buildSshArgs", () => {
    it("returns [-o, BatchMode=yes] when settings are undefined", () => {
        expect(buildSshArgs(undefined)).toEqual(["-o", "BatchMode=yes"]);
    });
    it("includes -F config when sshOverride and sshDir are set", () => {
        const sshDir = join("/", "home", "user", ".ssh");
        const args = buildSshArgs({ ...base, sshOverride: true, sshDir });
        expect(args[0]).toBe("-F");
        expect(args[1]).toBe(join(sshDir, "config"));
        expect(args).toContain("-o");
        expect(args).toContain("BatchMode=yes");
    });
    it("omits -F when sshOverride is true but sshDir is empty", () => {
        expect(buildSshArgs({ ...base, sshOverride: true, sshDir: "" }))
            .not.toContain("-F");
    });
});
