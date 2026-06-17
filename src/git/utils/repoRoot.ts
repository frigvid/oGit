import { existsSync, readFileSync } from "fs";
import { join } from "path";

export function findGitRepoRoot(startPath: string): string | null {
	let cur = startPath;
	while (cur && cur.length > 0) {
		if (existsSync(join(cur, ".git"))) return cur;
		const parent = join(cur, "..");
		if (parent === cur) return null;
		cur = parent;
	}
	return null;
}

export function readOriginRemoteUrl(repoRoot: string): string | null {
	try {
		const config = readFileSync(join(repoRoot, ".git", "config"), "utf8");
		const lines = config.split(/\r?\n/);
		let inOrigin = false;
		for (const line of lines) {
			const trimmed = line.trim();
			if (/^\[remote "origin"\]$/i.test(trimmed)) {
				inOrigin = true;
				continue;
			}
			if (inOrigin) {
				if (trimmed.startsWith("[")) break;
				const m = trimmed.match(/^url\s*=\s*(.+)$/i);
				if (m) return m[1].trim();
			}
		}
	} catch { /* ignore */ }
	return null;
}
