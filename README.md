# Dustclaw 🦀

[![npm](https://img.shields.io/npm/v/dustclaw?style=flat-square)](https://www.npmjs.com/package/dustclaw)

Find out what is eating your disk space and where the bloat is hiding.

<p align="center">
  <img src="assets/dustclaw.png" alt="Dustclaw" width="400">
</p>

`dustclaw` answers the question every developer asks once a month: where did all my disk space go?

It scans your disk, shows you what is big, and knows where macOS and dev tools hide gigabytes of caches, build artifacts, and forgotten dependencies. Plain table output by default. Use `--json` for scripts and automation.

## Why Dustclaw Exists

There are excellent disk space tools out there: [dust](https://github.com/bootandy/dust) and [dua-cli](https://github.com/Byron/dua-cli) are blazing fast Rust scanners, [duf](https://github.com/muesli/duf) is a beautiful Go replacement for `df`, and [npkill](https://github.com/voidcosmos/npkill) is great for cleaning up `node_modules`.

Dustclaw takes a different angle. It focuses on dev-aware scanning and lives in the npm ecosystem:

- **Dev-aware scanning**: knows about Xcode DerivedData, Docker data, Homebrew caches, Playwright browsers, Gradle, Maven, Cargo, and dozens of other known space wasters
- **Cache breakdown**: shows every application cache individually instead of one mystery lump
- **Safe cleanup**: separates what is safe to delete from what needs manual review, prompts per item
- **npm-installable**: run `npx dustclaw` and you are up

## 10-Second Proof

```bash
npx dustclaw wasteland
```

```
  Wasteland Report

  Known space wasters:

┌─────────────────────────────────────┬──────────┬───────────────────────────────────────────────────────────────────┐
│ Name                                │ Size     │ Path                                                              │
┼─────────────────────────────────────┼──────────┼───────────────────────────────────────────────────────────────────┼
│ Docker Desktop                      │ 50.9 GB  │ /Users/you/Library/Containers/com.docker.docker/Data              │
│ Android Emulators                   │ 7.7 GB   │ /Users/you/.android/avd                                           │
│ Puppeteer Cache                     │ 4.0 GB   │ /Users/you/.cache/puppeteer                                       │
│ Cache: Google/Chrome                │ 4.0 GB   │ /Users/you/Library/Caches/Google                                  │
│ pnpm Store                          │ 2.7 GB   │ /Users/you/Library/pnpm/store                                     │
│ Playwright Browsers                 │ 2.2 GB   │ /Users/you/Library/Caches/ms-playwright                           │
│ Cache: com.microsoft.VSCode.ShipIt  │ 1.7 GB   │ /Users/you/Library/Caches/com.microsoft.VSCode.ShipIt             │
│ Cypress Cache                       │ 1.3 GB   │ /Users/you/Library/Caches/Cypress                                 │
│ Gradle Cache                        │ 2.5 GB   │ /Users/you/.gradle/caches                                         │
│ Maven Cache                         │ 332.6 MB │ /Users/you/.m2/repository                                         │
└─────────────────────────────────────┴──────────┴───────────────────────────────────────────────────────────────────┘

  Total reclaimable: 81.4 GB

  Scan saved. Run dustclaw clean to remove safe items.
```

Then clean what is safe:

```bash
npx dustclaw clean --force
```

```
  Safe to clean:

┌──────────────────────┬────────┬──────────────────────────────────┐
│ Name                 │ Size   │ Path                             │
┼──────────────────────┼────────┼──────────────────────────────────┼
│ Gradle Cache         │ 2.5 GB │ /Users/you/.gradle/caches        │
│ Puppeteer Cache      │ 4.0 GB │ /Users/you/.cache/puppeteer      │
│ Playwright Browsers  │ 2.2 GB │ /Users/you/Library/Caches/ms-... │
└──────────────────────┴────────┴──────────────────────────────────┘

  WARNING: Deletion is permanent. There is no undo.

  Delete Gradle Cache (2.5 GB)? [y/N] y
  Deleted: /Users/you/.gradle/caches

  Freed: 2.5 GB
```

## Commands

| Command | What it does |
|---------|-------------|
| `dustclaw` | Quick overview: disk usage, free space, top 10 biggest items |
| `dustclaw scan [path]` | Deep scan: ranked list of largest files and folders |
| `dustclaw wasteland` | Finds known space wasters: caches, build artifacts, Trash, Docker |
| `dustclaw clean` | Clean safe items from last wasteland scan (dry run by default) |

## Requirements

- Node.js 18+
- macOS or Linux

## Install

```bash
npm install -g dustclaw
```

Or run without installing:

```bash
npx dustclaw
```

## Usage

### Overview (default)

```bash
dustclaw
dustclaw -n 20              # show top 20 instead of 10
dustclaw -p ~/Projects      # scan a specific path
```

### Scan

```bash
dustclaw scan ~/Projects
dustclaw scan -n 30 -d 5          # top 30, depth 5
dustclaw scan --older-than 30d    # only items older than 30 days
dustclaw scan --files-only        # only files, no directories
dustclaw scan --dirs-only         # only directories, no files
```

### Wasteland

Scans known locations where dev tools and macOS pile up gigabytes:

- Xcode DerivedData, archives, device support
- Docker Desktop data
- Homebrew, npm, pnpm, Yarn, Bun caches
- Gradle, Maven, Cargo, Go, pip, Poetry, Composer caches
- Android emulators, iOS simulators
- Playwright, Cypress, Puppeteer browsers
- Terraform, Helm plugin caches
- Ollama and Hugging Face model caches
- Every application cache in `~/Library/Caches`, broken down individually
- Trash and system logs

```bash
dustclaw wasteland
dustclaw wasteland --node-modules ~/Projects    # also find all node_modules
```

### Clean

Reads the last wasteland scan and removes safe items. Dry run by default.

```bash
dustclaw clean                          # preview what would be removed
dustclaw clean --force                  # delete safe items, prompts per item
dustclaw clean --only "gradle cache"    # filter to a specific entry
dustclaw clean --only playwright --force
```

Items marked `safe: false` (Docker, Android Emulators, pnpm Store) are always shown but never auto-deleted. To override, add to `~/.dustclaw.json`:

```json
{
  "overrides": {
    "pnpm Store": { "safe": true }
  }
}
```

## Flags

| Flag | Available on | What it does |
|------|-------------|-------------|
| `--json` | all commands | Output as JSON for scripting |
| `--older-than <age>` | scan | Filter by age: `30d`, `6m`, `1y` |
| `-n, --top <count>` | overview, scan | Number of items to show |
| `-d, --depth <depth>` | scan | Max directory depth |
| `--files-only` | scan | Show only files |
| `--dirs-only` | scan | Show only directories |
| `--node-modules <path>` | wasteland | Also search for node_modules recursively |
| `--force` | clean | Actually delete (prompts per item) |
| `--only <name>` | clean | Filter to entries matching this name |

## Configuration

Dustclaw reads `~/.dustclaw.json` for user overrides. All defaults can be changed:

```json
{
  "minCacheSizeMb": 50,
  "staleThresholdHours": 24,
  "nodeModulesMaxDepth": 5,
  "encoding": "utf-8",
  "scanDepth": 3,
  "overviewTopCount": 10,
  "scanTopCount": 20,
  "overrides": {
    "pnpm Store": { "safe": true }
  },
  "targets": [
    {
      "name": "My Build Cache",
      "path": "~/work/build-cache",
      "safe": true
    }
  ]
}
```

## Storage

Dustclaw writes two things to your home directory:

| Path | What it is |
|------|------------|
| `~/.dustclaw/last-scan.json` | Last wasteland scan result, read by `clean` |
| `~/.dustclaw.json` | Your config overrides (optional, you create this) |

Nothing else is written. To reset state, delete `~/.dustclaw/last-scan.json`.

## Project Structure

```
src/
  commands/
    overview.ts     # disk usage summary and top N items
    scan.ts         # deep recursive scan ranked by size
    wasteland.ts    # known space waster report
    clean.ts        # interactive cleanup from last wasteland scan
  data/
    config.json     # default configuration (minCacheSizeMb, scanDepth, encoding, ...)
    targets.json    # known waste targets and cache display names
  utils/
    config.ts       # loads and merges config.json with ~/.dustclaw.json
    disk.ts         # disk info via df
    format.ts       # table rendering and size formatting
    scan.ts         # recursive directory walker and dirSize
    state.ts        # persists last wasteland scan to ~/.dustclaw/last-scan.json
    wasteland.ts    # finds known waste targets and Library/Caches entries
  index.ts          # CLI entry point
```

All behavior is driven by `src/data/config.json` and `src/data/targets.json`. To add a new waste target or change defaults, edit those files — no code changes needed.

## Standing on the Shoulders of Giants

Dustclaw exists because of the excellent work done by these projects:

- [dust](https://github.com/bootandy/dust): fast, intuitive disk usage viewer written in Rust. If raw scanning speed is what you need, dust is hard to beat.
- [duf](https://github.com/muesli/duf): a modern `df` replacement written in Go. Beautiful output and JSON support.
- [dua-cli](https://github.com/Byron/dua-cli): parallel disk usage analyzer with interactive deletion, written in Rust. Maxes out your SSD.
- [npkill](https://github.com/voidcosmos/npkill): finds and deletes `node_modules` folders. Simple, effective, widely used.
- [space-hogs](https://github.com/dylang/space-hogs): discovers surprisingly large directories from the command line.

These tools do what they do very well. Dustclaw does not try to outperform them on raw speed. Instead, it brings dev-aware scanning and cache breakdown to the npm ecosystem, filling a gap those tools were not built to fill.

## Development

```bash
git clone https://github.com/psandis/dustclaw.git
cd dustclaw
pnpm install
pnpm build
pnpm test
pnpm lint
```

## Roadmap

- **spinner**: progress indicator during slow scans
- **watch**: track disk usage over time, spot trends before you run out of space
- **duplicates**: find duplicate large files by hash

## Related

- 🦀 [Feedclaw](https://github.com/psandis/feedclaw): RSS/Atom feed reader and AI digest CLI
- 🦀 [Driftclaw](https://github.com/psandis/driftclaw): deployment drift detection across environments
- 🦀 [Dietclaw](https://github.com/psandis/dietclaw): codebase health monitor for size, bloat, and dependency weight
- 🦀 [Wirewatch](https://github.com/psandis/wirewatch): network traffic monitoring CLI with AI-assisted anomaly detection
- 🦀 [Mymailclaw](https://github.com/psandis/mymailclaw): email scanner, categorizer, and cleaner CLI
- 🦀 [Asciiclaw](https://github.com/psandis/asciiclaw): convert images to ASCII art in the terminal
- 🦀 [Unasciiclaw](https://github.com/psandis/unasciiclaw): convert ASCII art back to an image
- 🦀 [psclawmcp](https://github.com/psandis/psclawmcp): MCP server exposing all claw tools to AI assistants
- 🦀 [OpenClaw](https://github.com/openclaw/openclaw): personal AI assistant

## License

See [MIT](./LICENSE)
