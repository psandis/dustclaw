#!/usr/bin/env node
import { Command } from "commander";
import { overview } from "./commands/overview.js";
import { scan } from "./commands/scan.js";
import { wasteland } from "./commands/wasteland.js";

const program = new Command();

program
	.name("dustclaw")
	.description("Disk space monitoring, analysis, and cleanup CLI")
	.version("0.1.0");

program
	.command("overview", { isDefault: true })
	.description("Quick overview: disk usage, free space, top 10 biggest dirs")
	.option("-n, --top <count>", "Number of top items to show", "10")
	.option("-p, --path <path>", "Path to analyze", ".")
	.option("--json", "Output as JSON")
	.action(overview);

program
	.command("scan [path]")
	.description("Deep scan: ranked list of largest files and folders")
	.option("-n, --top <count>", "Number of top items to show", "20")
	.option("-d, --depth <depth>", "Max directory depth", "3")
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

program.parse();
