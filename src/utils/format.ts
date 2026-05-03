import chalk from "chalk";

export function formatSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
	if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
	if (bytes < 1024 ** 4) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
	return `${(bytes / 1024 ** 4).toFixed(1)} TB`;
}

export function colorSize(bytes: number): string {
	const text = formatSize(bytes);
	if (bytes >= 1024 ** 3) return chalk.red(text);
	if (bytes >= 100 * 1024 ** 2) return chalk.yellow(text);
	return chalk.green(text);
}

export function formatPercent(ratio: number): string {
	const pct = ratio * 100;
	const text = `${pct.toFixed(1)}%`;
	if (pct >= 90) return chalk.red(text);
	if (pct >= 70) return chalk.yellow(text);
	return chalk.green(text);
}

function visLen(str: string): number {
	// biome-ignore lint/suspicious/noControlCharactersInRegex: intentional ANSI escape strip
	return str.replace(/\x1B\[[0-9;]*m/g, "").length;
}

function padEndVis(str: string, width: number): string {
	return str + " ".repeat(Math.max(0, width - visLen(str)));
}

export function boxTable(headers: string[], rows: string[][]): string {
	const colWidths = headers.map((h, i) =>
		Math.max(visLen(h), ...rows.map((r) => visLen(r[i] ?? ""))),
	);

	const sep = `┼${colWidths.map((w) => "─".repeat(w + 2)).join("┼")}┼`;
	const top = `┌${colWidths.map((w) => "─".repeat(w + 2)).join("┬")}┐`;
	const bot = `└${colWidths.map((w) => "─".repeat(w + 2)).join("┴")}┘`;

	const fmtRow = (cells: string[]) =>
		`│${cells.map((c, i) => ` ${padEndVis(c, colWidths[i])} `).join("│")}│`;

	const lines = [top, fmtRow(headers), sep, ...rows.map(fmtRow), bot];
	return lines.join("\n");
}
