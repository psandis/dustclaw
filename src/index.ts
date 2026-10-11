#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Command, InvalidArgumentError } from "commander";
import { clean } from "./commands/clean.js";
import { overview } from "./commands/overview.js";
import { scan } from "./commands/scan.js";
import { wasteland } from "./commands/wasteland.js";
import { resolveConfig } from "./utils/config.js";
import { parseAge } from "./utils/scan.js";

function positiveIntOption(value: string): number {
	const n = Number(value);
	if (!Number.isInteger(n) || n < 1) {
		throw new InvalidArgumentError("Must be a whole number of 1 or more.");
	}
	return n;
}

function ageOption(value: string): Date {
	try {
		return parseAge(value);
	} catch (err) {
		throw new InvalidArgumentError((err as Error).message);
	}
}

const { version } = JSON.parse(
	readFileSync(fileURLToPath(new URL("../package.json", import.meta.url)), "utf-8"),
) as { version: string };
const { overviewTopCount, scanTopCount, scanDepth } = resolveConfig();

const program = new Command();

program
	.name("dustclaw")
	.description("Disk space monitoring, analysis, and cleanup CLI")
	.version(version)
	.showHelpAfterError(`
Examples:
  dustclaw ../..                  overview of a path
  dustclaw scan ~/Projects -n 20  top 20 largest items in a path
  dustclaw wasteland              find caches and build junk
  dustclaw clean                  dry run cleanup

Run dustclaw <command> --help for all options.`)
	.addHelpText(
		"after",
		`
Examples:
  dustclaw                        overview of the current directory
  dustclaw ../..                  overview of a path
  dustclaw scan ~/Projects -n 20  top 20 largest items in a path
  dustclaw scan --older-than 6m   items not modified in 6 months
  dustclaw wasteland              find caches and build junk
  dustclaw clean                  dry run cleanup
  dustclaw clean --force          delete safe items, prompts per item`,
	);

program
	.command("overview [path]", { isDefault: true })
	.description(`Quick overview: disk usage, free space, top ${overviewTopCount} biggest items`)
	.option("-n, --top <count>", "Number of top items to show", positiveIntOption, overviewTopCount)
	.option("-p, --path <path>", "Path to analyze (same as the positional path)", ".")
	.option("--json", "Output as JSON")
	.action((path: string | undefined, opts) => overview({ ...opts, path: path ?? opts.path }));

program
	.command("scan [path]")
	.description("Deep scan: ranked list of largest files and folders")
	.option("-n, --top <count>", "Number of top items to show", positiveIntOption, scanTopCount)
	.option("-d, --depth <depth>", "Max directory depth", positiveIntOption, scanDepth)
	.option("--older-than <age>", "Filter by age (e.g. 30d, 6m, 1y)", ageOption)
	.option("--files-only", "Show only files, not directories")
	.option("--dirs-only", "Show only directories, not files")
	.option("--json", "Output as JSON")
	.action(scan);

program
	.command("wasteland")
	.description("Find known dev/OS space wasters (caches, build artifacts, Trash)")
	.option("--node-modules <path>", "Also search for node_modules under this path")
	.option("--json", "Output as JSON")
	.action(wasteland);

program
	.command("clean")
	.description("Clean safe space wasters (dry run by default, use --force to delete)")
	.option("--only <name>", "Filter to entries matching this name (case-insensitive)")
	.option("--force", "Actually delete (irreversible, prompts per item)")
	.action(clean);

program.parse();
