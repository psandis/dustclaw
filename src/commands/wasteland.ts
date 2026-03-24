import { resolve } from "node:path";
import chalk from "chalk";
import { boxTable, colorSize, formatSize } from "../utils/format.js";
import { findNodeModules, findWaste } from "../utils/wasteland.js";

interface WastelandOptions {
	nodeModules?: string;
	json?: boolean;
}

export function wasteland(opts: WastelandOptions): void {
	const waste = findWaste();

	let nmEntries: ReturnType<typeof findNodeModules> = [];
	if (opts.nodeModules) {
		const searchPath = resolve(opts.nodeModules);
		nmEntries = findNodeModules(searchPath);
	}

	const allEntries = [...waste, ...nmEntries];
	const totalSize = allEntries.reduce((sum, e) => sum + e.size, 0);

	if (opts.json) {
		console.log(
			JSON.stringify(
				{
					total: totalSize,
					items: allEntries.map((e) => ({
						name: e.name,
						path: e.path,
						size: e.size,
						description: e.description,
					})),
				},
				null,
				2,
			),
		);
		return;
	}

	if (allEntries.length === 0) {
		console.log(chalk.green("\n  No wasteland found. Your disk is clean!\n"));
		return;
	}

	console.log(chalk.bold("\n  Wasteland Report\n"));

	if (waste.length > 0) {
		console.log(chalk.bold("  Known space wasters:\n"));
		const rows = waste.map((e) => [e.name, colorSize(e.size), e.path]);
		console.log(boxTable(["Name", "Size", "Path"], rows));
	}

	if (nmEntries.length > 0) {
		const nmTotal = nmEntries.reduce((sum, e) => sum + e.size, 0);
		console.log(
			chalk.bold(`\n  node_modules (${nmEntries.length} found, ${formatSize(nmTotal)} total):\n`),
		);
		const nmRows = nmEntries.map((e) => [colorSize(e.size), e.path]);
		console.log(boxTable(["Size", "Path"], nmRows));
	}

	console.log(chalk.bold(`\n  Total reclaimable: ${colorSize(totalSize)}\n`));
}
