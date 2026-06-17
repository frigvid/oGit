import { describe, it, expect, vi, afterEach } from "vitest";
import { logGitError } from "../../../../src/git/utils/gitErrors";

afterEach(() => {
    vi.restoreAllMocks();
});

describe("logGitError", () => {
    it("silently returns for Not a git repository errors", () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        const error = vi.spyOn(console, "error").mockImplementation(() => {});
        logGitError(new Error("Not a git repository: /some/path"), "msg", "/repo");
        expect(warn).not.toHaveBeenCalled();
        expect(error).not.toHaveBeenCalled();
    });

    it("calls console.warn with repo path for No remote branch string", () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        logGitError("No remote branch", "msg", "/repo");
        expect(warn).toHaveBeenCalledWith("No remote branch for repo", "/repo");
    });

    it("logs with Spawned: prefix when error contains a trace: run_command: ssh line", () => {
        const error = vi.spyOn(console, "error").mockImplementation(() => {});
        const err = new Error(
            "git push failed\ntrace: run_command: /usr/bin/ssh -G github.com\nfatal: ..."
        );
        logGitError(err, "Git failed", "/repo");
        expect(error).toHaveBeenCalledOnce();
        const spawnedArg: string = error.mock.calls[0][2];
        expect(spawnedArg).toContain("Spawned: /usr/bin/ssh -G github.com");
    });

    it("logs plain console.error for generic errors without a spawned SSH line", () => {
        const error = vi.spyOn(console, "error").mockImplementation(() => {});
        const err = new Error("some unrelated git error");
        logGitError(err, "Git failed", "/repo");
        expect(error).toHaveBeenCalledWith("Git failed", "/repo", err);
    });
});
