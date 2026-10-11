import { readFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { currentPlatform, resolveConfig, resolveTargets } from "../src/utils/config.js";
import { getDiskInfo, usedRatio } from "../src/utils/disk.js";
import { boxTable, formatSize } from "../src/utils/format.js";
import { parseAge } from "../src/utils/scan.js";

describe("test isolation", () => {
	it("runs with HOME pointed at a temporary folder", () => {
		expect(homedir().startsWith(tmpdir())).toBe(true);
	});
});

describe("bundled data", () => {
	it("loads defaults and targets from the package data folder", () => {
		expect(resolveConfig().scanDepth).toBeGreaterThan(0);
		expect(resolveTargets().length).toBeGreaterThan(0);
	});

	it("covers every skipped cache folder with a macOS target", () => {
		const { cacheSkipList, cachesPath } = resolveConfig();
		const targets: { path: string; platform: string }[] = JSON.parse(
			readFileSync(fileURLToPath(new URL("../data/targets.json", import.meta.url)), "utf-8"),
		).targets;
		const macPaths = targets
			.filter((t) => t.platform === "mac" || t.platform === "all")
			.map((t) => t.path);
		for (const name of cacheSkipList) {
			expect(macPaths, name).toContain(`~/${cachesPath}/${name}`);
		}
	});
});

describe("platform targets", () => {
	const realPlatform = process.platform;

	function withPlatform<T>(value: NodeJS.Platform, fn: () => T): T {
		Object.defineProperty(process, "platform", { value, configurable: true });
		try {
			return fn();
		} finally {
			Object.defineProperty(process, "platform", { value: realPlatform, configurable: true });
		}
	}

	it.each([
		["darwin", "mac"],
		["linux", "linux"],
		["win32", "windows"],
	] as const)("maps %s to %s", (nodePlatform, expected) => {
		expect(withPlatform(nodePlatform, currentPlatform)).toBe(expected);
	});

	it.each(["darwin", "linux", "win32"] as const)("%s gets only its own and shared targets", (p) => {
		const own = withPlatform(p, currentPlatform);
		const targets = withPlatform(p, resolveTargets);
		expect(targets.length).toBeGreaterThan(0);
		for (const t of targets) expect(["all", own]).toContain(t.platform);
	});

	it("gives Windows the AppData cache locations", () => {
		const paths = withPlatform("win32", resolveTargets).map((t) => t.path);
		expect(paths).toContain(join(homedir(), "AppData/Local/npm-cache/_cacache"));
		expect(paths).toContain(join(homedir(), "AppData/Local/pip/Cache"));
		expect(paths).not.toContain(join(homedir(), "Library/Caches/Homebrew"));
	});

	it("has a valid definition for every target", () => {
		const { targets } = JSON.parse(
			readFileSync(fileURLToPath(new URL("../data/targets.json", import.meta.url)), "utf-8"),
		) as { targets: Record<string, unknown>[] };
		for (const t of targets) {
			expect(typeof t.name, JSON.stringify(t)).toBe("string");
			expect(String(t.path).startsWith("~/"), JSON.stringify(t)).toBe(true);
			expect(["mac", "linux", "windows", "all"], JSON.stringify(t)).toContain(t.platform);
			expect(typeof t.safe, JSON.stringify(t)).toBe("boolean");
		}
	});
});

describe("getDiskInfo", () => {
	it("reports at least one disk with consistent sizes on this platform", () => {
		const disks = getDiskInfo();
		expect(disks.length).toBeGreaterThan(0);
		for (const d of disks) {
			expect(d.total).toBeGreaterThan(0);
			expect(d.used).toBeGreaterThanOrEqual(0);
			expect(d.available).toBeGreaterThanOrEqual(0);
			expect(d.used + d.available).toBeLessThanOrEqual(d.total);
		}
	});
});

describe("usedRatio", () => {
	it("divides by used + available, not the shared container total", () => {
		const disk = {
			filesystem: "/dev/disk3s5",
			total: 460,
			used: 360,
			available: 40,
			mountpoint: "/",
		};
		expect(usedRatio(disk)).toBe(0.9);
	});

	it("returns 0 for an empty volume", () => {
		const disk = { filesystem: "/dev/x", total: 0, used: 0, available: 0, mountpoint: "/x" };
		expect(usedRatio(disk)).toBe(0);
	});
});

describe("boxTable", () => {
	it("draws the header separator with side junctions", () => {
		const sep = boxTable(["A", "B"], [["1", "2"]]).split("\n")[2];
		expect(sep).toBe("├───┼───┤");
	});
});

describe("formatSize", () => {
	it("formats bytes across units", () => {
		expect(formatSize(512)).toBe("512 B");
		expect(formatSize(1024)).toBe("1.0 KB");
		expect(formatSize(1024 ** 2)).toBe("1.0 MB");
	});
});

describe("parseAge", () => {
	it("returns a past date for valid day input", () => {
		const result = parseAge("30d");
		expect(result).toBeInstanceOf(Date);
		expect(result.getTime()).toBeLessThan(Date.now());
	});

	it("throws for invalid input", () => {
		expect(() => parseAge("30")).toThrow(/Invalid age format/);
	});
});
