import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export type Platform = "mac" | "linux" | "windows";

export function currentPlatform(): Platform {
	if (process.platform === "darwin") return "mac";
	if (process.platform === "win32") return "windows";
	return "linux";
}

export interface TargetDef {
	name: string;
	path: string;
	description: string;
	platform: Platform | "all";
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

// Bundled defaults live in <package root>/data. This file runs from either
// src/utils (dev, tests) or dist/utils (build), both two levels below the root.
const DATA_DIR = fileURLToPath(new URL("../../data/", import.meta.url));

function loadDataFile<T>(name: string): T {
	return JSON.parse(readFileSync(join(DATA_DIR, name), "utf-8")) as T;
}

function loadDefaultConfig(): RawConfig {
	return loadDataFile<RawConfig>("config.json");
}

function loadUserConfig(): UserConfig {
	if (!existsSync(USER_CONFIG_PATH)) return {};
	try {
		return JSON.parse(readFileSync(USER_CONFIG_PATH, "utf-8")) as UserConfig;
	} catch {
		return {};
	}
}

// Config is read once per process. The scanners call resolveConfig() for every
// directory they visit, so re-reading the JSON files each time is very slow.
let cachedConfig: DustclawConfig | undefined;
let cachedTargetsFile: TargetsFile | undefined;

export function resolveConfig(): DustclawConfig {
	cachedConfig ??= buildConfig();
	return cachedConfig;
}

function buildConfig(): DustclawConfig {
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
	cachedTargetsFile ??= loadDataFile<TargetsFile>("targets.json");
	return cachedTargetsFile;
}

export function resolveCacheNames(): Record<string, string> {
	return loadTargetsFile().cacheNames;
}

// join, not string replace, so Windows paths get backslashes throughout.
function expandHome(path: string): string {
	if (path === "~") return homedir();
	if (path.startsWith("~/") || path.startsWith("~\\")) return join(homedir(), path.slice(2));
	return path;
}

export function resolveTargets(): TargetDef[] {
	const platform = currentPlatform();
	const base = loadTargetsFile().targets.filter(
		(t) => t.platform === platform || t.platform === "all",
	);
	const user = loadUserConfig();

	const overrides = user.overrides ?? {};
	const merged = base.map((t) => {
		const expanded = { ...t, path: expandHome(t.path) };
		return overrides[t.name] !== undefined
			? { ...expanded, safe: overrides[t.name].safe }
			: expanded;
	});

	const custom: TargetDef[] = (user.targets ?? []).map((t) => ({
		name: t.name,
		path: expandHome(t.path),
		description: t.description ?? "",
		platform: "all" as const,
		safe: t.safe,
	}));

	return [...merged, ...custom];
}
