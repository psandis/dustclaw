import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clean } from "../src/commands/clean.js";
import { resolveTargets } from "../src/utils/config.js";
import { saveLastScan, staleThresholdMs } from "../src/utils/state.js";
import { findNodeModules } from "../src/utils/wasteland.js";

const STATE_FILE = join(homedir(), ".dustclaw", "last-scan.json");
const tempRoots: string[] = [];

function makeTempDir(): string {
	const root = mkdtempSync(join(homedir(), ".dustclaw", "test-"));
	tempRoots.push(root);
	return root;
}

beforeEach(() => {
	mkdirSync(join(homedir(), ".dustclaw"), { recursive: true });
});

afterEach(() => {
	vi.restoreAllMocks();
	for (const root of tempRoots.splice(0)) {
		rmSync(root, { recursive: true, force: true });
	}
	if (existsSync(STATE_FILE)) rmSync(STATE_FILE);
});

describe("resolveTargets", () => {
	it("returns only targets matching current platform", () => {
		const targets = resolveTargets();
		const platform = process.platform === "darwin" ? "mac" : "linux";
		const wrong = targets.filter((t) => t.platform !== platform && t.platform !== "all");
		expect(wrong).toHaveLength(0);
	});
});

describe("findNodeModules safe flag", () => {
	it("marks all node_modules entries as safe", () => {
		const root = makeTempDir();
		const nm = join(root, "project", "node_modules");
		mkdirSync(nm, { recursive: true });
		writeFileSync(join(nm, "pkg.js"), Buffer.alloc(5000));

		const results = findNodeModules(root);
		expect(results.every((e) => e.safe === true)).toBe(true);
	});
});

describe("clean", () => {
	it("exits early with message when no scan file exists", async () => {
		const logs: string[] = [];
		vi.spyOn(console, "log").mockImplementation((...args) => logs.push(args.join(" ")));

		await clean({ force: false });

		expect(logs.some((l) => l.includes("Run dustclaw wasteland first"))).toBe(true);
	});

	it("warns when scan is stale", async () => {
		const oldDate = new Date(Date.now() - staleThresholdMs() - 1000).toISOString();
		writeFileSync(STATE_FILE, JSON.stringify({ scannedAt: oldDate, entries: [] }), "utf-8");

		const logs: string[] = [];
		vi.spyOn(console, "log").mockImplementation((...args) => logs.push(args.join(" ")));

		await clean({ force: false });

		expect(logs.some((l) => l.includes("old"))).toBe(true);
	});

	it("dry run does not delete files", async () => {
		const root = makeTempDir();
		const target = join(root, "fake-cache");
		mkdirSync(target);
		writeFileSync(join(target, "data.bin"), Buffer.alloc(5000));

		saveLastScan([
			{ name: "Fake Cache", path: target, size: 5000, description: "test cache", safe: true },
		]);

		const logs: string[] = [];
		vi.spyOn(console, "log").mockImplementation((...args) => logs.push(args.join(" ")));

		await clean({ force: false });

		expect(existsSync(target)).toBe(true);
		expect(logs.some((l) => l.includes("Dry run"))).toBe(true);
	});

	it("separates safe and unsafe entries correctly", async () => {
		saveLastScan([
			{ name: "npm Cache", path: "/fake/npm", size: 1000, description: "npm", safe: true },
			{
				name: "Docker Desktop",
				path: "/fake/docker",
				size: 50000,
				description: "docker",
				safe: false,
			},
		]);

		const logs: string[] = [];
		vi.spyOn(console, "log").mockImplementation((...args) => logs.push(args.join(" ")));

		await clean({ force: false });

		const combined = logs.join("\n");
		expect(combined).toContain("Safe to clean");
		expect(combined).toContain("Manual only");
		expect(combined).toContain("npm Cache");
		expect(combined).toContain("Docker Desktop");
	});
});
