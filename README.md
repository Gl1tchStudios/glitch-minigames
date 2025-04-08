# Glitch Minigames

Welcome to the official repository for **Glitch Minigames**! This is a collection of unique and engaging minigames designed for FiveM servers. Each minigame can be easily triggered through simple exports, making integration seamless and straightforward.

## Features
- **Unique Gameplay**: Every minigame offers a distinct experience.
- **Easy Integration**: Trigger minigames with simple exports.
- **Optimized for FiveM**: Designed to run smoothly on any FiveM server.
- **Fully Customizable**: Adjust difficulty parameters to suit your server's needs.
- **Audio Feedback**: Includes sound effects for interactions, success, and failure.

## Minigames List

### 1. **Firewall Pulse**
- **Description**: A timing-based hacking minigame where players must stop a moving pulse inside a safe zone. As players succeed, the safe zone shrinks and the pulse speeds up, increasing difficulty.
- **Export**: `exports['glitch-minigames']:StartFirewallPulse(requiredHacks, initialSpeed, maxSpeed, timeLimit, safeZoneMinWidth, safeZoneMaxWidth, safeZoneShrinkAmount)`

#### Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| requiredHacks | 3 | Number of successful hacks needed to complete the minigame |
| initialSpeed | 2 | Starting speed of the pulse |
| maxSpeed | 10 | Maximum speed the pulse can reach |
| timeLimit | 10 | Time limit in seconds for each hack attempt |
| safeZoneMinWidth | 40 | Minimum width of the safe zone (in pixels) |
| safeZoneMaxWidth | 120 | Starting width of the safe zone (in pixels) |
| safeZoneShrinkAmount | 10 | How much the safe zone shrinks after each successful hack |

#### Usage Examples

```lua
-- Basic usage with default settings
local success = exports['glitch-minigames']:StartFirewallPulse(function(success)
    if success then
        print("You completed the hack!")
    else
        print("You failed the hack")
    end
end)

-- Advanced usage with custom parameters
local success = exports['glitch-minigames']:StartFirewallPulse(3, 2, 10, 8, 30, 120, 40)
if success then
    print("Firewall hack successful!")
else
    print("Firewall hack failed!")
end
```
![Firewall Pulse Minigame](https://github.com/user-attachments/assets/55484201-4d3b-4e40-8909-5c267ff194b3)
 
### 2. **Backdoor Sequence**
- **Description**: A memory/reflex minigame where players must input a sequence of keys shown on screen. Each stage can require multiple simultaneous key presses for increased difficulty. Requires precise keyboard inputs.
- **Export**: `exports['glitch-minigames']:StartBackdoorSequence(requiredSequences, sequenceLength, timeLimit, maxAttempts, timePenalty, minSimultaneousKeys, maxSimultaneousKeys, customKeys, keyHintText)`

#### Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| requiredSequences | 3 | Number of successful sequences needed to complete the minigame |
| sequenceLength | 5 | Total number of keys in the sequence |
| timeLimit | 15 | Time limit in seconds for each sequence attempt |
| maxAttempts | 3 | Maximum number of input mistakes allowed per sequence |
| timePenalty | 1.0 | Time deducted (in seconds) when a wrong key is pressed |
| minSimultaneousKeys | 1 | Minimum number of keys shown at once for each stage |
| maxSimultaneousKeys | 3 | Maximum number of keys shown at once for each stage |
| customKeys | W,A,S,D,arrows,0-9 | Array of keys to use in sequences (e.g., {'W','A','S','D'}) |
| keyHintText | "W, A, S, D, ←, →, ↑, ↓, 0-9" | Text displayed to hint available keys |

#### Usage Examples with Simultaneous Keys

```lua
-- Using multiple simultaneous keys for more challenging sequences
local success = exports['glitch-minigames']:StartBackdoorSequence(3, 20, 20, 3, 2.0, 3, 6, {'W', 'A', 'S', 'D'}, 'W, A, S, D only')
if success then
    print("Sequence hack successful!")
else
    print("Sequence hack failed!")
end
```

![Backdoor Sequence Minigame](https://cdn.discordapp.com/attachments/908525459640299560/1354780300567248938/image.png?ex=67e8833a&is=67e731ba&hm=81e097c370bc450dd11f2158d8784ca1f51f169f1bd18730d6dc6cf6fba5d617&)

### 3. **Circuit Rhythm**
- **Description**: A rhythm-based minigame where players must press keys in time with notes falling down lanes. Players earn points and build combos for accurate timing. Features multiple difficulty levels and customizable parameters.
- **Export**: `exports['glitch-minigames']:StartCircuitRhythm(lanes, keys, noteSpeed, noteSpawnRate, requiredNotes, difficulty, maxWrongKeys, maxMissedNotes)`

#### Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| lanes | 4 | Number of lanes for notes to fall down |
| keys | ['A','S','D','F'] | Array of keys to use for each lane (must match number of lanes) |
| noteSpeed | 150 | Speed at which notes fall (higher = faster) |
| noteSpawnRate | 1000 | Milliseconds between note spawns (lower = more frequent) |
| requiredNotes | 20 | Number of notes player must hit to complete the minigame |
| difficulty | "normal" | Difficulty level: "easy", "normal", or "hard" (affects timing windows) |
| maxWrongKeys | 5 | Maximum wrong key presses allowed before failure |
| maxMissedNotes | 3 | Maximum notes that can be missed before failure |

#### Usage Examples

```lua
-- Basic usage with default settings
local success = exports['glitch-minigames']:StartCircuitRhythm(function(success, score, maxCombo)
    if success then
        print("Rhythm game completed! Score: " .. score .. ", Max combo: " .. maxCombo)
    else
        print("Rhythm game failed")
    end
end)

-- Advanced usage with custom parameters
local success = exports['glitch-minigames']:StartCircuitRhythm(4, {'A','S','D','F'}, 150, 800, 15, "normal", 5, 3)
if success then
    print("Rhythm game completed! Score: " .. success.score .. ", Max Combo: " .. success.maxCombo)
else
    print("Rhythm game failed!")
end
```
![Circuit Rhythm Minigame](https://github.com/user-attachments/assets/696e6a25-79b8-4cc9-abcd-8786d3ea496a)

### 4. **Surge Override**
- **Description**: A rapid key-mashing minigame where players must repeatedly press the displayed key(s) to fill a circular progress bar. The progress gradually depletes when not pressing keys, adding pressure to maintain consistent input. Can be configured for single keys or multiple simultaneous key combinations.
- **Export**: `exports['glitch-minigames']:StartSurgeOverride(possibleKeys, requiredPresses, decayRate, multiKeyMode, keyCombinations)`

#### Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| possibleKeys | ['E'] | Array of possible keys for the game to randomly select from (single-key mode) |
| requiredPresses | 50 | Number of key presses needed to complete the minigame |
| decayRate | 2 | How quickly the progress bar depletes when not pressing keys (higher = faster) |
| multiKeyMode | false | Enable multiple simultaneous key press mode |
| keyCombinations | [['E','F'],['SPACE','B']] | Array of key combinations for multi-key mode |

#### Usage Examples

```lua
-- Basic usage with default settings (E key)
local success = exports['glitch-minigames']:StartSurgeOverride(function(success)
    if success then
        print("Surge Override successful!")
    else
        print("Surge Override failed")
    end
end)


-- Choose random key mode example
local success = exports['glitch-minigames']:StartSurgeOverride({'E', 'F'}, 30, 2)
if success then
    print("Surge Override successful!")
else
    print("Surge Override failed!")
end
```
![Surge Override Minigame](https://github.com/user-attachments/assets/9a4208d5-7a3e-4239-b02a-7239e805e305)

### 5. **Circuit Breaker**
- **Description**: A precision-based hacking minigame where players must guide a cursor through a circuit board maze. Features dynamic difficulty with reconnection mechanics and time pressure.
- **Export**: `exports['glitch-minigames']:StartCircuitBreaker(levelNumber, difficultyLevel, cursorSpeed, delayStart, minDelay, maxDelay, disconnectChance)`

#### Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| levelNumber | 1 | Circuit board layout (1-6) |
| difficultyLevel | 0 | Difficulty level (0-3) affects cursor speed and disconnect chance |
| cursorSpeed | 0.0085 | Speed of cursor movement (0.0085-0.01) |
| delayStart | 1000 | Delay before minigame starts (ms) |
| minDelay | 2000 | Minimum delay for failure screen (ms) |
| maxDelay | 4000 | Maximum delay for failure screen (ms) |
| disconnectChance | 0.1 | Chance of random disconnects (0-1) |

#### Usage Example

```lua
local success = exports['glitch-minigames']:StartCircuitBreaker(2, 1, 0.009, 1500, 2000, 5000, 0.15)
if success then
    print("Circuit successfully breached!")
else
    print("Circuit breach failed!")
end
```
![Circuit Breaker Minigame](https://github.com/user-attachments/assets/957d0153-b453-49c2-a44d-5db8ff2e1226)

### 6. **Data Crack**
- **Description**: A timing-based hacking minigame where players must stop moving bars when they align with the target zone. Features increasing difficulty with each successful alignment.
- **Export**: `exports['glitch-minigames']:StartDataCrack(difficulty)`

#### Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| difficulty | 3 | Difficulty level (1-5) affects movement speed |

#### Usage Example

```lua
local success = exports['glitch-minigames']:StartDataCrack(3)
if success then
    print("Data successfully cracked!")
else
    print("Failed to crack data!")
end
```
![Data Crack Minigame](https://github.com/user-attachments/assets/9295f90b-fa16-40e1-b5d5-d3e94878e0f4)

### 7. **Brute Force**
- **Description**: A password cracking minigame where players must solve letter combinations with limited attempts. Features visual and audio feedback for correct/incorrect guesses.
- **Export**: `exports['glitch-minigames']:StartHackConnect(numLives)`

#### Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| numLives | 5 | Number of attempts allowed before failure (1-10) |

#### Usage Examples

```lua
local success = exports['glitch-minigames']:StartHackConnect(5)
if success then
    print("Password successfully cracked!")
else
    print("Failed to crack password!")
end
```
![Brute Force Minigame](https://github.com/user-attachments/assets/3ad137ce-020d-4caf-9ae0-1e5ef9f70a33)

### 8. **Drilling** (Sounds not working correctly)
- **Description**: A precision drilling minigame where players must maintain optimal pressure and temperature while drilling through materials. Features dynamic difficulty based on material hardness and drill bit condition.
- **Export**: `exports['glitch-minigames']:StartDrilling(difficulty, numLayers, timeLimit, drillBitDurability)`

#### Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| difficulty | 1 | Difficulty level (1-3) affects temperature rise rate and optimal pressure zone |
| numLayers | 3 | Number of material layers to drill through |
| timeLimit | 60 | Time limit in seconds (0 for no limit) |
| drillBitDurability | 100 | Starting durability of drill bit (0-100) |

#### Usage Example

```lua
local success = exports['glitch-minigames']:StartDrilling()
if success then
    print("Successfully drilled through!")
else
    print("Drilling failed!")
end
```
![Drilling Minigame](https://github.com/user-attachments/assets/03633028-913d-43d7-8eb8-a9f6fa169e9e)

#### Controls
- **W/S or Up/Down Arrow**: Adjust drilling pressure
- **Mouse Movement**: Fine-tune pressure control
- **Space**: Emergency stop (halts drilling immediately)

### 9. **VAR Hack**
- **Description**: A memory-based minigame where players must quickly memorize and click on numbers in sequential order. Tests quick thinking and spatial memory under time pressure.
- **Export**: `exports['glitch-minigames']:StartVarHack(blocks, speed)`

#### Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| blocks | 5 | Number of blocks to memorize (1-10) |
| speed | 5 | Time limit in seconds for completing the sequence |

#### Usage Examples

```lua
local success = exports['glitch-minigames']:StartVarHack(5, 5)
if success then
    print("VAR hack successful!")
else
    print("VAR hack failed!")
end
```
![VAR Hack Minigame](https://github.com/user-attachments/assets/233693af-39d3-4a72-a7ef-d638094c9029)

### 10. **Plasma Drill** (Sounds not working correctly)
- **Description**: A precision-based drilling minigame where players must manage drill speed and temperature while maintaining optimal pressure. Features dynamic temperature management and depth progression tracking.
- **Export**: `exports['glitch-minigames']:StartPlasmaDrill(difficulty)`

#### Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| difficulty | 5 | Difficulty level (1-10) affects temperature rise rate and drill speed sensitivity |

#### Usage Example

```lua
-- Basic usage with default difficulty
local success = exports['glitch-minigames']:StartPlasmaDrill()
if success then
    print("Successfully completed plasma drilling!")
else
    print("Plasma drilling failed!")
end

-- Custom difficulty
local success = exports['glitch-minigames']:StartPlasmaDrill(7)
if success then
    print("Completed difficult plasma drilling!")
else
    print("Failed difficult plasma drilling!")
end
```

#### Controls
- **Up/Down Arrow**: Move drill position
- **Left/Right Arrow**: Control drill speed
- **ESC**: Cancel drilling
- 
![Plasma Drill Minigame](https://github.com/user-attachments/assets/7a0de014-b994-4fc8-b8ec-2dff65dc5b74)

## Installation
1. Clone this repository to your FiveM server's resources folder:
    ```bash
    git clone https://github.com/your-username/glitch-minigames.git
    ```
2. Add `ensure glitch-minigames` to your `server.cfg`.
3. Restart your server.

## Controls
- **Firewall Pulse**: Mouse click to stop the pulse inside the safe zone
- **Backdoor Sequence**: Keyboard keys (W, A, S, D, arrow keys, numbers) to match the displayed sequence
- **Backspace**: Emergency escape key to exit any minigame if needed

## Features
- **Sound Effects**: Audio feedback for interactions, successes, and failures
- **Visual Feedback**: Clear indicators for success/failure states
- **Adaptive Difficulty**: Games become progressively harder as you succeed
- **Time Penalties**: Wrong inputs in the Backdoor Sequence game reduce remaining time
- **Customizable Parameters**: Adjust all aspects of difficulty through export parameters

## Special Thanks
### A Heartfelt Thank You

I would like to extend my deepest gratitude to the following individuals and projects for their incredible contributions to the FiveM community. Your hard work, creativity, and dedication have inspired and enabled countless developers, including myself, to create engaging and innovative resources:

- [utkuali](https://github.com/utkuali/datacrack) for the **Data Crack Minigame**, which served as a foundation for one of the games in this resource.
- [BerkieBb](https://github.com/BerkieBb/CircuitBreakerMinigame_lua) and [TimothyDexter](https://github.com/TimothyDexter/FiveM-CircuitBreakerMinigame) for the **Circuit Breaker Minigame**, which provided invaluable insights into precision-based gameplay mechanics.
- [TransitNode](https://github.com/TransitNode/Hacking_PC/tree/master) for their innovative hacking minigame concepts, which inspired several features in this resource.
- [MxttDev](https://github.com/MxttDev/M-drilling) for their **Drilling Minigame**, which laid the groundwork for the drilling mechanics implemented here.
- [SezayK](https://github.com/SezayK/six_atmrobbery/tree/main) for their **Plasma Drilling Minigame**, which laid the groundwork for the plasma drilling mechanics implemented here.

Your contributions have not only enriched the FiveM ecosystem but have also fostered a spirit of collaboration and innovation within the community. Thank you for sharing your work and inspiring others to push the boundaries of what is possible. This resource would not have been possible without your efforts.

## Support
For support, issues, or feature requests, please open an issue on this repository or contact us directly through our Discord. [![Discord Badge](https://img.shields.io/badge/-Glitch%20Studios-000000?style=flat&labelColor=7289DA&logo=discord&link=https://discord.gg/yourdiscordlink)](https://discord.gg/3DsNKxq2DQ)

