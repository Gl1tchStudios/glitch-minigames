# Changelog

## 2.6.1

- Circuit Breaker: getting hurt mid-hack now ends the game cleanly. Before, the looping hacking soundtrack and trail sound kept playing until the player reconnected, and the scaleform, textures and audio bank stayed loaded. Every exit path, a script error included, now releases them.
- Circuit Breaker stops when the lock watchdog fires or the resource stops, like the other games. Before, its loop kept running and blocking controls after the lock was freed.
- Plasma Drilling: a script error in the controls ends the drill as a fail instead of leaving the camera, prop and shake on. The drill sound is no longer released twice after the watchdog stopped a drill.
- Fleeca Drilling no longer releases a stale drill sound id at the start of the next run.
- Both drills release their scaleform as soon as the run ends.
- Brute Force freezes the player once per game instead of every frame. A finished game no longer unfreezes or releases the screen of a game started right after it. Its screen text goes through `config.Text`, and the word list moved to `config.BruteForcePasswords` with the same defaults.
- Data Crack is rewritten with readable names and one thread per game for input, movement and drawing (it used three). Gameplay, speeds and the `datacrack` result event are unchanged. Its screen text goes through `config.Text`.
- NUI posts carry a game id. A result, close or cancel from a game that already ended is ignored, so it can no longer end the next game with the wrong result.
- Key forwarding checks only held keys for a release, which halves its native calls per frame.
- XP cooldown and hourly cap are counted per character, so a relog resets neither. The cap is a rolling hour instead of a fixed window.
- A perk lookup inside the half-second throttle gets the player's last perks instead of none. The Zero day flag is never repeated from that cache.
- The Zero day request waits up to 15 seconds for the server. Before, a reply after 5 seconds could spend the day's skip and still make the player hack.
- The server prints one line at start when XP is client reported without server sessions. The Zero day log line now only prints with `config.DebugPrints`.
- README: the callback form of `StartPlasmaDrilling` is documented as blocking, the quit key of each scaleform game is listed, and the credits give each upstream licence. New `THIRD_PARTY_NOTICES.md`.
- File headers say Glitch Studios.

## 2.6.0

- The manifest no longer includes `@glitch-poolcleaning/guard/server.lua`, so the resource starts on servers without it. `server/guard.lua` counts this resource's own net events and reports them to glitch-poolcleaning when it is running (`config.NetGuard`). No code from another resource is loaded.
- ox_lib is declared in `dependencies` and loaded through `@ox_lib/init.lua`. The manifest has `name`, `author`, `description`, `version`, `repository` and `escrow_ignore`.
- Perk and Zero day lookups use `lib.callback` instead of request and reply events. They are rate limited per player, and every call into the XP resource is wrapped in `pcall`.
- The Keylogger and Zero day perk keys moved to `config.XP.Perks.Keylogger` and `config.XP.Perks.Skip`.
- Client-reported XP needs a one-time session token from the server. New options: `config.XP.ClientReported`, `config.XP.MinDurations` (per game) and `config.XP.MaxAwardsPerHour` (was hidden, default 20).
- New server export `AwardXP(src, game, won)` for scripts that check the result on their own server side.
- New server exports `OpenXPSession(src, game, seconds)` and `CloseXPSession(src, game)`. With `config.XP.RequireServerSession = true`, a client-reported result only counts for a game the server opened.
- `config.XP.MinDurations` ships with minimum play times for drilling, plasma drilling, Brute Force and Data Crack.
- The XP cooldown and hourly cap are only used up when the XP resource accepted the award. The Zero day lookup is rate limited like the perk lookup.
- A trailing `{ noSkip = true }` table on its own now opts a call out of the Zero day skip. Before, it only worked together with another option and could shift into the next argument.
- Callbacks passed from another resource (function references) work in the callback form of `StartPlasmaDrilling`, the Zero day skip and the per-call options check.
- When the lock watchdog frees a stuck game, it also ends it, so the waiting export returns `false` instead of hanging. NUI games, drills, Brute Force and Data Crack all stop.
- Brute Force: choosing Power Off ends the game as a fail. Before, the export never returned.
- The legacy `datacrack:start` event goes through the `StartDataCrack` export, so the busy lock applies.
- Drilling no longer deletes every object attached to the player when it ends. Only its own drill and jackhammer are removed, and it no longer spawns a second drill prop.
- New `config.Text` for translations, used by notifications, help text, the controls HUD and the game panels.
- The fonts are bundled in `ui/fonts` (SIL OFL) instead of loading from Google Fonts.
- The NUI result callbacks are registered from one table and always pass a real boolean.
- The cancel, control and key-forwarding threads, the Brute Force threads and the mute key watcher now run only while a game is open. With no game running, only the lock watchdog is left.
- Removed the debug logs that printed the Code Crack PIN, the Word Crack word and the Verbal Memory answer, the always-true hacking kit stub in Circuit Breaker and the unused `Scaleforms.LoadAdditionalText`.
- The hourly XP cap counts per character on qbx_core, qb-core and ESX, and per licence without a framework. Expired counters are pruned every 10 minutes.
- Removed the old `firewall-pulse:*`, `backdoor-sequence:*`, `circuit-rhythm:completeGame` and `bruteforce:uiSequenceComplete` events. Nothing on the server listened to them, and the client ones let any script open the NUI. The exports do the same job.
- Brute Force no longer adds an event handler every time it is played.
- Circuit Breaker no longer replaces the global `require` and `package`. Its shared values live in one `CircuitBreaker` table.
- When the resource stops mid-game, drill props are deleted, the player is unfrozen, NUI focus is released and the controls HUD is hidden.
- Model, animation and scaleform loads give up after 5 seconds. Data Crack releases its scaleform and texture dictionaries after a run.
- Key forwarding skips polling while the NUI has keyboard focus, which cuts per-frame native calls in most games.
- Circuit Rhythm notes move on `requestAnimationFrame` with frame time, so note speed no longer depends on frame rate.
- NUI callbacks use `GetParentResourceName()` and the test commands use `GetCurrentResourceName()`, so a renamed folder still works.
- Console output from the games goes through `config.DebugPrints`. New `config.NotifyColour` for glitch-notifications popups.
- Removed the unused 3.5 MB song in `ui/sounds/songs` and the dev harness in `ui/dev`.
- Lua and JS files are plain ASCII. Symbols shown to players are written as escapes, so they look the same.
- README rewritten with install steps, configuration, exports and the ox_lib patch. CHANGELOG added.

## 2.5.0

- Shape Recall, Memory Diff, Traceroute and Carrier Tune games.
- Colour, panel, keycap HUD and sound themes, with per-call overrides.
- Controls HUD on the left through glitch-uiElements or ox_lib text UI.
- Optional XP through glitch-xpSystem, with hacking perks: extra time, extra mistakes, retries, Keylogger and Zero day.
- `OxSkillCheck` export for the ox_lib skill check redirect.
- Shared busy lock and lock watchdog for every export.
- Drilling fixes and the jackhammer animation option.

## 2.2.0

- Keys game.
- Backspace and Escape cancel any running game.
- `/testall` runner for the test commands.
- The success sound no longer plays twice when a game is won.
- `config.DebugPrints` controls the NUI console output.
- Fixed the Memory Colours palette and a Var Hack reveal exploit.
- Games accept input from every keyboard layout.

## 2.1.1

- Idle threads sleep 500 ms.
- Hold Zone has an idle timeout and a progress bar.
- Stale game callbacks are ignored after a reload.

## 2.1.0

- Hold Zone, Number Up, Simon Says, Skill Check and Wire Connect games.
- Arrow key support in Combo Input.
- Bar Hit redesign.
