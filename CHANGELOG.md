# Changelog

All notable changes to Glitch Minigames are documented here.  
Follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) conventions and [Semantic Versioning](https://semver.org/).

---

## [2.1.1] – 2026-03-08

### Performance
- All idle Lua threads now sleep `500 ms` between ticks when no minigame is active, instead of running every frame (`Wait(0)`). Affected threads: draw loop, scaleform logic, backspace cancel, movement-control disabler, and key bridge.
- `keyMap` (36-entry control-code → JS keyCode table) moved to module scope. Previously it was allocated as a local inside the key-bridge loop body, causing a new table allocation and GC cycle every active frame.

---

## [2.1.0] – 2026-01-31

### Added
- **Hold Zone** – idle timeout auto-fails the minigame; progress bar now renders during the hold phase.
- **Number Up**, **Simon Says**, **Skill Check**, **Wire Connect** – five new minigames.

### Changed
- **Combo Input** – arrow-key support added; handling logic refactored.
- **Bar Hit** – redesigned HTML structure and styles; improved visual clarity.
- **Wire Connect** – new wire-draw animation on connection.
- **Untangle** – edge-generation algorithm refactored for better node distribution.
- Sound feedback improved across multiple minigames (Bar Hit, Hold Zone, and others).

### Fixed
- Missing `close()` calls in the `forceClose` handler for every minigame — games could previously leave NUI focus locked if force-closed mid-session.

---

## [2.0.0] – 2025-11-12

Initial public release of the v2 rewrite.

