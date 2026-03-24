import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { dirSize, scanDir } from "../src/utils/scan.js";

const tempRoots: string[] = [];

function makeTempDir(): string {
	const root = mkdtempSync(join(tmpdir(), "dustclaw-scan-"));
	tempRoots.push(root);
	return root;
}

afterEach(() => {
	for (const root of tempRoots.splice(0)) {
		rmSync(root, { recursive: true, force: true });
	}
});

describe("dirSize", () => {
	it("sums nested file sizes", () => {
		const root = makeTempDir();
		mkdirSync(join(root, "nested"));
		writeFileSync(join(root, "a.txt"), "1234");
		writeFileSync(join(root, "nested", "b.txt"), "123456");

		expect(dirSize(root)).toBe(10);
	});
});

describe("scanDir", () => {
	it("respects depth when deciding whether to recurse", () => {
		const root = makeTempDir();
		mkdirSync(join(root, "level1"));
		mkdirSync(join(root, "level1", "level2"));
		writeFileSync(join(root, "level1", "level2", "deep.txt"), "12345");

		const shallow = scanDir(root, { depth: 1 });
		expect(shallow.some((entry) => entry.path.endsWith("deep.txt"))).toBe(false);
		expect(shallow.some((entry) => entry.path.endsWith(join("level1", "level2")))).toBe(true);

		const deep = scanDir(root, { depth: 3 });
		expect(deep.some((entry) => entry.path.endsWith("deep.txt"))).toBe(true);
	});

	it("filters files and directories independently", () => {
		const root = makeTempDir();
		mkdirSync(join(root, "folder"));
		writeFileSync(join(root, "file.txt"), "123");
		writeFileSync(join(root, "folder", "inside.txt"), "1234");

		const filesOnly = scanDir(root, { depth: 2, filesOnly: true });
		expect(filesOnly.every((entry) => !entry.isDirectory)).toBe(true);

		const dirsOnly = scanDir(root, { depth: 2, dirsOnly: true });
		expect(dirsOnly.every((entry) => entry.isDirectory)).toBe(true);
		expect(dirsOnly.some((entry) => entry.path.endsWith("folder"))).toBe(false);
	});

	it("filters by modification time", () => {
		const root = makeTempDir();
		const oldFile = join(root, "old.txt");
		const recentFile = join(root, "recent.txt");
		writeFileSync(oldFile, "1");
		writeFileSync(recentFile, "2");

		const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
		utimesSync(oldFile, twoDaysAgo, twoDaysAgo);

		const entries = scanDir(root, {
			depth: 1,
			olderThan: new Date(Date.now() - 24 * 60 * 60 * 1000),
		});

		expect(entries.map((entry) => entry.path)).toContain(oldFile);
		expect(entries.map((entry) => entry.path)).not.toContain(recentFile);
	});
});
