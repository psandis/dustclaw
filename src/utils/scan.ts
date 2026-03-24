import { readdirSync, type Stats, statSync } from "node:fs";
import { join } from "node:path";

export interface ScanEntry {
	path: string;
	size: number;
	isDirectory: boolean;
	mtime: Date;
}

export interface ScanOptions {
	depth?: number;
	olderThan?: Date;
	filesOnly?: boolean;
	dirsOnly?: boolean;
}

export function scanDir(root: string, opts: ScanOptions = {}, currentDepth = 0): ScanEntry[] {
	const maxDepth = opts.depth ?? 3;
	const entries: ScanEntry[] = [];

	let items: string[];
	try {
		items = readdirSync(root);
	} catch {
		return entries;
	}

	for (const name of items) {
		if (name.startsWith(".") && currentDepth === 0) continue;

		const fullPath = join(root, name);
		let stat: Stats;
		try {
			stat = statSync(fullPath);
		} catch {
			continue;
		}

		if (stat.isDirectory()) {
			if (name === "node_modules" || name === ".git") {
				const size = dirSize(fullPath);
				if (!opts.filesOnly) {
					if (!opts.olderThan || stat.mtime < opts.olderThan) {
						entries.push({ path: fullPath, size, isDirectory: true, mtime: stat.mtime });
					}
				}
				continue;
			}

			if (currentDepth < maxDepth) {
				const childEntries = scanDir(fullPath, opts, currentDepth + 1);
				entries.push(...childEntries);
			} else {
				const size = dirSize(fullPath);
				if (!opts.filesOnly) {
					if (!opts.olderThan || stat.mtime < opts.olderThan) {
						entries.push({ path: fullPath, size, isDirectory: true, mtime: stat.mtime });
					}
				}
			}
		} else if (stat.isFile()) {
			if (!opts.dirsOnly) {
				if (!opts.olderThan || stat.mtime < opts.olderThan) {
					entries.push({
						path: fullPath,
						size: stat.size,
						isDirectory: false,
						mtime: stat.mtime,
					});
				}
			}
		}
	}

	return entries;
}

export function dirSize(dirPath: string): number {
	let total = 0;
	let items: string[];
	try {
		items = readdirSync(dirPath);
	} catch {
		return 0;
	}
	for (const name of items) {
		const fullPath = join(dirPath, name);
		try {
			const stat = statSync(fullPath);
			if (stat.isFile()) {
				total += stat.size;
			} else if (stat.isDirectory()) {
				total += dirSize(fullPath);
			}
		} catch {}
	}
	return total;
}

export function parseAge(age: string): Date {
	const match = age.match(/^(\d+)(d|m|y)$/);
	if (!match) throw new Error(`Invalid age format: ${age}. Use e.g. 30d, 6m, 1y`);

	const num = Number.parseInt(match[1], 10);
	const unit = match[2];
	const now = new Date();

	switch (unit) {
		case "d":
			now.setDate(now.getDate() - num);
			break;
		case "m":
			now.setMonth(now.getMonth() - num);
			break;
		case "y":
			now.setFullYear(now.getFullYear() - num);
			break;
	}

	return now;
}
