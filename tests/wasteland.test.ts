import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { findNodeModules } from "../src/utils/wasteland.js";

const tempRoots: string[] = [];

function makeTempDir(): string {
	const root = mkdtempSync(join(tmpdir(), "dustclaw-wasteland-"));
	tempRoots.push(root);
	return root;
}

afterEach(() => {
	for (const root of tempRoots.splice(0)) {
		rmSync(root, { recursive: true, force: true });
	}
});

describe("findNodeModules", () => {
	it("finds node_modules directories and sorts by size descending", () => {
		const root = makeTempDir();
		const appA = join(root, "app-a");
		const appB = join(root, "app-b");
		const modulesA = join(appA, "node_modules");
		const modulesB = join(appB, "node_modules");

		mkdirSync(modulesA, { recursive: true });
		mkdirSync(modulesB, { recursive: true });
		writeFileSync(join(modulesA, "small.js"), "123");
		writeFileSync(join(modulesB, "big.js"), "123456");

		const results = findNodeModules(root);

		expect(results).toHaveLength(2);
		expect(results[0]?.path).toBe(modulesB);
		expect(results[1]?.path).toBe(modulesA);
		expect(results.every((entry) => entry.name === "node_modules")).toBe(true);
	});

	it("respects maximum search depth", () => {
		const root = makeTempDir();
		const deepModules = join(root, "a", "b", "c", "d", "e", "f", "node_modules");

		mkdirSync(deepModules, { recursive: true });
		writeFileSync(join(deepModules, "pkg.json"), "{}");

		expect(findNodeModules(root, 5)).toHaveLength(0);
		expect(findNodeModules(root, 6)).toHaveLength(1);
	});
});
