# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
- Directory sizes followed symlinks, which double-counted linked data and could loop forever on a link to a parent folder. Symlinks are no longer followed, matching `du`.
- An invalid `--older-than` value crashed with a stack trace.
- `-n` with a non-number printed an empty table, and a negative `-d` was silently accepted.
- Table header separator used `┼` at both edges instead of `├` and `┤`.

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

[0.4.0]: https://github.com/psandis/dustclaw/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/psandis/dustclaw/compare/v0.1.2...v0.3.0
[0.1.2]: https://github.com/psandis/dustclaw/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/psandis/dustclaw/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/psandis/dustclaw/releases/tag/v0.1.0
