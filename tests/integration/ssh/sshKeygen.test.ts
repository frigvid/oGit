import { describe, it, expect, afterEach } from "vitest";
import { readFileSync } from "fs";
import { generateTestSshKey } from "../../helpers/sshKey";

describe("generateTestSshKey", () => {
    let cleanup: () => void;

    afterEach(() => cleanup?.());

    it("produces a valid ed25519 keypair on disk", () => {
        const key = generateTestSshKey("test-passphrase");
        cleanup = key.cleanup;

        const pub = readFileSync(key.pubKeyPath, "utf8").trim();
        expect(pub).toMatch(/^ssh-ed25519 AAAA/);
    });

    it("public key file path ends with .pub", () => {
        const key = generateTestSshKey("test-passphrase");
        cleanup = key.cleanup;

        expect(key.pubKeyPath).toBe(key.keyPath + ".pub");
    });
});
