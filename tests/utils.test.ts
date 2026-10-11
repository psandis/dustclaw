import { homedir, tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { resolveConfig, resolveTargets } from "../src/utils/config.js";
import { usedRatio } from "../src/utils/disk.js";
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
