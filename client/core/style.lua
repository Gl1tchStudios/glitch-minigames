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
-- The style is sent at every game start, so an override never leaks into the next game.

Style = {}

local VISUAL_THEMES = { device = true, tablet = true, modern = true, classic = true }
local KEYBIND_THEMES = { default = true, device = true, tablet = true }
local STYLE_KEYS = { colour = true, color = true, theme = true, keybinds = true }

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
    Style.hud = Pick(opts.keybinds, KEYBIND_THEMES, config.ActiveKeybindTheme or 'default', 'keybinds theme')
    SendNUIMessage({
        action = 'setStyle',
        colors = ResolveColours(opts.colour or opts.color),
        visualTheme = visual,
        backgroundOpacity = (config.BackgroundOpacity or {})[visual] or 0.95,
        hudTheme = Style.hud,
    })
end
