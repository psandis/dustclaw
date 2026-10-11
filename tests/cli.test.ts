import { execFileSync } from "node:child_process";
import {
	chmodSync,
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	symlinkSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

// Runs the real CLI entry point the way a user does, so option parsing and
// validation in src/index.ts are covered, not only the functions behind them.
const PROJECT_ROOT = fileURLToPath(new URL("..", import.meta.url));
const ENTRY = join(PROJECT_ROOT, "src", "index.ts");

interface RunResult {
	code: number;
	stdout: string;
	stderr: string;
}

function run(args: string[], opts: { home?: string; input?: string } = {}): RunResult {
	try {
		const stdout = execFileSync(process.execPath, ["--import", "tsx", ENTRY, ...args], {
			cwd: PROJECT_ROOT,
			encoding: "utf-8",
			input: opts.input ?? "",
			stdio: ["pipe", "pipe", "pipe"],
			env: opts.home ? { ...process.env, HOME: opts.home, USERPROFILE: opts.home } : process.env,
		});
		return { code: 0, stdout, stderr: "" };
	} catch (err) {
		const e = err as { status: number; stdout: string; stderr: string };
		return { code: e.status, stdout: e.stdout, stderr: e.stderr };
	}
}

function scanJson(args: string[]): { path: string }[] {
	const result = run(["scan", ...args, "--json"]);
	expect(result.code, result.stderr).toBe(0);
	return JSON.parse(result.stdout);
}

const tempRoots: string[] = [];

function makeTempDir(): string {
	const root = mkdtempSync(join(tmpdir(), "dustclaw-cli-"));
	tempRoots.push(root);
	return root;
}

afterEach(() => {
	for (const root of tempRoots.splice(0)) {
		rmSync(root, { recursive: true, force: true });
	}
});

describe("cli: scan depth", () => {
	it("accepts -d 0 and lists each top-level item with its total size", () => {
		const root = makeTempDir();
		mkdirSync(join(root, "a", "b"), { recursive: true });
		writeFileSync(join(root, "a", "b", "deep.txt"), Buffer.alloc(6000));

		const items = scanJson([root, "-d", "0"]);
		expect(items.map((i) => i.path)).toEqual([join(root, "a")]);
	});

	it("rejects a negative depth", () => {
		const result = run(["scan", ".", "-d", "-1"]);
		expect(result.code).toBe(1);
		expect(result.stderr).toContain("Must be a whole number of 0 or more.");
	});
});

describe("cli: scan lists symlinks", () => {
	it("lists symlinked files and folders", () => {
		const root = makeTempDir();
		writeFileSync(join(root, "real.txt"), Buffer.alloc(5000));
		mkdirSync(join(root, "realdir"));
		writeFileSync(join(root, "realdir", "inside.txt"), Buffer.alloc(5000));
		symlinkSync(join(root, "real.txt"), join(root, "link.txt"));
		symlinkSync(join(root, "realdir"), join(root, "linkdir"));

		const paths = scanJson([root, "-d", "1"]).map((i) => i.path);
		expect(paths).toContain(join(root, "link.txt"));
		expect(paths).toContain(join(root, "linkdir", "inside.txt"));
	});
});

describe("cli: option validation", () => {
	it("rejects -n 0", () => {
		const result = run(["scan", ".", "-n", "0"]);
		expect(result.code).toBe(1);
		expect(result.stderr).toContain("Must be a whole number of 1 or more.");
	});

	it("rejects a non-number -n", () => {
		const result = run(["scan", ".", "-n", "abc"]);
		expect(result.code).toBe(1);
		expect(result.stderr).toContain("Must be a whole number of 1 or more.");
	});

	it("reports an invalid --older-than without a stack trace", () => {
		const result = run(["scan", ".", "--older-than", "30"]);
		expect(result.code).toBe(1);
		expect(result.stderr).toContain("Invalid age format: 30");
		expect(result.stderr).not.toContain("    at ");
	});

	it("shows usage examples after an error", () => {
		const result = run(["--nope"]);
		expect(result.code).toBe(1);
		expect(result.stderr).toContain("unknown option '--nope'");
		expect(result.stderr).toContain("Examples:");
	});
});

interface SavedScan {
	scannedAt: string;
	entries: { name: string; path: string; size: number; description: string; safe: boolean }[];
}

function scanFile(home: string): string {
	return join(home, ".dustclaw", "last-scan.json");
}

function writeScan(home: string, paths: string[], scannedAt = new Date().toISOString()): void {
	mkdirSync(join(home, ".dustclaw"), { recursive: true });
	const entries = paths.map((path, i) => ({
		name: `Fake ${i + 1}`,
		path,
		size: 4096,
		description: "test",
		safe: true,
	}));
	writeFileSync(scanFile(home), JSON.stringify({ scannedAt, entries }));
}

function readScan(home: string): SavedScan {
	return JSON.parse(readFileSync(scanFile(home), "utf-8"));
}

function makeFakeCache(parent: string, name: string): string {
	const dir = join(parent, name);
	mkdirSync(dir, { recursive: true });
	writeFileSync(join(dir, "data.bin"), Buffer.alloc(4096));
	return dir;
}

describe("cli: clean --force", () => {
	it("applies piped answers to every item", () => {
		const home = makeTempDir();
		const a = makeFakeCache(home, "a");
		const b = makeFakeCache(home, "b");
		writeScan(home, [a, b]);

		const result = run(["clean", "--force"], { home, input: "y\ny\n" });
		expect(result.code, result.stderr).toBe(0);
		expect(existsSync(a)).toBe(false);
		expect(existsSync(b)).toBe(false);
		expect(result.stdout).toContain("Freed:");
	});

	it("removes deleted items from the saved scan and keeps the scan time", () => {
		const home = makeTempDir();
		const a = makeFakeCache(home, "a");
		const b = makeFakeCache(home, "b");
		const scannedAt = new Date(Date.now() - 60_000).toISOString();
		writeScan(home, [a, b], scannedAt);

		const result = run(["clean", "--force"], { home, input: "y\nn\n" });
		expect(result.code, result.stderr).toBe(0);
		expect(existsSync(a)).toBe(false);
		expect(existsSync(b)).toBe(true);
		const scan = readScan(home);
		expect(scan.entries.map((e) => e.path)).toEqual([b]);
		expect(scan.scannedAt).toBe(scannedAt);
	});

	it.skipIf(process.platform === "win32" || process.getuid?.() === 0)(
		"reports a failed delete and continues with the next item",
		() => {
			const home = makeTempDir();
			const locked = join(home, "locked");
			const blocked = makeFakeCache(locked, "cache");
			const ok = makeFakeCache(home, "ok");
			writeScan(home, [blocked, ok]);
			chmodSync(locked, 0o500);
			try {
				const result = run(["clean", "--force"], { home, input: "y\ny\n" });
				expect(result.code, result.stderr).toBe(0);
				expect(result.stdout).toContain(`Failed: ${blocked}`);
				expect(existsSync(blocked)).toBe(true);
				expect(existsSync(ok)).toBe(false);
				expect(readScan(home).entries.map((e) => e.path)).toEqual([blocked]);
			} finally {
				chmodSync(locked, 0o700);
			}
		},
	);
});

describe("cli: wasteland saves the scan", () => {
	it("saves the scan with --json", () => {
		const home = makeTempDir();
		const cache = makeFakeCache(join(home, ".npm"), "_cacache");

		const result = run(["wasteland", "--json"], { home });
		expect(result.code, result.stderr).toBe(0);
		expect(readScan(home).entries.map((e) => e.path)).toEqual([cache]);
	});

	it("expands ~/ and ~\\ in custom targets from ~/.dustclaw.json", () => {
		const home = makeTempDir();
		const slash = makeFakeCache(home, join("work", "cache"));
		const backslash = makeFakeCache(home, "work\\other");
		writeFileSync(
			join(home, ".dustclaw.json"),
			JSON.stringify({
				targets: [
					{ name: "Slash", path: "~/work/cache", safe: true },
					{ name: "Backslash", path: "~\\work\\other", safe: true },
				],
			}),
		);

		const result = run(["wasteland", "--json"], { home });
		expect(result.code, result.stderr).toBe(0);
		const paths = JSON.parse(result.stdout).items.map((i: { path: string }) => i.path);
		expect(paths).toContain(slash);
		expect(paths).toContain(backslash);
	});

	it("replaces an older scan when nothing is found", () => {
		const home = makeTempDir();
		writeScan(home, [join(home, "gone")]);

		const result = run(["wasteland"], { home });
		expect(result.code, result.stderr).toBe(0);
		expect(result.stdout).toContain("No wasteland found");
		expect(readScan(home).entries).toEqual([]);
	});
});

describe("cli: overview path", () => {
	it("accepts the path as a positional argument", () => {
		const root = makeTempDir();
		const result = run([root, "-n", "1"]);
		expect(result.code, result.stderr).toBe(0);
		expect(result.stdout).toContain(`Top 1 in ${root}`);
	});

	it("uses the positional path when -p is also given", () => {
		const root = makeTempDir();
		const other = makeTempDir();
		const result = run([root, "-p", other, "-n", "1"]);
		expect(result.code, result.stderr).toBe(0);
		expect(result.stdout).toContain(`Top 1 in ${root}`);
	});
});
