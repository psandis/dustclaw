import { execSync } from "node:child_process";
import { statfsSync } from "node:fs";
import { platform } from "node:os";

export interface DiskInfo {
	filesystem: string;
	total: number;
	used: number;
	available: number;
	mountpoint: string;
}

export function getDiskInfo(): DiskInfo[] {
	const os = platform();

	if (os === "win32") return getWindowsDiskInfo();

	if (os !== "darwin" && os !== "linux") {
		throw new Error(`Unsupported platform: ${os}`);
	}

	const output = execSync("df -Pk", { encoding: "utf-8" });
	const lines = output.trim().split("\n").slice(1);
	const disks: DiskInfo[] = [];

	for (const line of lines) {
		const parts = line.trim().split(/\s+/);
		if (parts.length < 6) continue;

		const filesystem = parts[0];
		if (filesystem === "devfs" || filesystem === "map") continue;
		if (filesystem.startsWith("/dev/") || filesystem.startsWith("/System/")) {
			disks.push({
				filesystem,
				total: Number.parseInt(parts[1], 10) * 1024,
				used: Number.parseInt(parts[2], 10) * 1024,
				available: Number.parseInt(parts[3], 10) * 1024,
				mountpoint: parts.slice(5).join(" "),
			});
		}
	}

	return disks;
}

// Windows has no df. statfs reads each drive's volume information directly.
// A: and B: are skipped because they are reserved for floppy drives.
function getWindowsDiskInfo(): DiskInfo[] {
	const disks: DiskInfo[] = [];
	for (const letter of "CDEFGHIJKLMNOPQRSTUVWXYZ") {
		const root = `${letter}:\\`;
		try {
			const fs = statfsSync(root);
			disks.push({
				filesystem: `${letter}:`,
				total: fs.blocks * fs.bsize,
				used: (fs.blocks - fs.bfree) * fs.bsize,
				available: fs.bavail * fs.bsize,
				mountpoint: root,
			});
		} catch {}
	}
	return disks;
}

// Same as df's Capacity column. Dividing by total is wrong on APFS, where every
// volume reports the whole shared container as its total.
export function usedRatio(disk: DiskInfo): number {
	const usable = disk.used + disk.available;
	return usable === 0 ? 0 : disk.used / usable;
}
