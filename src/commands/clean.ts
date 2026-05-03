import { rmSync } from "node:fs";
import { createInterface } from "node:readline";
import chalk from "chalk";
import { boxTable, colorSize, formatSize } from "../utils/format.js";
import { loadLastScan, scanAgePath, staleThresholdMs } from "../utils/state.js";
import type { WasteEntry } from "../utils/wasteland.js";

interface CleanOptions {
	force?: boolean;
	only?: string;
}

function ask(question: string): Promise<string> {
	const rl = createInterface({ input: process.stdin, output: process.stdout });
	return new Promise((resolve) => {
		rl.question(question, (answer) => {
			rl.close();
			resolve(answer.trim().toLowerCase());
		});
	});
}

function deleteEntry(entry: WasteEntry): void {
	rmSync(entry.path, { recursive: true, force: true });
}

export async function clean(opts: CleanOptions): Promise<void> {
	const state = loadLastScan();

	if (!state) {
		console.log(chalk.yellow("\n  No scan found. Run dustclaw wasteland first.\n"));
		return;
	}

	const ageMs = scanAgePath(state);
	if (ageMs > staleThresholdMs()) {
		const hours = Math.floor(ageMs / (60 * 60 * 1000));
		console.log(
			chalk.yellow(`\n  Scan is ${hours}h old. Run dustclaw wasteland again for fresh results.\n`),
		);
	}

	const filter = opts.only?.toLowerCase();
	const safe = state.entries.filter(
		(e) => e.safe && (!filter || e.name.toLowerCase().includes(filter)),
	);
	const unsafe = state.entries.filter(
		(e) => !e.safe && (!filter || e.name.toLowerCase().includes(filter)),
	);

	if (filter && safe.length === 0 && unsafe.length === 0) {
		console.log(chalk.yellow(`\n  No entries matching "${opts.only}".\n`));
		return;
	}

	if (safe.length === 0 && unsafe.length === 0) {
		console.log(chalk.green("\n  Nothing to clean.\n"));
		return;
	}

	if (safe.length > 0) {
		const safeTotal = safe.reduce((sum, e) => sum + e.size, 0);
		console.log(chalk.bold("\n  Safe to clean:\n"));
		console.log(
			boxTable(
				["Name", "Size", "Path"],
				safe.map((e) => [e.name, colorSize(e.size), e.path]),
			),
		);
		console.log(chalk.bold(`\n  Total: ${colorSize(safeTotal)}\n`));
	} else {
		console.log(chalk.yellow("\n  No safely cleanable items found.\n"));
	}

	if (unsafe.length > 0) {
		console.log(chalk.red.bold("  Manual only (cannot be auto-cleaned):\n"));
		console.log(
			boxTable(
				["Name", "Size", "Path"],
				unsafe.map((e) => [e.name, colorSize(e.size), e.path]),
			),
		);
		console.log(chalk.gray("\n  These contain user data and must be cleaned manually.\n"));
		console.log(chalk.gray("  To include them, set safe: true in ~/.dustclaw.json overrides.\n"));
	}

	if (safe.length === 0) return;

	if (!opts.force) {
		console.log(chalk.yellow("  Dry run. Add --force to actually delete safe items.\n"));
		return;
	}

	console.log(chalk.red.bold("  WARNING: Deletion is permanent. There is no undo.\n"));

	let freed = 0;
	for (const entry of safe) {
		const answer = await ask(
			`  Delete ${chalk.bold(entry.name)} (${formatSize(entry.size)})? [y/N] `,
		);
		if (answer === "y") {
			deleteEntry(entry);
			freed += entry.size;
			console.log(chalk.green(`  Deleted: ${entry.path}`));
		} else {
			console.log(chalk.gray(`  Skipped: ${entry.path}`));
		}
	}

	console.log(chalk.bold(`\n  Freed: ${colorSize(freed)}\n`));
}
