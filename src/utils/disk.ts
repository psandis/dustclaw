import { execSync } from "node:child_process";
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
