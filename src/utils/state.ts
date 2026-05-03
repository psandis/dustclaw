import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { resolveConfig } from "./config.js";
import type { WasteEntry } from "./wasteland.js";

const STATE_DIR = join(homedir(), ".dustclaw");
const SCAN_FILE = join(STATE_DIR, "last-scan.json");

export interface ScanState {
	scannedAt: string;
	entries: WasteEntry[];
}

export function saveLastScan(entries: WasteEntry[]): void {
	const { encoding } = resolveConfig();
	mkdirSync(STATE_DIR, { recursive: true });
	const state: ScanState = {
		scannedAt: new Date().toISOString(),
		entries,
	};
	writeFileSync(SCAN_FILE, JSON.stringify(state, null, 2), encoding);
}

export function loadLastScan(): ScanState | null {
	if (!existsSync(SCAN_FILE)) return null;
	const { encoding } = resolveConfig();
	try {
		return JSON.parse(readFileSync(SCAN_FILE, encoding)) as ScanState;
	} catch {
		return null;
	}
}

export function scanAgePath(state: ScanState): number {
	return Date.now() - new Date(state.scannedAt).getTime();
}

export function staleThresholdMs(): number {
	return resolveConfig().staleThresholdMs;
}
