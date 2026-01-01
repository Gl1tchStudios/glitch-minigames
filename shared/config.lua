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

config.DebugCommands = true -- This is for testing purposes only. Set to true to enable debug commands.
config.usingGlitchNotifications = true -- Set to true to enable glitch notifications.

-- Active Color Theme
-- Options: 'cyan' or 'monochrome'
config.ActiveTheme = 'monochrome'

-- Available Color Themes
config.Themes = {
    -- Cyan/Teal Theme (The Original Glitch Studio's Theme)
    cyan = {
        -- Primary Theme Colors
        primary = '#2dd4a8',         -- Main theme color (cyan) - used for success, highlights and accents
        primaryRgba = '45, 212, 168',  -- RGB values for rgba() usage
        
        -- Success/Failure Colors
        success = '#2dd4a8',         -- Success feedback color (cyan)
        successRgba = '45, 212, 168',  -- RGB values for success
        failure = '#ff4444',         -- Failure/error color (red)
        failureRgba = '255, 68, 68',   -- RGB values for failure
        
        -- Warning/Caution Colors
        warning = '#fbbf24',         -- Warning color (yellow)
        warningRgba = '251, 191, 36',  -- RGB values for warning
        
        -- Neutral/UI Colors
        background = '#1e1e1e',      -- Dark background
        backgroundRgba = '30, 30, 30', -- RGB values for background
        backgroundGradient1 = '#0f1e2d', -- Gradient start (dark blue)
        backgroundGradient1Rgba = '15, 30, 45',
        backgroundGradient2 = '#1e3c5a', -- Gradient end (medium blue)
        backgroundGradient2Rgba = '30, 60, 90',
        backgroundSecondary = '#001428', -- Secondary darker background
        backgroundSecondaryRgba = '0, 20, 40',
        border = '#505050',          -- Border/outline color
        borderRgba = '80, 80, 80',     -- RGB values for borders
        text = '#e0e0e0',            -- Primary text color
        textRgba = '224, 224, 224',    -- RGB values for text
        textSecondary = '#969696',   -- Secondary/muted text
        textSecondaryRgba = '150, 150, 150', -- RGB values for secondary text
        
        -- Additional Colors
        danger = '#cc0000',          -- High danger/critical (dark red)
        dangerRgba = '204, 0, 0',      -- RGB values for danger
        safe = '#22c55e',            -- Safe zone (green)
        safeRgba = '34, 197, 94',      -- RGB values for safe
        
        -- Minigame Specific Colors
        minigameColor1 = '#33b5e5',  -- VarHack block 1, Memory Colors blue
        minigameColor2 = '#1e90ff',  -- VarHack block 2, Memory Colors red
        minigameColor3 = '#4169e1',  -- VarHack block 3, Memory Colors green
        minigameColor4 = '#6495ed',  -- VarHack block 4, Memory Colors yellow
        minigameColor5 = '#87ceeb',  -- VarHack block 5
    },

    -- Black & White Monochrome Theme
    monochrome = {
        -- Primary Theme Colors
        primary = '#ffffff',          -- Main theme color (white) - used for highlights and accents
        primaryRgba = '255, 255, 255',  -- RGB values for rgba() usage
        
        -- Success/Failure Colors (Using color for feedback)
        success = '#2dd4a8',         -- Success feedback color (cyan/green)
        successRgba = '45, 212, 168',  -- RGB values for success
        failure = '#ff4444',         -- Failure/error color (red)
        failureRgba = '255, 68, 68',   -- RGB values for failure
        
        -- Warning/Caution Colors
        warning = '#fbbf24',         -- Warning color (yellow)
        warningRgba = '251, 191, 36',  -- RGB values for warning
        
        -- Neutral/UI Colors
        background = '#000000',       -- Pure black background
        backgroundRgba = '0, 0, 0',     -- RGB values for background
        backgroundGradient1 = '#000000', -- Gradient start (black)
        backgroundGradient1Rgba = '0, 0, 0',
        backgroundGradient2 = '#1a1a1a', -- Gradient end (very dark gray)
        backgroundGradient2Rgba = '26, 26, 26',
        backgroundSecondary = '#0d0d0d', -- Secondary background (very dark gray)
        backgroundSecondaryRgba = '13, 13, 13',
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
        minigameColor1 = '#ffffff',  -- VarHack block 1, Memory Colors blue
        minigameColor2 = '#ffffff',  -- VarHack block 2, Memory Colors red
        minigameColor3 = '#ffffff',  -- VarHack block 3, Memory Colors green
        minigameColor4 = '#ffffff',  -- VarHack block 4, Memory Colors yellow
        minigameColor5 = '#ffffff',  -- VarHack block 5
    }
}

config.Colors = config.Themes[config.ActiveTheme]