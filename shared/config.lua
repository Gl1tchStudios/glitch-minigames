-- Glitch Minigames
-- Copyright (C) 2024 Glitch
-- 
-- This program is free software: you can redistribute it and/or modify
-- it under the terms of the GNU General Public License as published by
-- the Free Software Foundation, either version 3 of the License, or
-- (at your option) any later version.
-- 
-- This program is distributed in the hope that it will be useful,
-- but WITHOUT ANY WARRANTY; without even the implied warranty of
-- MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
-- GNU General Public License for more details.
-- 
-- You should have received a copy of the GNU General Public License
-- along with this program. If not, see <https://www.gnu.org/licenses/>.

config = {}

config.DebugCommands = false -- Testing only. true = anyone can run /testall, /testdrill etc. (and earn XP with them).
config.DebugPrints = false -- Set to true to show minigame console.log output in the UI (F8/devtools). Off keeps the console quiet.
config.usingGlitchNotifications = false -- true = result popups (success / failed / cancelled) through glitch-notifications. Off for now.

-- Keys that close/cancel any active minigame (returns a fail result to the calling script).
-- Supported names: 'BACKSPACE', 'ESCAPE', 'ENTER'. Defaults to both BACKSPACE and ESCAPE.
config.CancelKeys = { 'BACKSPACE', 'ESCAPE' }

-- XP (glitch-xpSystem)
-- Winning a minigame gives XP in the category below. The category is hidden in the
-- XP menu (hidden = true in glitch-xpSystem config) until the player's first XP.
-- XP is awarded server-side, whichever script started the minigame.
config.XP = {
    Enabled = true,                -- false = minigames never touch the XP system
    Resources = { 'glitch-xpSystem', 'glitch_xpSystem' }, -- first one started is used
    Category = 'hacking',          -- must exist in glitch-xpSystem Config.Categories
    FailXP = 0,                    -- XP for a failed attempt (0 = none)
    MinDuration = 2,               -- seconds a game must run before a win counts
    Cooldown = 15,                 -- seconds between XP awards per player (stops farming)

    -- Hacking skill tree perks applied to the games (values from glitch-xpSystem GetEffect)
    Perks = {
        Enabled = true,
        Time = 'hacking_time',         -- +seconds on the game's timer
        Mistakes = 'hacking_mistakes', -- +allowed mistakes / attempts / lives
        Retry = 'hacking_retry',       -- automatic retries after a failed game
    },

    -- XP per win, keyed by export name (15-40, master plan). Remove a game or set it to 0 to give no XP for it.
    Games = {
        StartFirewallPulse        = 35,
        StartBackdoorSequence     = 35,
        StartCircuitRhythm        = 35,
        StartSurgeOverride        = 15,
        StartVarHack              = 25,
        StartMemoryGame           = 20,
        StartSequenceMemoryGame   = 20,
        StartVerbalMemoryGame     = 20,
        StartNumberedSequenceGame = 20,
        StartSymbolSearchGame     = 25,
        StartPipePressureGame     = 25,
        StartPairsGame            = 20,
        StartMemoryColorsGame     = 20,
        StartUntangleGame         = 25,
        StartFingerprintGame      = 25,
        StartCodeCrackGame        = 25,
        StartWordCrackGame        = 25,
        StartBalanceGame          = 15,
        StartAimTestGame          = 15,
        StartCircleClickGame      = 15,
        StartLockpickGame         = 20,
        StartBarHitGame           = 15,
        StartSkillCheckGame       = 15,
        StartNumberUpGame         = 15,
        StartKeysGame             = 15,
        StartComboInputGame       = 15,
        StartHoldZoneGame         = 15,
        StartWireConnectGame      = 20,
        StartSimonSaysGame        = 20,
        StartBruteForce           = 35,
        StartDataCrack            = 35,
        StartCircuitBreaker       = 40,
        runMiniGame               = 40,
        runDefaultMiniGameFromDifficulty = 40,
        runDefaultRandom          = 40,
        StartDrilling             = 40,
        StartPlasmaDrilling       = 40,
    },
}

-- Active Color Theme
config.ActiveTheme = 'cyan' -- 'cyan' (original), 'monochrome' (black & white)

-- Active Visual Theme
config.ActiveVisualTheme = 'classic' -- 'classic' (original), 'modern' (new sleek design)

-- Background Transparency (0.0 = fully transparent, 1.0 = fully opaque)
config.BackgroundOpacity = {
    classic = 0.80,  -- Default for classic theme
    modern = 0.90    -- Default for modern theme
}

-- Available Color Themes
config.Themes = {
    -- Cyan/Teal Theme (The Original Glitch Studio's Theme)
    cyan = {
        -- Primary Theme Colors
        primary = '#33b5e5',         -- Main theme color (light blue gradient top) - used for success, highlights and accents
        primaryRgba = '51, 181, 229',  -- RGB values for rgba() usage
        secondary = '#0078d7',       -- Secondary/darker variant of primary for gradients (neon blue gradient bottom)
        secondaryRgba = '0, 120, 215', -- RGB values for secondary
        
        -- Success/Failure Colors
        success = '#33b5e5',         -- Success feedback color (light blue)
        successRgba = '51, 181, 229',  -- RGB values for success
        failure = '#ff4444',         -- Failure/error color (red)
        failureRgba = '255, 68, 68',   -- RGB values for failure
        
        -- Warning/Caution Colors
        warning = '#ff7a30',         -- Warning color (dark orange)
        warningRgba = '255, 122, 48',  -- RGB values for warning
        
        -- Neutral/UI Colors
        background = '#0f1e2d',      -- Dark blue background
        backgroundRgba = '15, 30, 45', -- RGB values for background
        backgroundGradient1 = '#0f1e2d', -- Gradient start (dark blue)
        backgroundGradient1Rgba = '15, 30, 45',
        backgroundGradient2 = '#1e3c5a', -- Gradient end (medium blue)
        backgroundGradient2Rgba = '30, 60, 90',
        backgroundSecondary = '#001428', -- Secondary darker background (dark blue for buttons)
        backgroundSecondaryRgba = '0, 20, 40',
        backgroundTertiary = '#002038', -- Tertiary background (for gradients)
        backgroundTertiaryRgba = '0, 32, 56',
        border = '#33b5e5',          -- Border/outline color (light blue for active borders)
        borderRgba = '51, 181, 229',     -- RGB values for borders
        text = '#ffffff',            -- Primary text color
        textRgba = '255, 255, 255',    -- RGB values for text
        textSecondary = '#969696',   -- Secondary/muted text
        textSecondaryRgba = '150, 150, 150', -- RGB values for secondary text
        
        -- Additional Colors
        danger = '#ff3030',          -- High danger/critical (red)
        dangerRgba = '255, 48, 48',      -- RGB values for danger
        safe = '#36ff00',            -- Safe zone (green)
        safeRgba = '54, 255, 0',      -- RGB values for safe
        
        -- Minigame Specific Colors
        minigameColor1 = '#273cfcff',  -- VarHack block 1, Memory Colors blue
        minigameColor2 = '#2add57ff',  -- VarHack block 2, Memory Colors red
        minigameColor3 = '#28e757ff',  -- VarHack block 3, Memory Colors green
        minigameColor4 = '#edeb64ff',  -- VarHack block 4, Memory Colors yellow
        minigameColor5 = '#eb87deff',  -- VarHack block 5
    },

    -- Black & White Monochrome Theme
    monochrome = {
        -- Primary Theme Colors
        primary = '#ffffff',          -- Main theme color (white) - used for highlights and accents
        primaryRgba = '255, 255, 255',  -- RGB values for rgba() usage
        secondary = '#cccccc',        -- Secondary/darker variant of primary for gradients
        secondaryRgba = '204, 204, 204', -- RGB values for secondary
        
        -- Success/Failure Colors (Using color for feedback)
        success = '#2dd4a8',         -- Success feedback color (cyan/green)
        successRgba = '45, 212, 168',  -- RGB values for success
        failure = '#ff4444',         -- Failure/error color (red)
        failureRgba = '255, 68, 68',   -- RGB values for failure
        
        -- Warning/Caution Colors
        warning = '#ff7a30',         -- Warning color (dark orange)
        warningRgba = '255, 122, 48',  -- RGB values for warning
        
        -- Neutral/UI Colors
        background = '#000000',       -- Pure black background
        backgroundRgba = '0, 0, 0',     -- RGB values for background
        backgroundGradient1 = '#000000', -- Gradient start (black)
        backgroundGradient1Rgba = '0, 0, 0',
        backgroundGradient2 = '#1a1a1a', -- Gradient end (very dark gray)
        backgroundGradient2Rgba = '26, 26, 26',
        backgroundSecondary = '#0d0d0d', -- Secondary background (very dark gray)
        backgroundSecondaryRgba = '13, 13, 13',
        backgroundTertiary = '#1a1a1a', -- Tertiary background (for gradients)
        backgroundTertiaryRgba = '26, 26, 26',
        border = '#808080',           -- Border/outline color (medium gray)
        borderRgba = '128, 128, 128',   -- RGB values for borders
        text = '#ffffff',             -- Primary text color (white)
        textRgba = '255, 255, 255',     -- RGB values for text
        textSecondary = '#a0a0a0',    -- Secondary/muted text (light gray)
        textSecondaryRgba = '160, 160, 160', -- RGB values for secondary text
        
        -- Additional Colors
        danger = '#cc0000',          -- High danger/critical (dark red)
        dangerRgba = '204, 0, 0',      -- RGB values for danger
        safe = '#22c55e',            -- Safe zone (green)
        safeRgba = '34, 197, 94',      -- RGB values for safe
        
        -- Minigame Specific Colors (all same for monochrome)
        minigameColor1 = '#273cfcff',  -- VarHack block 1, Memory Colors blue
        minigameColor2 = '#2add57ff',  -- VarHack block 2, Memory Colors red
        minigameColor3 = '#28e757ff',  -- VarHack block 3, Memory Colors green
        minigameColor4 = '#edeb64ff',  -- VarHack block 4, Memory Colors yellow
        minigameColor5 = '#eb87deff',  -- VarHack block 5
    }
}

config.Colors = config.Themes[config.ActiveTheme]
