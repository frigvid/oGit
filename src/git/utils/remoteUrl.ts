const SSH_HOST_MAP: Record<string, string> = {
    "ssh.github.com": "github.com",
    "altssh.gitlab.com": "gitlab.com",
};

export function resolveWebHostname(sshHost: string): string {
    return SSH_HOST_MAP[sshHost] ?? sshHost;
}

export type ParsedRemote =
    | { kind: "http"; webUrl: string }
    | { kind: "ssh-userhost"; host: string; path: string }
    | { kind: "ssh-alias"; alias: string; path: string }
    | { kind: "ssh-url"; host: string; path: string }
    | { kind: "unknown"; raw: string };

export function parseRemoteUrl(raw: string): ParsedRemote {
    const trimmed = raw.trim();

    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
        return { kind: "http", webUrl: trimmed.replace(/\.git$/, "") };
    }

    if (trimmed.startsWith("ssh://")) {
        const withoutScheme = trimmed.slice("ssh://".length);
        const atIdx = withoutScheme.indexOf("@");
        const afterUserAt = atIdx >= 0 ? withoutScheme.slice(atIdx + 1) : withoutScheme;
        const slashIdx = afterUserAt.indexOf("/");
        if (slashIdx < 0) return { kind: "unknown", raw: trimmed };
        const host = afterUserAt.slice(0, slashIdx).split(":")[0];
        const path = afterUserAt.slice(slashIdx + 1);
        return { kind: "ssh-url", host, path };
    }

    // SSH host:path form — must contain ":" and end with ".git"
    if (trimmed.includes(":") && trimmed.endsWith(".git")) {
        const colonIdx = trimmed.indexOf(":");
        const left = trimmed.slice(0, colonIdx);
        const path = trimmed.slice(colonIdx + 1);
        const atIdx = left.indexOf("@");
        if (atIdx >= 0) {
            return { kind: "ssh-userhost", host: left.slice(atIdx + 1), path };
        }
        return { kind: "ssh-alias", alias: left, path };
    }

    return { kind: "unknown", raw: trimmed };
}
