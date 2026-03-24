import { resolve } from "node:path";
import chalk from "chalk";
import { getDiskInfo } from "../utils/disk.js";
import { boxTable, colorSize, formatPercent, formatSize } from "../utils/format.js";
import { scanDir } from "../utils/scan.js";

interface OverviewOptions {
	top: string;
	path: string;
	json?: boolean;
}

export function overview(opts: OverviewOptions): void {
	const count = Number.parseInt(opts.top, 10);
	const targetPath = resolve(opts.path);

	const disks = getDiskInfo();
	const entries = scanDir(targetPath, { depth: 1 });
	const topEntries = entries.sort((a, b) => b.size - a.size).slice(0, count);

	if (opts.json) {
		console.log(
			JSON.stringify(
				{
					disks: disks.map((d) => ({
						...d,
						total: d.total,
						used: d.used,
						available: d.available,
					})),
					topItems: topEntries.map((e) => ({
						path: e.path,
						size: e.size,
						type: e.isDirectory ? "directory" : "file",
					})),
				},
				null,
				2,
			),
		);
		return;
	}

	console.log(chalk.bold("\n  Disk Usage\n"));

	const diskRows = disks.map((d) => [
		d.mountpoint,
		formatSize(d.total),
		colorSize(d.used),
		colorSize(d.available),
		formatPercent(d.used / d.total),
	]);
	console.log(boxTable(["Mount", "Total", "Used", "Available", "Use%"], diskRows));

	console.log(chalk.bold(`\n  Top ${count} in ${targetPath}\n`));

	const itemRows = topEntries.map((e, i) => [
		String(i + 1),
		colorSize(e.size),
		e.isDirectory ? "dir" : "file",
		e.path,
	]);
	console.log(boxTable(["#", "Size", "Type", "Path"], itemRows));
	console.log();
}
