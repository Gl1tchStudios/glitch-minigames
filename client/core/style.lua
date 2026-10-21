-- Glitch Minigames - per-game style (colour / minigame theme / keybinds theme)
--
-- Three separate settings, each with a default in shared/config.lua:
--   colour   = config.ActiveTheme         a key of config.Themes ('glitch', 'cyan', ...)
--                                          or a table of colour overrides on top of it
--   theme    = config.ActiveVisualTheme   look of the game panel ('device', 'tablet', ...)
--   keybinds = config.ActiveKeybindTheme  look of the keycap HUD on the left
--
-- Any export can override them for one game by passing an options table as its
-- LAST argument (the core wrapper strips it before the game sees its arguments):
--   exports['glitch-minigames']:StartSymbolSearchGame(8, 2500, 30000, 1, 1, 'symbols',
--       { colour = 'cyan', theme = 'tablet', keybinds = 'device' })
--   exports['glitch-minigames']:StartDrilling({ keybinds = 'tablet' })
--   exports['glitch-minigames']:StartPipePressureGame(6, 30000, { colour = { primary = '#ff3355' } })
-- position = config.CircleClickPosition    where the circle click sits (other games ignore it):
--              'bottom', 'center', 'top', 'left', 'right', 'top-left', 'top-right',
--              'bottom-left', 'bottom-right', or { x = 0.5, y = 0.7 } (screen fractions, or 0-100 percent)
--   exports['glitch-minigames']:StartCircleClickGame(3, 2, 40, 1, 0, true, { 'E' }, 1, { position = 'center' })
-- sounds = 'gta' / 'classic'   sound theme for this game (default config.ActiveSoundTheme)
-- xp = true      XP + hacking perks for games in config.XP.OptIn (circle click), off by default
-- The style is sent at every game start, so an override never leaks into the next game.

Style = {}

local VISUAL_THEMES = { device = true, tablet = true, modern = true, classic = true }
local KEYBIND_THEMES = { tags = true, default = true, device = true, tablet = true }
local STYLE_KEYS = { colour = true, color = true, theme = true, keybinds = true, position = true, xp = true, sounds = true }

-- 'classic' = the NUI mp3s; every other theme is a table of native sounds in config.SoundThemes
local function SoundThemeOk(name)
    return name == 'classic' or (config.SoundThemes or {})[name] ~= nil
end

-- Sound theme picked in /uidemo (glitch-uiElements): live on this client, or saved there
-- for everyone. nil = config.ActiveSoundTheme.
local soundOverride = nil

local function ActiveSounds()
    if soundOverride and SoundThemeOk(soundOverride) then return soundOverride end
    local name = config.ActiveSoundTheme or 'gta'
    return SoundThemeOk(name) and name or 'classic'
end

Style.hud = config.ActiveKeybindTheme or 'default'

-- '#c04cff' -> '192, 76, 255' (for colour override tables that only give the hex)
local function HexToRgb(hex)
    if type(hex) ~= 'string' then return nil end
    local h = hex:gsub('#', '')
    if #h ~= 6 and #h ~= 8 then return nil end
    local r, g, b = tonumber(h:sub(1, 2), 16), tonumber(h:sub(3, 4), 16), tonumber(h:sub(5, 6), 16)
    if not (r and g and b) then return nil end
    return ('%d, %d, %d'):format(r, g, b)
end

-- True when the value is an options table: keyed by our style keys, no array part
function Style.IsOptions(value)
    if type(value) ~= 'table' or value[1] ~= nil then return false end
    for key in pairs(value) do
        if STYLE_KEYS[key] then return true end
    end
    return false
end

-- Pulls a trailing options table off a table.pack()ed argument list
function Style.Extract(args)
    local last = args[args.n]
    if args.n > 0 and Style.IsOptions(last) then
        args[args.n] = nil
        args.n = args.n - 1
        return last
    end
    return nil
end

local function ResolveColours(choice)
    local base = config.Themes[config.ActiveTheme] or config.Colors
    if type(choice) == 'string' then
        if config.Themes[choice] then return config.Themes[choice] end
        print(('[glitch-minigames] unknown colour theme "%s", using "%s"'):format(choice, config.ActiveTheme))
        return base
    end
    if type(choice) == 'table' then
        local merged = {}
        for k, v in pairs(base) do merged[k] = v end
        for k, v in pairs(choice) do
            merged[k] = v
            -- keep the matching 'xxxRgba' in step when only the hex was given
            if type(k) == 'string' and not k:find('Rgba$') and choice[k .. 'Rgba'] == nil then
                local rgb = HexToRgb(v)
                if rgb and merged[k .. 'Rgba'] then merged[k .. 'Rgba'] = rgb end
            end
        end
        return merged
    end
    return base
end

local function Pick(value, allowed, fallback, what)
    if value == nil then return fallback end
    if allowed[value] then return value end
    print(('[glitch-minigames] unknown %s "%s", using "%s"'):format(what, tostring(value), fallback))
    return fallback
end

-- Sends the resolved style to the NUI and remembers the keybinds theme for the HUD
function Style.Apply(opts)
    opts = opts or {}
    local visual = Pick(opts.theme, VISUAL_THEMES, config.ActiveVisualTheme or 'device', 'minigame theme')
    Style.hud = Pick(opts.keybinds, KEYBIND_THEMES, config.ActiveKeybindTheme or 'tags', 'keybinds theme')
    -- only a per-game keybinds theme goes to glitch-uiElements; otherwise its own
    -- (possibly /uidemo-saved) default is used
    Style.hudGiven = opts.keybinds ~= nil and Style.hud or nil
    -- a per-game colour, passed on to glitch-uiElements for the controls HUD;
    -- nil = glitch-uiElements' own default for the side HUD (its Config.DefaultColours)
    Style.colour = opts.colour or opts.color
    local sounds = ActiveSounds()
    if opts.sounds ~= nil then
        if SoundThemeOk(opts.sounds) then
            sounds = opts.sounds
        else
            print(('[glitch-minigames] unknown sound theme "%s", using "%s"'):format(tostring(opts.sounds), sounds))
        end
    end
    SendNUIMessage({
        action = 'setStyle',
        colors = ResolveColours(opts.colour or opts.color),
        visualTheme = visual,
        backgroundOpacity = (config.BackgroundOpacity or {})[visual] or 0.95,
        hudTheme = Style.hud,
        position = opts.position or config.CircleClickPosition or 'bottom',
        soundTheme = sounds,
    })
end

-- NUI games ask for a sound by name (click / buttonPress / penalty / success / failure);
-- a native theme plays it here with PlaySoundFrontend. Muting is handled in the NUI.
local function PlayNative(theme, sound)
    local set = (config.SoundThemes or {})[theme]
    local entry = set and set[sound]
    if entry then PlaySoundFrontend(-1, entry[1], entry[2], true) end
    return entry ~= nil
end

RegisterNUICallback('playSound', function(data, cb)
    cb('ok')
    if data then PlayNative(data.theme, data.sound) end
end)

-- ---- previews (the /uidemo Sounds tab in glitch-uiElements) ---------------

local SOUND_ORDER = { 'click', 'buttonPress', 'penalty', 'success', 'failure' }

-- { active = 'gta', themes = { 'gta', 'classic' }, sounds = { 'click', ... },
--   info = { gta = { click = 'NAV_UP_DOWN / HUD_FRONTEND_DEFAULT_SOUNDSET', ... }, classic = { click = 'sounds/click.mp3', ... } } }
Minigames.RawExport('GetSoundThemes', function()
    local themes, info = {}, { classic = {} }
    for name, set in pairs(config.SoundThemes or {}) do
        themes[#themes + 1] = name
        info[name] = {}
        for sound, entry in pairs(set) do
            info[name][sound] = entry[2] ~= '' and (entry[1] .. ' / ' .. entry[2]) or entry[1]
        end
    end
    table.sort(themes)
    themes[#themes + 1] = 'classic'
    for _, sound in ipairs(SOUND_ORDER) do info.classic[sound] = 'sounds/' .. sound .. '.mp3' end
    return { active = ActiveSounds(), configDefault = config.ActiveSoundTheme or 'gta',
        themes = themes, sounds = SOUND_ORDER, info = info }
end)

-- Sets the sound theme on this client (nil = back to config.ActiveSoundTheme).
-- Used by /uidemo; the saved choice comes from glitch-uiElements (below).
local function SetSoundTheme(name)
    if name ~= nil and not SoundThemeOk(name) then return false end
    soundOverride = name
    SendNUIMessage({ action = 'setSoundTheme', soundTheme = ActiveSounds() })
    return true
end
Minigames.RawExport('SetSoundTheme', SetSoundTheme)

-- the theme saved with /uidemo Save as default (glitch-uiElements data/settings.json)
local function LoadSavedSounds()
    if GetResourceState('glitch-uiElements') ~= 'started' then return end
    local ok, name = pcall(function() return exports['glitch-uiElements']:GetMinigameSoundTheme() end)
    if ok then SetSoundTheme(name) end
end

AddEventHandler('glitch-uiElements:settingsApplied', LoadSavedSounds)
AddEventHandler('onClientResourceStart', function(res)
    if res == 'glitch-uiElements' then SetTimeout(2000, LoadSavedSounds) end
end)
CreateThread(function()
    Wait(1000) -- after the NUI page is up (customMinigames/client.lua sends setColors at 500 ms)
    LoadSavedSounds()
end)

-- Plays one minigame sound in a theme (nil = the active one). Ignores the player's mute.
Minigames.RawExport('PreviewSound', function(sound, theme)
    theme = theme or ActiveSounds()
    if theme == 'classic' then
        SendNUIMessage({ action = 'previewSound', sound = sound })
        return true
    end
    return PlayNative(theme, sound)
end)
