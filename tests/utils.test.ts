import { describe, expect, it } from "vitest";
import { formatSize } from "../src/utils/format.js";
import { parseAge } from "../src/utils/scan.js";

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
