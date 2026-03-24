import { resolve } from "node:path";
import chalk from "chalk";
import { boxTable, colorSize } from "../utils/format.js";
import { parseAge, type ScanOptions, scanDir } from "../utils/scan.js";

interface ScanCommandOptions {
	top: string;
	depth: string;
	olderThan?: string;
	filesOnly?: boolean;
	dirsOnly?: boolean;
	json?: boolean;
}

export function scan(path: string | undefined, opts: ScanCommandOptions): void {
	const targetPath = resolve(path ?? ".");
	const count = Number.parseInt(opts.top, 10);

	const scanOpts: ScanOptions = {
		depth: Number.parseInt(opts.depth, 10),
		filesOnly: opts.filesOnly,
		dirsOnly: opts.dirsOnly,
	};

	if (opts.olderThan) {
		scanOpts.olderThan = parseAge(opts.olderThan);
	}

	const entries = scanDir(targetPath, scanOpts);
	const sorted = entries.sort((a, b) => b.size - a.size).slice(0, count);

	if (opts.json) {
		console.log(
			JSON.stringify(
				sorted.map((e) => ({
					path: e.path,
					size: e.size,
					type: e.isDirectory ? "directory" : "file",
					modified: e.mtime.toISOString(),
				})),
				null,
				2,
			),
		);
		return;
	}

	if (sorted.length === 0) {
		console.log(chalk.yellow("\n  No items found.\n"));
		return;
	}

	console.log(chalk.bold(`\n  Scan: ${targetPath}\n`));

	const rows = sorted.map((e, i) => [
		String(i + 1),
		colorSize(e.size),
		e.isDirectory ? "dir" : "file",
		e.path,
	]);
	console.log(boxTable(["#", "Size", "Type", "Path"], rows));
	console.log();
}
