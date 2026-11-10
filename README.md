<div align="center">

<img src="https://store.glitchstudios.dev/img/b3848e6c055da759.png" alt="Minigames" width="100%">

# glitch-minigames

### 38 minigames for FiveM, one export each.

**Hacking, memory, reflex, lockpicking and drilling games that any script can start with a single export call.**<br>
Every game goes through one wrapper. It runs one game at a time, applies per-call themes, shows a controls HUD and can give XP and hacking perks through an XP resource.

Standalone: it needs only ox_lib and works with Qbox, QBCore, ESX or no framework.

![Version](https://img.shields.io/badge/version-2.6.1-blue)
![FiveM](https://img.shields.io/badge/FiveM-cerulean-F40552)
![Framework](https://img.shields.io/badge/framework-standalone-2d6a4f)
![Lua](https://img.shields.io/badge/Lua-5.4-2C2D72?logo=lua&logoColor=white)
![Database](https://img.shields.io/badge/database-none-lightgrey)
![License](https://img.shields.io/badge/license-GPL--3.0-22c55e)

[Features](#features) &middot; [What you need](#what-you-need) &middot; [Install](#install) &middot; [Configuration](#configuration) &middot; [Exports](#exports) &middot; [How it works](#how-it-works) &middot; [Troubleshooting](#troubleshooting)

</div>

---

Full parameter reference and an in-browser preview of every game: https://minigames.glitchstudios.dev/

## Features

| | |
|---|---|
| **38 games** | Firewall Pulse, Backdoor Sequence, Circuit Rhythm, Surge Override, Var Hack, Memory, Sequence Memory, Verbal Memory, Numbered Sequence, Symbol Search, Pipe Pressure, Pairs, Memory Colours, Untangle, Fingerprint, Code Crack, Word Crack, Balance, Aim Test, Circle Click, Lockpick, Bar Hit, Skill Check, Number Up, Keys, Combo Input, Hold Zone, Wire Connect, Simon Says, Shape Recall, Memory Diff, Traceroute, Carrier Tune, Brute Force, Data Crack, Circuit Breaker, Fleeca Drilling and Plasma Drilling. |
| **One export per game** | Each export blocks until the game ends and returns the result. No UI wiring is needed in your script. |
| **Shared busy lock** | Only one game runs at a time. A second call returns `false` straight away, and `IsBusy()` lets you check first. A watchdog frees the lock if the calling resource stops. |
| **Themes** | Three colour themes, four panel looks, four keycap HUD looks, two sound sets and five lockpick styles. Any call can override them for one game. |
| **Controls HUD** | The keys for the running game are shown on the left, through glitch-uiElements, ox_lib text UI or a built-in fallback. |
| **Cancel and death handling** | Backspace or Escape cancels the panel games (configurable). The scaleform games have their own quit keys, listed in [Quit keys](#quit-keys). A game also ends as a failure when the player dies, and the result goes back to the caller. Circuit Breaker and Fleeca Drilling also fail when the player is hurt. |
| **Optional XP and perks** | With an XP resource running, wins give XP, and skill-tree perks can add time, mistakes, retries, a 1.5x timer on a repeat game and a once-a-day skip. |
| **ox_lib skill check redirect** | With a small ox_lib patch, `lib.skillCheck` uses the Circle Click game, so every script that calls it gets the same look. |
| **Clean stop** | When the resource stops mid-game, drill props are deleted, the player is unfrozen and NUI focus is released. |

## What you need

Required:

- A FiveM server artifact recent enough for `lua54` and `fx_version 'cerulean'`
- ox_lib

Tested with ox_lib 3.40.0 and qbx_core 1.24.0.

Optional. These are other Glitch Studios products or common community resources. They are detected at run time, and the matching feature is skipped when one is not running:

- glitch-xpSystem (or any resource with the same exports, see [XP and perks](#xp-and-perks)): XP for wins and the hacking perks
- glitch-uiElements: the keycap controls HUD and the Zero day prompt. Without it the HUD uses ox_lib text UI.
- glitch-notifications: result and perk popups (`config.usingGlitchNotifications`). Without it perk messages use the GTA feed.
- qbx_core, qb-core or es_extended: the XP hourly cap is counted per character. Without a framework it is counted per licence.
- glitch-poolcleaning: Glitch Studios anticheat. When it is running, `server/guard.lua` reports this resource's net event counts to it through a server-only local event. Nothing from glitch-poolcleaning is loaded into this resource, and without it the file does nothing.

## Install

1. Copy the `glitch-minigames` folder into your `resources` folder. Keep the folder name, because scripts call `exports['glitch-minigames']`.
2. Add `ensure glitch-minigames` to your `server.cfg` after `ox_lib`. If you use glitch-uiElements, glitch-notifications or an XP resource, ensure them before this resource.
3. Edit `shared/config.lua`. The defaults work as they are. Pick your themes and decide how XP is awarded: by default the client reports wins, which a modified client can fake up to the hourly cap. If hacking XP is worth more than perks on your server, set `ClientReported = false` or `RequireServerSession = true` (see [XP and perks](#xp-and-perks)).
4. Optional: apply the ox_lib patch in [ox_lib skill check redirect](#ox_lib-skill-check-redirect).
5. To try the games, set `config.DebugCommands = true`, restart, and run `/testall` or one of the `/test...` commands (`/testlockpick`, `/testdrill`, `/testcircuit` and so on). Set it back to `false` before players join. Anyone can use those commands, and they award XP like a real game.

There is no SQL and no item to add.

## Configuration

Everything is in `shared/config.lua`. It is listed in `escrow_ignore`. The main blocks:

- `config.DebugCommands`: the `/test...` commands. Off by default.
- `config.DebugPrints`: chatty client console output, NUI `console.log` and a server line each time a player uses Zero day. Off by default.
- `config.usingGlitchNotifications`, `config.NotifyColour`: result popups through glitch-notifications and their accent colour.
- `config.NetGuard`: report net event counts to glitch-poolcleaning when that resource is installed.
- `config.CancelKeys`: keys that cancel a running panel game (`'BACKSPACE'`, `'ESCAPE'`, `'ENTER'`). The scaleform games use the keys in [Quit keys](#quit-keys).
- `config.MuteKey`: mutes the full-screen games (`'TAB'`, `'CAPS'` or `'M'`). Each player's choice is remembered on their client.
- `config.Text`: translations. The resource is written in English. Each entry replaces one string, keyed by its exact English text, for example `['Cancel'] = 'Annuler'`. On the Lua side it covers notifications, help text, the controls HUD and the screen text of Brute Force and Data Crack. In the game panels, any element whose whole text matches a key is swapped. Leave it empty for English.
- `config.BruteForcePasswords`: the words Brute Force picks from. Each must be exactly 8 characters.
- `config.XP`: XP amounts, anti-farm limits, perks and the Zero day exclusions (see [XP and perks](#xp-and-perks)).
- `config.ActiveTheme`: colour theme, `'glitch'`, `'cyan'` or `'monochrome'`. The colours of each theme are in `config.Themes`.
- `config.ActiveVisualTheme`: panel look, `'device'`, `'tablet'`, `'modern'` or `'classic'`. `config.BackgroundOpacity` sets the panel opacity per look.
- `config.ActiveKeybindTheme`: keycap HUD look, `'tags'`, `'default'`, `'device'` or `'tablet'`.
- `config.ActiveSoundTheme`: `'gta'` (GTA frontend sounds) or `'classic'` (the mp3s in `ui/sounds`). `config.SoundThemes` maps each sound to a frontend sound.
- `config.LockpickStyle`: `'dial'`, `'arc'`, `'dots'`, `'realistic'` or `'padlock'`.
- `config.KeybindDisplay`, `config.KeybindPosition`, `config.OxTextUIPosition`: where the controls HUD is drawn. `'auto'` uses glitch-uiElements when it runs and ox_lib text UI otherwise.
- `config.CircleClickPosition`: screen position of Circle Click and the redirected ox_lib skill check.

### Per-call options

Any export takes an optional table as its last argument. It changes that one game only:

```lua
exports['glitch-minigames']:StartPairsGame(4, 60000, 0, {
    colour = 'cyan',        -- or a table of colour overrides, e.g. { primary = '#ff3355' }
    theme = 'tablet',       -- panel look
    keybinds = 'device',    -- keycap HUD look
    sounds = 'classic',     -- sound set
    position = 'center',    -- Circle Click position
    xp = false,             -- no XP, perks or retries for this call
    noSkip = true,          -- never offer the Zero day skip for this call
})
```

Pass `{ xp = false }` from jobs and everyday actions that use a game but should not give hacking XP.

### XP and perks

XP is on in the package (`config.XP.Enabled = true`). Nothing happens until a resource named in `config.XP.Resources` is running, so a server without an XP resource can leave it as it is.

`config.XP.Games` sets the XP per win for each export. `FailXP` gives XP for a loss (0 by default). `Category` is the XP category.

XP can be awarded three ways. The safest comes first:

- Server export only (`ClientReported = false`). Your server script checks the result itself and calls `exports['glitch-minigames']:AwardXP(source, 'StartBruteForce', true)`. The amount comes from `config.XP.Games`.
- Server-opened sessions (`RequireServerSession = true`). When a player reaches a real hack, your server script calls `exports['glitch-minigames']:OpenXPSession(source, 'StartBruteForce', 90)`. The client still reports the result, but only a game the server opened can count, so a modified client cannot start one on its own. `CloseXPSession(source, game)` drops a session the server no longer wants.
- Client reported (`ClientReported = true` on its own, the default). When a listed game starts, the client asks the server for a one-time session token and sends the result back with it. The server checks the token, the game name, the minimum play time (`MinDuration`, or a per-game value in `MinDurations`) and a 10 minute maximum. The result itself comes from the client, so a modified client can claim wins up to the `Cooldown` (15 seconds between awards) and `MaxAwardsPerHour` (20 per character, all paths together). That is fine when hacking XP only unlocks hacking perks. If XP buys anything more on your server, use one of the first two. In this mode the server prints one line at start to remind you.

The cooldown and the hourly cap are counted per character, so relogging resets neither. The cap is a rolling hour: it counts the awards of the last 60 minutes. Both are only used up when the XP resource accepted the award.

Games listed in `config.XP.OptIn` (Circle Click by default) give no XP unless the call passes `{ xp = true }`.

Perks are read from the XP resource when a game starts. A game that starts within half a second of the last lookup reuses that player's last perks. The keys are in `config.XP.Perks`:

| Key | Effect |
|---|---|
| `Time` | Seconds added to the game's timer. |
| `Mistakes` | Extra allowed mistakes, attempts or lives. |
| `Retry` | Automatic retries after a lost game. |
| `Keylogger` | A game won in the last 10 minutes runs with 1.5x its time. |
| `Skip` | Zero day: once a day the player can skip a hack. It is offered for `ZeroDaySeconds` before the game starts. |

`ZeroDayNever` lists resources whose games never offer the skip. The package lists the Glitch Studios heists. Names that are not installed are ignored, so replace them with your own heists or leave the list empty.

An XP resource needs these server exports to work with this one: `AddPlayerXP(src, category, amount)`, `GetEffect(src, key)` (a number), `CanUseDaily(src, key)` and `UseDaily(src, key)` (both true or false).

### ox_lib skill check redirect

This step is optional. `lib.skillCheck` keeps the normal ox_lib UI unless you patch ox_lib. To route it to Circle Click, open `ox_lib/resource/interface/client/skillcheck.lua` and add this at the top of `lib.skillCheck`, after `if skillcheck then return end`:

```lua
if GetResourceState('glitch-minigames') == 'started' then
    skillcheck = promise:new()
    local ok, result = pcall(function()
        return exports['glitch-minigames']:OxSkillCheck(difficulty, inputs)
    end)
    skillcheck = nil
    return ok and result == true
end
```

In `lib.cancelSkillCheck`, before the `SendNUIMessage` line, add:

```lua
if GetResourceState('glitch-minigames') == 'started' then
    exports['glitch-minigames']:CancelOxSkillCheck()
end
```

Apply it again after every ox_lib update. The redirect gives no hacking XP.

## Exports

All game exports are client side. Each blocks until the game ends and returns `true` on a win and `false` on a loss or cancel, unless noted. Every argument is optional. The docs site lists the defaults and ranges for each one.

```lua
local ok = exports['glitch-minigames']:StartLockpickGame(3, 30, 2, 40, 500)
if ok then
    -- unlock
end
```

| Export | Arguments |
|---|---|
| `StartFirewallPulse` | requiredHacks, initialSpeed, maxSpeed, timeLimit, safeZoneMinWidth, safeZoneMaxWidth, safeZoneShrinkAmount |
| `StartBackdoorSequence` | requiredSequences, sequenceLength, timeLimit, maxAttempts, timePenalty, minSimultaneousKeys, maxSimultaneousKeys, customKeys, keyHintText |
| `StartCircuitRhythm` | lanes, keys, noteSpeed, noteSpawnRate, requiredNotes, difficulty, maxWrongKeys, maxMissedNotes |
| `StartSurgeOverride` | possibleKeys, requiredPresses, decayRate |
| `StartVarHack` | blocks, speed |
| `StartMemoryGame` | gridSize, squareCount, rounds, showTime, maxWrongPresses |
| `StartSequenceMemoryGame` | gridSize, maxRounds, maxWrongPresses, showTime, delayBetween |
| `StartVerbalMemoryGame` | maxStrikes, wordsToShow, wordDuration (returns a result table) |
| `StartNumberedSequenceGame` | gridSize, sequenceLength, rounds, showTime, guessTime, maxWrongPresses |
| `StartSymbolSearchGame` | gridSize, shiftInterval, timeLimit, minKeyLength, maxKeyLength, symbolType |
| `StartPipePressureGame` | gridSize, timeLimit |
| `StartPairsGame` | gridSize, timeLimit, maxAttempts |
| `StartMemoryColorsGame` | gridSize, memorizeTime, answerTime, rounds |
| `StartUntangleGame` | nodeCount, timeLimit |
| `StartFingerprintGame` | timeLimit, showAlignedCount, showCorrectIndicator |
| `StartCodeCrackGame` | timeLimit, digitCount, maxAttempts |
| `StartWordCrackGame` | timeLimit, wordLength, maxAttempts |
| `StartBalanceGame` | timeLimit, driftSpeed, sensitivity, greenZoneWidth, yellowZoneWidth, driftRandomness, maxDangerTime |
| `StartAimTestGame` | timeLimit, targetsToHit, targetLifetime, targetSize, shrinkTarget, maxMisses, timePenalty |
| `StartCircleClickGame` | rounds, rotationSpeed, targetZoneSize, maxFailures, speedIncrease, randomizeDirection, keys, timeoutRotations |
| `StartLockpickGame` | rounds, sweetSpotSize, maxFailures, shakeRange, lockTime, style |
| `StartBarHitGame` | key, rounds, speed, zoneSize, zoneStart, maxFailures, timeLimit, texts |
| `StartSkillCheckGame` | keys, speed, timeLimit, zoneSize, perfectZoneSize, maxFailures, randomizeZone |
| `StartNumberUpGame` | count, timeLimit, gridCols, maxMistakes |
| `StartKeysGame` | count, timeLimit, gridCols, maxMistakes, letters |
| `StartComboInputGame` | rounds, comboLength, timePerCombo, maxFailures, lengthIncrease |
| `StartHoldZoneGame` | key, rounds, speed, zoneSize, perfectZoneSize, maxFailures, idleTimeout |
| `StartWireConnectGame` | wireCount, timeLimit |
| `StartSimonSaysGame` | rounds, flashSpeed, timeLimit, maxMistakes |
| `StartShapeRecallGame`, `StartMemoryDiffGame`, `StartTracerouteGame`, `StartCarrierTuneGame` | one settings table, e.g. `{ preset = 'hard', rounds = 5 }` |
| `StartBruteForce` | lives |
| `StartDataCrack` | difficulty |
| `StartCircuitBreaker` | levelNumber, difficultyLevel, delayStartMs, minFailureDelayTimeMs, maxFailureDelayTimeMs, disconnectChance, disconnectCheckRateMs, minReconnectTimeMs, maxReconnectTimeMs |
| `runMiniGame`, `runDefaultMiniGameFromDifficulty`, `runDefaultRandom` | older Circuit Breaker entry points, kept for compatibility |
| `StartDrilling` | options table (`{ anim = 'jackhammer' }` for the jackhammer animation, plus the per-call options) |
| `StartPlasmaDrilling` | difficulty, optional callback. The export blocks until the drill ends in both forms. With a callback it returns `nil` and hands the result to the callback, which may come from another resource. |

#### Quit keys

The panel games close on the keys in `config.CancelKeys`. The scaleform games read their own keys, which the controls HUD shows while they run:

| Game | Quit |
|---|---|
| Circuit Breaker | Q (cover) |
| Data Crack | Escape or Backspace (frontend cancel) |
| Fleeca Drilling (`StartDrilling`) | Escape |
| Plasma Drilling | Escape or Backspace |
| Brute Force | No key: choose Power Off on the desktop |

A quit counts as a loss, and the export returns `false`.

Other client exports:

- `IsBusy()` returns true while a game runs.
- `OxSkillCheck(difficulty, inputs)` and `CancelOxSkillCheck()` are used by the ox_lib patch.
- `GetSoundThemes()` returns `{ active, configDefault, themes, sounds, info }` for a sound picker.
- `SetSoundTheme(name)` sets the sound theme on this client (`nil` goes back to `config.ActiveSoundTheme`). It returns false for an unknown theme.
- `PreviewSound(sound, theme)` plays one sound (`'click'`, `'buttonPress'`, `'penalty'`, `'success'` or `'failure'`) in a theme, ignoring the player's mute.

Server exports:

- `AwardXP(src, game, won)` gives the XP set for `game` in `config.XP.Games`, subject to the cooldown and hourly cap. It returns true when XP was given.
- `OpenXPSession(src, game, seconds)` lets the next client-reported result for `game` count within `seconds` (default 120, at most 600). Needed when `RequireServerSession = true`.
- `CloseXPSession(src, game)` drops an opened session.

Client events:

- `TriggerEvent('glitch-minigames:controlsPanel', title, rows)` shows the controls HUD for your own script, for example `{ { keys = { 'Q' }, label = 'Look around' } }`. Pass `nil` as `rows` to hide it. It is ignored while a game runs.
- `glitch-minigames:plasmaDrillComplete` (fired by this resource, with `true` or `false`) when a plasma drill ends.
- `datacrack:start` (arg `difficulty`, `cb`) is kept for older scripts. It runs the `StartDataCrack` export, busy lock included, and passes the result to `cb`.

State bag:

- `LocalPlayer.state.hackTimeBonus` (a number from 0 to 0.5) makes timed games last that share longer while it is set. Set it from the server with `Player(src).state:set('hackTimeBonus', 0.05, true)` for a timed buff such as a consumable.

## How it works

### One wrapper for every game

`client/core/client.lua` loads first and wraps every export the other client files register. Each call takes the busy lock, reads the per-call options, applies perks and buffs, starts the game and releases the lock with the result. If the calling resource stops, or a game runs for more than 10 minutes, the watchdog frees the lock, ends the running game and closes the UI. The waiting export then returns `false`.

### What runs on the server

`server/xp.lua` holds the server logic. It answers the perk and Zero day lookups through `lib.callback`, rate limited per player, and awards XP through the paths above. Session tokens, opened sessions, throttles and cached perks are cleared when a player drops. Award records with nothing in the last hour, and expired opened sessions, are pruned every 10 minutes. `server/guard.lua` only counts net events for glitch-poolcleaning.

### Performance

When no game is running, the only client thread left is the lock watchdog, which wakes every 2 seconds. Each game starts its own per-frame loop (controls, cancel keys, death check) and that loop ends with the game. Key forwarding from the game to the NUI is skipped for games where the NUI already has keyboard focus, and it only checks held keys for a release. Every post from the NUI carries a game id, so a late result from a closed game cannot end the next one. Models, animation dictionaries and scaleforms are requested with a timeout, and models and scaleforms are released after use. The fonts are bundled in `ui/fonts`, so the NUI makes no outside requests.

## Troubleshooting

<details>
<summary><b>An export returns false straight away</b></summary>

<br>

Another game is still running. Check `IsBusy()` before you start one. If a resource stopped mid-game, the watchdog frees the lock within 2 seconds.

</details>

<details>
<summary><b>Players get no XP</b></summary>

<br>

Check that a resource named in `config.XP.Resources` is started, that the game is in `config.XP.Games` with an amount above 0, and that the call did not pass `{ xp = false }`. Opt-in games (`config.XP.OptIn`) need `{ xp = true }`. Wins shorter than `MinDuration` (or the game's entry in `MinDurations`), wins within the 15 second cooldown and anything past 20 awards an hour are not counted. With `RequireServerSession = true`, a client-reported win only counts after your server script called `OpenXPSession` for that game.

</details>

<details>
<summary><b>The server console says XP is client reported</b></summary>

<br>

That line appears once at start when `ClientReported = true` and `RequireServerSession = false`, the package default. It is a reminder, and nothing is wrong. Switch to one of the stricter modes in [XP and perks](#xp-and-perks) if hacking XP buys more than perks on your server.

</details>

<details>
<summary><b>lib.skillCheck still shows the ox_lib UI</b></summary>

<br>

The redirect needs the ox_lib patch above. It is lost every time ox_lib is updated.

</details>

<details>
<summary><b>No keycap HUD appears</b></summary>

<br>

With `config.KeybindDisplay = 'auto'` the HUD comes from glitch-uiElements or ox_lib text UI. Make sure one of them is started before this resource, or set `'standalone'` to always use ox_lib.

</details>

<details>
<summary><b>The panels use the wrong font</b></summary>

<br>

The fonts ship in `ui/fonts` and are listed in `files {}` in the manifest. If you renamed or moved that folder, put it back and restart the resource. Only the Latin character set is bundled, so text in other alphabets falls back to the system fonts.

</details>

<details>
<summary><b>The console says a model, anim dict or scaleform did not load</b></summary>

<br>

The loader gives up after 5 seconds instead of waiting forever. This usually means the client is still streaming assets after joining. Try again after a moment.

</details>

## Credits

Some games are based on other authors' published code. The upstream licence of each is listed here and in `THIRD_PARTY_NOTICES.md`:

- [utkuali](https://github.com/utkuali/datacrack): Data Crack. GPL-3.0, the same licence as this resource.
- [BerkieBb](https://github.com/BerkieBb/CircuitBreakerMinigame_lua) and [TimothyDexter](https://github.com/TimothyDexter/FiveM-CircuitBreakerMinigame): Circuit Breaker. Neither repository has a licence file.
- [TransitNode](https://github.com/TransitNode/Hacking_PC/tree/master): ideas for the hacking PC games. No code is copied from it.
- [MxttDev](https://github.com/MxttDev/M-drilling): Fleeca Drilling. No licence file in the repository.
- [SezayK](https://github.com/SezayK/six_atmrobbery/tree/main): Plasma Drilling. No licence file in the repository.

If you wrote one of these and want the credit or your code handled differently, open an issue and we will sort it out.

ox_lib belongs to its authors. jQuery 3.6.0 is bundled under the MIT licence. The fonts in `ui/fonts` (Figtree, JetBrains Mono, Chakra Petch, VT323, Barlow Condensed, Archivo Black, Share Tech Mono) are bundled under the SIL Open Font License 1.1, see `ui/fonts/OFL.txt`.

## Support

Open an issue on the [GitHub repository](https://github.com/Gl1tchStudios/glitch-minigames) or ask in the [Glitch Studios Discord](https://discord.gg/3DsNKxq2DQ).

## License

GPL-3.0, see `LICENSE`. Copyright Glitch Studios. You can use, change and share it under the GPL. Parts are based on other authors' open source work, so keep the source open and do not sell it as an escrowed build.
