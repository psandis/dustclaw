#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Command } from "commander";
import { clean } from "./commands/clean.js";
import { overview } from "./commands/overview.js";
import { scan } from "./commands/scan.js";
import { wasteland } from "./commands/wasteland.js";
import { resolveConfig } from "./utils/config.js";

const { version } = JSON.parse(
	readFileSync(fileURLToPath(new URL("../package.json", import.meta.url)), "utf-8"),
) as { version: string };
const { overviewTopCount, scanTopCount, scanDepth } = resolveConfig();

const program = new Command();

program
	.name("dustclaw")
	.description("Disk space monitoring, analysis, and cleanup CLI")
	.version(version);

program
	.command("overview", { isDefault: true })
	.description("Quick overview: disk usage, free space, top 10 biggest dirs")
	.option("-n, --top <count>", "Number of top items to show", String(overviewTopCount))
	.option("-p, --path <path>", "Path to analyze", ".")
	.option("--json", "Output as JSON")
	.action(overview);

program
	.command("scan [path]")
	.description("Deep scan: ranked list of largest files and folders")
	.option("-n, --top <count>", "Number of top items to show", String(scanTopCount))
	.option("-d, --depth <depth>", "Max directory depth", String(scanDepth))
	.option("--older-than <age>", "Filter by age (e.g. 30d, 6m, 1y)")
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
