import { existsSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { resolveCacheNames, resolveConfig, resolveTargets } from "./config.js";
import { dirSize } from "./scan.js";

export interface WasteEntry {
	name: string;
	path: string;
	size: number;
	description: string;
	safe: boolean;
}

const home = homedir();

function friendlyName(dirName: string, cacheNames: Record<string, string>): string {
	return cacheNames[dirName] ?? dirName;
}

export function findCaches(): WasteEntry[] {
	const { minCacheSize, cachesPath, cacheSkipList } = resolveConfig();
	const cachesDir = join(home, cachesPath);
	if (!existsSync(cachesDir)) return [];

	const skip = new Set(cacheSkipList);
	const cacheNames = resolveCacheNames();

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
		if (size >= minCacheSize) {
			results.push({
				name: `Cache: ${friendlyName(name, cacheNames)}`,
				path: fullPath,
				size,
				description: `${name} application cache`,
				safe: true,
			});
		}
	}

	return results.sort((a, b) => b.size - a.size);
}

export function findWaste(): WasteEntry[] {
	const targets = resolveTargets();
	const results: WasteEntry[] = [];

	for (const target of targets) {
		if (!existsSync(target.path)) continue;
		const size = dirSize(target.path);
		if (size > 0) {
			results.push({
				name: target.name,
				path: target.path,
				size,
				description: target.description,
				safe: target.safe,
			});
		}
	}

	results.push(...findCaches());

	return results.sort((a, b) => b.size - a.size);
}

export function findNodeModules(root: string, maxDepth?: number): WasteEntry[] {
	const depth = maxDepth ?? resolveConfig().nodeModulesMaxDepth;
	const results: WasteEntry[] = [];
	searchNodeModules(root, results, 0, depth);
	return results.sort((a, b) => b.size - a.size);
}

function searchNodeModules(
	dir: string,
	results: WasteEntry[],
	depth: number,
	maxDepth: number,
): void {
	if (depth > maxDepth) return;

	const { opaqueDirectories } = resolveConfig();
	const opaqueSet = new Set(opaqueDirectories);

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
					safe: true,
				});
			}
			continue;
		}

		if (opaqueSet.has(name)) continue;

		try {
			const stat = statSync(fullPath);
			if (stat.isDirectory()) {
				searchNodeModules(fullPath, results, depth + 1, maxDepth);
			}
		} catch {}
	}
}
