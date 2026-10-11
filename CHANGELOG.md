# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.1] - 2026-10-11

### Added

- Windows support. The disk usage table shows one row per drive, and `wasteland` checks the npm, pnpm, Yarn, pip, Poetry, Go, Composer, Playwright and Cypress caches in `AppData\Local`.
- CI runs lint, build, tests and the built CLI on macOS, Linux and Windows with Node.js 22 and 24.
- Tests that run the real command line, covering option parsing, `clean --force` and `wasteland`.

### Fixed

- `scan -d 0` was rejected in 0.4.0. `-d` accepts 0 or more again, listing each top-level item with its total size.
- Symlinked files and folders were hidden from `scan` and `overview` in 0.4.0. They are listed again. Only folder size totals skip symlinks.
- `clean --force` with piped answers (for example `printf 'y\ny\n' | dustclaw clean --force`) handled only the first item and exited without the total.
- `clean` listed already deleted items again and counted their space twice. Deleted items are now removed from the saved scan, keeping the original scan time.
- `clean` crashed when a delete failed, for example on a permission error. It now reports the failure and continues with the next item.
- `wasteland --json` did not save the scan, so `clean` used an older one.
- `wasteland` with no results kept the previous scan, so `clean` could act on outdated entries.
- Yarn cache on macOS (`~/Library/Caches/Yarn`) was never reported. It was skipped in the cache breakdown, and the only Yarn target pointed at `~/.cache/yarn`.
- Paths starting with `~` were expanded with mixed separators on Windows. `~\` in custom targets is now supported too.

### Documentation

- README covers Windows, `scan -d 0`, using a path together with `-p`, every config key and the Use% calculation.
- README listed `--json` for all commands, but `clean` does not support it.
- README sample output used the old `┼` table borders.

## [0.4.0] - 2026-10-11

### Added

- `dustclaw <path>` accepts the path as a positional argument. `-p, --path` still works.
- Errors print usage examples, and `--help` ends with an examples section.
- `-n, --top`, `-d, --depth` and `--older-than` are validated before any scan starts, with a clear error message.
- `engines` field in `package.json` declaring the Node.js requirement.
- `CHANGELOG.md`.

### Changed

- **Breaking:** requires Node.js 22.12 or newer (was 18). Required by commander 15 and chalk 6.
- Default data files moved from `src/data/` to `data/` at the package root.
- Use% is calculated as used / (used + available), matching `df`. On macOS APFS every volume reports the shared container as its total, so the old used / total figure was far too low.
- The `overview` help text shows the configured top count instead of a fixed 10.
- Dependencies updated: commander 15, chalk 6, TypeScript 7, Vitest 5, Biome 2.5, tsx 4.23, @types/node 26.

### Fixed

- The built CLI crashed on every command because `data/config.json` was missing from `dist/`. Affected 0.3.0.
- `wasteland` could run for 25+ minutes on large cache folders. Config was re-read from disk for every directory visited. It is now read once per run.
- Folder size totals followed symlinks, which double-counted linked data and could loop forever on a link to a parent folder. Totals no longer follow symlinks, matching `du`. Expect smaller and correct `node_modules` sizes for pnpm projects, which link packages inside `node_modules` (for example 405 MB before, 217 MB now, with `du` reporting 207 MB).
- An invalid `--older-than` value crashed with a stack trace.
- `-n` with a non-number printed an empty table, and a negative `-d` was silently accepted.
- Table header separator used `┼` at both edges instead of `├` and `┤`.
- Tests deleted the real `~/.dustclaw/last-scan.json`. Tests now run against a temporary `HOME`.

### Removed

- Unused `better-sqlite3` dependency and its types. dustclaw stores all state in JSON files.

## [0.3.0] - 2026-05-03

### Added

- `clean` command: removes safe items from the last `wasteland` scan. Dry run by default, `--force` deletes with a prompt per item.
- Config-driven defaults and waste targets in `config.json` and `targets.json`.
- User overrides in `~/.dustclaw.json`.
- Last scan saved to `~/.dustclaw/last-scan.json`.
- Storage section in the README.

## [0.1.2] - 2026-03-25

### Changed

- Normalized the repository URL in `package.json`.

## [0.1.1] - 2026-03-25

### Added

- Repository metadata in `package.json` and npm badge in the README.

## [0.1.0] - 2026-03-24

### Added

- Initial release with `overview`, `scan` and `wasteland` commands.

[0.4.1]: https://github.com/psandis/dustclaw/compare/efba29c...main
[0.4.0]: https://github.com/psandis/dustclaw/compare/1413b94...efba29c
[0.3.0]: https://github.com/psandis/dustclaw/compare/v0.1.2...1413b94
[0.1.2]: https://github.com/psandis/dustclaw/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/psandis/dustclaw/compare/91ed69c...v0.1.1
[0.1.0]: https://github.com/psandis/dustclaw/tree/91ed69c
