import { execFileSync } from "child_process";
import { join } from "path";
import { createTempDir } from "./tempRepo";

export interface TestSshKey {
    keyPath: string;
    pubKeyPath: string;
    passphrase: string;
    cleanup: () => void;
}

/**
 * Generates a real ed25519 SSH keypair in a temp directory using ssh-keygen.
 * The returned cleanup function removes the temp directory on call.
 */
export function generateTestSshKey(passphrase = "ogit-test-passphrase"): TestSshKey {
    const { path: tempDir, cleanup } = createTempDir("ogit-sshkey-");
    const keyPath = join(tempDir, "test_id_ed25519");

    execFileSync("ssh-keygen", [
        "-t", "ed25519",
        "-N", passphrase,
        "-f", keyPath,
        "-C", "ogit-test-key",
        "-q",
    ]);

    return {
        keyPath,
        pubKeyPath: keyPath + ".pub",
        passphrase,
        cleanup,
    };
}
