import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export interface TargetDef {
	name: string;
	path: string;
	description: string;
	platform: "mac" | "linux" | "all";
	safe: boolean;
}

export interface DustclawConfig {
	minCacheSizeMb: number;
	minCacheSize: number;
	staleThresholdHours: number;
	staleThresholdMs: number;
	nodeModulesMaxDepth: number;
	encoding: BufferEncoding;
	scanDepth: number;
	overviewDepth: number;
	overviewTopCount: number;
	scanTopCount: number;
	blockSize: number;
	cachesPath: string;
	cacheSkipList: string[];
	opaqueDirectories: string[];
}

interface RawConfig {
	minCacheSizeMb: number;
	staleThresholdHours: number;
	nodeModulesMaxDepth: number;
	encoding: BufferEncoding;
	scanDepth: number;
	overviewDepth: number;
	overviewTopCount: number;
	scanTopCount: number;
	blockSize: number;
	cachesPath: string;
	cacheSkipList: string[];
	opaqueDirectories: string[];
}

interface UserTarget {
	name: string;
	path: string;
	description?: string;
	safe: boolean;
}

interface UserConfig {
	minCacheSizeMb?: number;
	staleThresholdHours?: number;
	nodeModulesMaxDepth?: number;
	encoding?: BufferEncoding;
	scanDepth?: number;
	overviewDepth?: number;
	overviewTopCount?: number;
	scanTopCount?: number;
	blockSize?: number;
	cachesPath?: string;
	cacheSkipList?: string[];
	opaqueDirectories?: string[];
	overrides?: Record<string, { safe: boolean }>;
	targets?: UserTarget[];
}

const USER_CONFIG_PATH = join(homedir(), ".dustclaw.json");

function loadDefaultConfig(): RawConfig {
	const file = fileURLToPath(new URL("../data/config.json", import.meta.url));
	return JSON.parse(readFileSync(file, "utf-8")) as RawConfig;
}

function loadUserConfig(): UserConfig {
	if (!existsSync(USER_CONFIG_PATH)) return {};
	try {
		return JSON.parse(readFileSync(USER_CONFIG_PATH, "utf-8")) as UserConfig;
	} catch {
		return {};
	}
}

export function resolveConfig(): DustclawConfig {
	const defaults = loadDefaultConfig();
	const user = loadUserConfig();
	const minCacheSizeMb = user.minCacheSizeMb ?? defaults.minCacheSizeMb;
	const staleThresholdHours = user.staleThresholdHours ?? defaults.staleThresholdHours;
	return {
		minCacheSizeMb,
		minCacheSize: minCacheSizeMb * 1024 * 1024,
		staleThresholdHours,
		staleThresholdMs: staleThresholdHours * 60 * 60 * 1000,
		nodeModulesMaxDepth: user.nodeModulesMaxDepth ?? defaults.nodeModulesMaxDepth,
		encoding: user.encoding ?? defaults.encoding,
		scanDepth: user.scanDepth ?? defaults.scanDepth,
		overviewDepth: user.overviewDepth ?? defaults.overviewDepth,
		overviewTopCount: user.overviewTopCount ?? defaults.overviewTopCount,
		scanTopCount: user.scanTopCount ?? defaults.scanTopCount,
		blockSize: user.blockSize ?? defaults.blockSize,
		cachesPath: user.cachesPath ?? defaults.cachesPath,
		cacheSkipList: user.cacheSkipList ?? defaults.cacheSkipList,
		opaqueDirectories: user.opaqueDirectories ?? defaults.opaqueDirectories,
	};
}

interface TargetsFile {
	targets: TargetDef[];
	cacheNames: Record<string, string>;
}

function loadTargetsFile(): TargetsFile {
	const file = fileURLToPath(new URL("../data/targets.json", import.meta.url));
	return JSON.parse(readFileSync(file, "utf-8")) as TargetsFile;
}

export function resolveCacheNames(): Record<string, string> {
	return loadTargetsFile().cacheNames;
}

export function resolveTargets(): TargetDef[] {
	const platform = process.platform === "darwin" ? "mac" : "linux";
	const base = loadTargetsFile().targets.filter(
		(t) => t.platform === platform || t.platform === "all",
	);
	const user = loadUserConfig();

	const overrides = user.overrides ?? {};
	const merged = base.map((t) => {
		const expanded = { ...t, path: t.path.replace(/^~/, homedir()) };
		return overrides[t.name] !== undefined
			? { ...expanded, safe: overrides[t.name].safe }
			: expanded;
	});

	const custom: TargetDef[] = (user.targets ?? []).map((t) => ({
		name: t.name,
		path: t.path.replace(/^~/, homedir()),
		description: t.description ?? "",
		platform: "all" as const,
		safe: t.safe,
	}));

	return [...merged, ...custom];
}
