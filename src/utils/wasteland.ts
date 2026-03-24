import { execSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { dirSize } from "./scan.js";

export interface WasteEntry {
	name: string;
	path: string;
	size: number;
	description: string;
}

interface WasteTarget {
	name: string;
	path: string | (() => string | null);
	description: string;
}

const home = homedir();

const targets: WasteTarget[] = [
	{
		name: "Xcode DerivedData",
		path: join(home, "Library/Developer/Xcode/DerivedData"),
		description: "Xcode build artifacts",
	},
	{
		name: "Xcode Archives",
		path: join(home, "Library/Developer/Xcode/Archives"),
		description: "Xcode archived builds",
	},
	{
		name: "Xcode Device Support",
		path: join(home, "Library/Developer/Xcode/iOS DeviceSupport"),
		description: "iOS device support files",
	},
	{
		name: "Homebrew Cache",
		path: () => {
			try {
				return execSync("brew --cache", { encoding: "utf-8" }).trim();
			} catch {
				return null;
			}
		},
		description: "Homebrew downloaded packages",
	},
	{
		name: "Gradle Cache",
		path: join(home, ".gradle/caches"),
		description: "Gradle build cache",
	},
	{
		name: "Maven Cache",
		path: join(home, ".m2/repository"),
		description: "Maven dependency cache",
	},
	{
		name: "Cargo Cache",
		path: join(home, ".cargo/registry"),
		description: "Rust crate cache",
	},
	{
		name: "pnpm Store",
		path: join(home, "Library/pnpm/store"),
		description: "pnpm content-addressable store",
	},
	{
		name: "npm Cache",
		path: join(home, ".npm/_cacache"),
		description: "npm download cache",
	},
	{
		name: "Docker Desktop",
		path: join(home, "Library/Containers/com.docker.docker/Data"),
		description: "Docker images, containers, and volumes",
	},
	{
		name: "iOS Simulators",
		path: join(home, "Library/Developer/CoreSimulator/Devices"),
		description: "iOS Simulator device data",
	},
	{
		name: "Android Emulators",
		path: join(home, ".android/avd"),
		description: "Android emulator images",
	},
	{
		name: "Trash",
		path: join(home, ".Trash"),
		description: "Files in Trash",
	},
	{
		name: "System Logs",
		path: join(home, "Library/Logs"),
		description: "Application and system logs",
	},
];

const MIN_CACHE_SIZE = 50 * 1024 * 1024; // 50 MB minimum to show in breakdown

export function findCaches(): WasteEntry[] {
	const cachesDir = join(home, "Library/Caches");
	if (!existsSync(cachesDir)) return [];

	// Paths already covered by specific targets — skip to avoid double-counting
	const skip = new Set(["Homebrew", "CocoaPods", "Yarn"]);

	const results: WasteEntry[] = [];
	let items: string[];
	try {
		items = readdirSync(cachesDir);
	} catch {
		return [];
	}

	for (const name of items) {
		if (skip.has(name)) continue;
		const fullPath = join(cachesDir, name);
		try {
			const stat = statSync(fullPath);
			if (!stat.isDirectory()) continue;
		} catch {
			continue;
		}
		const size = dirSize(fullPath);
		if (size >= MIN_CACHE_SIZE) {
			results.push({
				name: `Cache: ${friendlyName(name)}`,
				path: fullPath,
				size,
				description: `${name} cache`,
			});
		}
	}

	return results.sort((a, b) => b.size - a.size);
}

function friendlyName(dirName: string): string {
	const map: Record<string, string> = {
		"com.spotify.client": "Spotify",
		"com.apple.Safari": "Safari",
		"com.google.Chrome": "Chrome",
		Google: "Google/Chrome",
		"com.docker.docker": "Docker",
		"com.microsoft.VSCode": "VS Code",
		"com.todesktop.230313mzl4w4u92.ShipIt": "Cursor Updates",
		"com.google.antigravity.ShipIt": "Chrome Updates",
		icloudmailagent: "iCloud Mail",
		"com.apple.callintelligenced": "Apple Call Intelligence",
		"ms-playwright": "Playwright Browsers",
		pip: "pip",
		Cypress: "Cypress",
		"node-gyp": "node-gyp",
		typescript: "TypeScript",
		pnpm: "pnpm",
		colima: "Colima",
		"com.openai.codex": "OpenAI Codex",
	};
	return map[dirName] ?? dirName;
}

export function findWaste(): WasteEntry[] {
	const results: WasteEntry[] = [];

	for (const target of targets) {
		const resolvedPath = typeof target.path === "function" ? target.path() : target.path;
		if (!resolvedPath) continue;
		if (!existsSync(resolvedPath)) continue;

		const size = dirSize(resolvedPath);
		if (size > 0) {
			results.push({
				name: target.name,
				path: resolvedPath,
				size,
				description: target.description,
			});
		}
	}

	results.push(...findCaches());

	return results.sort((a, b) => b.size - a.size);
}

export function findNodeModules(root: string, maxDepth = 5): WasteEntry[] {
	const results: WasteEntry[] = [];
	searchNodeModules(root, results, 0, maxDepth);
	return results.sort((a, b) => b.size - a.size);
}

function searchNodeModules(
	dir: string,
	results: WasteEntry[],
	depth: number,
	maxDepth: number,
): void {
	if (depth > maxDepth) return;

	let items: string[];
	try {
		items = readdirSync(dir);
	} catch {
		return;
	}

	for (const name of items) {
		if (name.startsWith(".")) continue;
		const fullPath = join(dir, name);

		if (name === "node_modules") {
			const size = dirSize(fullPath);
			if (size > 0) {
				results.push({
					name: "node_modules",
					path: fullPath,
					size,
					description: `node_modules in ${dir}`,
				});
			}
			continue;
		}

		try {
			const stat = statSync(fullPath);
			if (stat.isDirectory()) {
				searchNodeModules(fullPath, results, depth + 1, maxDepth);
			}
		} catch {}
	}
}
