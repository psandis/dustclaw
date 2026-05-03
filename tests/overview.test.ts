import { afterEach, describe, expect, it, vi } from "vitest";
import { overview } from "../src/commands/overview.js";

afterEach(() => {
	vi.restoreAllMocks();
});

describe("overview", () => {
	it("JSON output has disks and topItems arrays", () => {
		const logs: string[] = [];
		vi.spyOn(console, "log").mockImplementation((...args) => logs.push(args.join(" ")));

		overview({ top: "5", path: ".", json: true });

		const output = JSON.parse(logs.join(""));
		expect(output).toHaveProperty("disks");
		expect(output).toHaveProperty("topItems");
		expect(Array.isArray(output.disks)).toBe(true);
		expect(Array.isArray(output.topItems)).toBe(true);
	});

	it("JSON topItems is capped by --top", () => {
		const logs: string[] = [];
		vi.spyOn(console, "log").mockImplementation((...args) => logs.push(args.join(" ")));

		overview({ top: "3", path: ".", json: true });

		const output = JSON.parse(logs.join(""));
		expect(output.topItems.length).toBeLessThanOrEqual(3);
	});

	it("each disk entry has total, used, and available", () => {
		const logs: string[] = [];
		vi.spyOn(console, "log").mockImplementation((...args) => logs.push(args.join(" ")));

		overview({ top: "5", path: ".", json: true });

		const output = JSON.parse(logs.join(""));
		for (const disk of output.disks) {
			expect(disk).toHaveProperty("total");
			expect(disk).toHaveProperty("used");
			expect(disk).toHaveProperty("available");
		}
	});
});
