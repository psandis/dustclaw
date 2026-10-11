import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Tests write and delete ~/.dustclaw/last-scan.json and read ~/.dustclaw.json.
// Point HOME at a throwaway folder so a test run never touches real user data.
export default function setup(): () => void {
	const home = mkdtempSync(join(tmpdir(), "dustclaw-home-"));
	process.env.HOME = home;
	process.env.USERPROFILE = home;
	return () => rmSync(home, { recursive: true, force: true });
}
