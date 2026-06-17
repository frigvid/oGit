import { join, dirname, basename } from "path";

export interface SshSettings {
    sshOverride: boolean;
    sshDir: string;
    sshExec: string;
}

export function buildSshExec(s?: SshSettings): string {
    return s?.sshExec || "ssh";
}

export function buildSshAddExec(s?: SshSettings): string {
    const exe = buildSshExec(s);
    const base = basename(exe);
    const dir = dirname(exe);
    const addBase = /\.exe$/i.test(base)
        ? base.slice(0, -4) + "-add.exe"
        : base + "-add";
    return dir === "." ? addBase : join(dir, addBase);
}

export function buildGitSshCommand(s?: SshSettings): string {
    const exe = buildSshExec(s);
    const quotedExe = exe.includes(" ") ? `"${exe}"` : exe;
    if (s?.sshOverride && s.sshDir) {
        const configPath = join(s.sshDir, "config").replace(/\\/g, "/");
        return `${quotedExe} -F "${configPath}" -o BatchMode=yes`;
    }
    return `${quotedExe} -o BatchMode=yes`;
}

export function buildSshArgs(s?: SshSettings): string[] {
    if (s?.sshOverride && s.sshDir) {
        return ["-F", join(s.sshDir, "config"), "-o", "BatchMode=yes"];
    }
    return ["-o", "BatchMode=yes"];
}
