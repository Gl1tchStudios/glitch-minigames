-- Glitch Minigames - controls HUD
--
-- Every minigame shows its controls on the left of the screen while it runs, drawn
-- by glitch-uiElements, or by ox_lib text UI in standalone mode (config.KeybindDisplay).
-- The core wrapper calls ShowControls(name, args)
-- when an export starts and HideControls() when it ends, so each game only needs
-- an entry in GameControls below. Games whose keys come from their arguments
-- (skill check, bar hit, hold zone ...) read them from args.
--
-- Row: { keys = { 'W', 'S' }, label = 'Move drill', cancel = true }
-- Special key names shown as-is: LMB, RMB, MOUSE, SPACE, ENTER, BKSP, ESC, arrows.

local function Upper(list, fallback)
    local out = {}
    for _, k in ipairs(type(list) == 'table' and list or fallback) do out[#out + 1] = tostring(k):upper() end
    return out
end

-- The configured cancel keys (config.CancelKeys) as one row
local function Cancel()
    local keys = {}
    for _, name in ipairs(config.CancelKeys or { 'ESCAPE', 'BACKSPACE' }) do
        if name == 'ESCAPE' then keys[#keys + 1] = 'ESC'
        elseif name == 'BACKSPACE' then keys[#keys + 1] = 'BKSP'
        else keys[#keys + 1] = name end
    end
    return { keys = keys, label = 'Cancel', cancel = true }
end

local ESC = { keys = { 'ESC' }, label = 'Cancel', cancel = true }

GameControls = {
    -- scaleform / Lua games
    StartDrilling = function() return 'Drilling', {
        { keys = { 'W' }, label = 'Drill down' },
        { keys = { 'S' }, label = 'Lift to cool' },
        { keys = { 'E' }, label = 'Speed up' },
        { keys = { 'Q' }, label = 'Slow down' },
        ESC,
    } end,
    StartPlasmaDrilling = function() return 'Plasma drilling', {
        { keys = { 'UP', 'DOWN' }, label = 'Move drill' },
        { keys = { 'LEFT', 'RIGHT' }, label = 'Speed' },
        { keys = { 'ESC', 'BKSP' }, label = 'Cancel', cancel = true },
    } end,
    StartCircuitBreaker = function() return 'Circuit breaker', {
        { keys = { 'W', 'A', 'S', 'D' }, label = 'Steer the signal' },
        { keys = { 'Q' }, label = 'Quit', cancel = true },
    } end,
    StartDataCrack = function() return 'Data crack', {
        { keys = { 'LMB' }, label = 'Lock the column' },
        ESC,
    } end,
    StartBruteForce = function() return 'Brute force', {
        { keys = { 'MOUSE' }, label = 'Aim' },
        { keys = { 'LMB' }, label = 'Select' },
        { keys = { 'RMB' }, label = 'Back' },
    } end,

    -- NUI games
    StartFirewallPulse = function() return 'Firewall pulse', {
        { keys = { 'LMB' }, label = 'Hack inside the safe zone' },
        Cancel(),
    } end,
    StartBackdoorSequence = function() return 'Backdoor sequence', {
        { keys = { 'KEYS' }, label = 'Press the keys shown together' },
        Cancel(),
    } end,
    StartCircuitRhythm = function(args) return 'Circuit rhythm', {
        { keys = Upper(args[2], { 'A', 'S', 'D', 'F' }), label = 'Hit the notes in each lane' },
        Cancel(),
    } end,
    StartSurgeOverride = function(args) return 'Surge override', {
        { keys = Upper(args[1], { 'E' }), label = 'Mash the key shown' },
        Cancel(),
    } end,
    StartVarHack = function() return 'Var hack', {
        { keys = { 'LMB' }, label = 'Click the blocks in order' },
        Cancel(),
    } end,
    StartMemoryGame = function() return 'Memory', {
        { keys = { 'LMB' }, label = 'Click the squares that lit up' },
        Cancel(),
    } end,
    StartSequenceMemoryGame = function() return 'Sequence memory', {
        { keys = { 'LMB' }, label = 'Repeat the sequence' },
        Cancel(),
    } end,
    StartVerbalMemoryGame = function() return 'Verbal memory', {
        { keys = { 'LMB' }, label = 'Seen or new' },
        Cancel(),
    } end,
    StartNumberedSequenceGame = function() return 'Numbered sequence', {
        { keys = { 'LMB' }, label = 'Click the numbers in order' },
        Cancel(),
    } end,
    StartSymbolSearchGame = function() return 'Symbol search', {
        { keys = { 'W', 'A', 'S', 'D' }, label = 'Move the marker' },
        { keys = { 'ENTER', 'SPACE' }, label = 'Select' },
        Cancel(),
    } end,
    StartPipePressureGame = function() return 'Pipe pressure', {
        { keys = { 'LMB' }, label = 'Rotate a pipe' },
        Cancel(),
    } end,
    StartPairsGame = function() return 'Pairs', {
        { keys = { 'LMB' }, label = 'Flip two cards' },
        Cancel(),
    } end,
    StartMemoryColorsGame = function() return 'Memory colours', {
        { keys = { 'TYPE' }, label = 'Type the answer' },
        { keys = { 'ENTER' }, label = 'Submit' },
        Cancel(),
    } end,
    StartUntangleGame = function() return 'Untangle', {
        { keys = { 'LMB' }, label = 'Drag the points' },
        Cancel(),
    } end,
    StartFingerprintGame = function() return 'Fingerprint', {
        { keys = { 'LMB' }, label = 'Spin the rings with the arrows' },
        Cancel(),
    } end,
    StartCodeCrackGame = function() return 'Code crack', {
        { keys = { '0-9' }, label = 'Enter digits' },
        { keys = { 'BKSP' }, label = 'Delete' },
        { keys = { 'ENTER' }, label = 'Try the code' },
        { keys = { 'ESC' }, label = 'Cancel', cancel = true },
    } end,
    StartWordCrackGame = function() return 'Word crack', {
        { keys = { 'A-Z' }, label = 'Type letters' },
        { keys = { 'BKSP' }, label = 'Delete' },
        { keys = { 'ENTER' }, label = 'Try the word' },
        { keys = { 'ESC' }, label = 'Cancel', cancel = true },
    } end,
    StartBalanceGame = function() return 'Balance', {
        { keys = { 'Q' }, label = 'Lean left' },
        { keys = { 'E' }, label = 'Lean right' },
        Cancel(),
    } end,
    StartAimTestGame = function() return 'Aim test', {
        { keys = { 'LMB' }, label = 'Hit the targets' },
        Cancel(),
    } end,
    StartCircleClickGame = function(args) return 'Circle click', {
        { keys = { 'KEY' }, label = 'Press the key shown in the zone' },
        Cancel(),
    } end,
    OxSkillCheck = function(args) return 'Skill check', {
        { keys = Upper(args[2], { 'E' }), label = 'Press the key shown in the zone' },
        Cancel(),
    } end,
    StartLockpickGame = function() return 'Lockpick', {
        { keys = { 'LMB' }, label = 'Drag around the lock to turn the pick' },
        { keys = { 'A', 'D' }, label = 'Nudge the pick' },
        { keys = { 'E', 'RMB' }, label = 'Hold to test the pin' },
        Cancel(),
    } end,
    StartBarHitGame = function(args) return 'Bar hit', {
        { keys = Upper({ args[1] }, { 'E' }), label = 'Press in the zone' },
        Cancel(),
    } end,
    StartSkillCheckGame = function(args) return 'Skill check', {
        { keys = Upper(args[1], { 'E', 'F', 'R' }), label = 'Press the key shown in the zone' },
        Cancel(),
    } end,
    StartNumberUpGame = function() return 'Number up', {
        { keys = { 'LMB' }, label = 'Click the numbers lowest first' },
        Cancel(),
    } end,
    StartKeysGame = function() return 'Keys', {
        { keys = { 'A-Z' }, label = 'Type the letters shown' },
        Cancel(),
    } end,
    StartComboInputGame = function() return 'Combo input', {
        { keys = { 'UP', 'DOWN', 'LEFT', 'RIGHT' }, label = 'Enter the combo' },
        Cancel(),
    } end,
    StartHoldZoneGame = function(args) return 'Hold zone', {
        { keys = Upper({ args[1] }, { 'E' }), label = 'Hold, release in the zone' },
        Cancel(),
    } end,
    StartWireConnectGame = function() return 'Wire connect', {
        { keys = { 'LMB' }, label = 'Connect matching wires' },
        Cancel(),
    } end,
    StartSimonSaysGame = function() return 'Simon says', {
        { keys = { 'LMB' }, label = 'Repeat the pattern' },
        Cancel(),
    } end,
    -- hack games pack (args[1] is the settings table)
    StartShapeRecallGame = function() return 'Shape recall', {
        { keys = { 'A-Z' }, label = 'Type the answer' },
        { keys = { 'BKSP' }, label = 'Delete' },
        { keys = { 'ENTER' }, label = 'Submit' },
        { keys = { 'ESC' }, label = 'Cancel', cancel = true },
    } end,
    StartMemoryDiffGame = function(args)
        local s = type(args[1]) == 'table' and args[1] or {}
        local rows = { { keys = { 'LMB' }, label = 'Click the changed values' } }
        local peeks = s.peeks
        if peeks == nil then peeks = (s.preset == 'hard' or s.preset == 'nopixel') and 0 or 1 end
        if s.mode ~= 'side' and s.preset ~= 'nopixel' and (tonumber(peeks) or 0) > 0 then
            rows[#rows + 1] = { keys = { 'SPACE' }, label = 'Peek at image A' }
        end
        rows[#rows + 1] = Cancel()
        return 'Memory diff', rows
    end,
    StartTracerouteGame = function() return 'Traceroute', {
        { keys = { 'LMB' }, label = 'Hop to a linked node' },
        { keys = { 'W', 'A', 'S', 'D' }, label = 'Hop that way' },
        Cancel(),
    } end,
    StartCarrierTuneGame = function() return 'Carrier tune', {
        { keys = { 'A', 'D' }, label = 'Frequency' },
        { keys = { 'W', 'S' }, label = 'Amplitude' },
        Cancel(),
    } end,
}
-- the other circuit breaker entry points
GameControls.runMiniGame = GameControls.StartCircuitBreaker
GameControls.runDefaultMiniGameFromDifficulty = GameControls.StartCircuitBreaker
GameControls.runDefaultRandom = GameControls.StartCircuitBreaker

-- Full-screen games get a mute toggle (config.MuteKey, default TAB). The NUI keeps the
-- muted state (saved across games and restarts) and labels the row Mute / Unmute.
local MUTE_GAMES = {
    StartNumberUpGame = true, StartKeysGame = true, StartSimonSaysGame = true, StartAimTestGame = true,
    StartUntangleGame = true, StartPairsGame = true, StartMemoryColorsGame = true, StartFingerprintGame = true,
    StartCodeCrackGame = true, StartFirewallPulse = true, StartBackdoorSequence = true, StartCircuitRhythm = true,
    StartMemoryGame = true, StartNumberedSequenceGame = true, StartPipePressureGame = true, StartSymbolSearchGame = true,
    StartVarHack = true, StartVerbalMemoryGame = true, StartWordCrackGame = true, StartBalanceGame = true,
    StartSequenceMemoryGame = true, StartWireConnectGame = true,
    StartShapeRecallGame = true, StartMemoryDiffGame = true, StartTracerouteGame = true, StartCarrierTuneGame = true,
}

-- name -> { control id read in Lua, KeyboardEvent.code read in the NUI, keycap text }
-- Pick a key the games don't use: letters are typed in Keys / Word Crack / Backdoor.
local MUTE_KEYS = {
    TAB  = { control = 37,  code = 'Tab',      cap = 'TAB' },
    CAPS = { control = 137, code = 'CapsLock', cap = 'CAPS' },
    M    = { control = 244, code = 'KeyM',     cap = 'M' },
}
MuteKey = MUTE_KEYS[string.upper(config.MuteKey or 'TAB')] or MUTE_KEYS.TAB

local muteActive = false

-- ---- where the HUD is drawn (config.KeybindDisplay) ------------------------
--   'ui'  glitch-uiElements ShowKeybinds (same themes, layered over other scripts' HUDs)
--   'ox'  ox_lib text UI (standalone: no glitch-uiElements needed)
--   'nui' the old built-in HUD in our own NUI, only when neither is running

local shown = nil       -- { via, title, rows, muteIndex } while a HUD is up

local function Provider()
    local mode = config.KeybindDisplay or 'auto'
    if mode ~= 'standalone' and GetResourceState('glitch-uiElements') == 'started' then return 'ui' end
    if GetResourceState('ox_lib') == 'started' then return 'ox' end
    return 'nui'
end

-- ox_lib text UI is one markdown block: **Title** then "[W] [S]  Label" per line
local function OxText(title, rows)
    local lines = {}
    if title then lines[#lines + 1] = '**' .. title .. '**' end
    for _, r in ipairs(rows) do
        local caps = {}
        for _, k in ipairs(type(r.keys) == 'table' and r.keys or { r.keys }) do caps[#caps + 1] = '[' .. tostring(k) .. ']' end
        lines[#lines + 1] = table.concat(caps, ' ') .. '  ' .. tostring(r.label or '')
    end
    return table.concat(lines, '  \n')
end

local function Draw(title, rows, mute)
    local via = Provider()
    shown = { via = via, title = title, rows = rows }
    for i, r in ipairs(rows) do
        if r.mute then shown.muteIndex = i end
    end
    if via == 'ui' then
        exports['glitch-uiElements']:ShowKeybinds(title, rows, {
            keybinds = Style and Style.hudGiven or nil,
            colour = Style and Style.colour or nil,
            position = config.KeybindPosition,   -- nil = glitch-uiElements' default
        })
    elseif via == 'ox' then
        exports.ox_lib:showTextUI(OxText(title, rows), { position = config.OxTextUIPosition or 'left-center' })
    end
    -- our NUI still runs the mute key; it only draws the HUD itself in 'nui' mode.
    -- The built-in HUD has no 'tags' look, so it uses its light keycaps then.
    local hud = Style and Style.hud or 'default'
    SendNUIMessage({ action = 'controlsShow', title = title, rows = rows, hudTheme = hud == 'tags' and 'default' or hud,
        hidden = via ~= 'nui', mute = mute, muteKey = MuteKey.code })
end

local function Clear()
    if shown then
        if shown.via == 'ui' and GetResourceState('glitch-uiElements') == 'started' then
            exports['glitch-uiElements']:HideKeybinds()
        elseif shown.via == 'ox' and GetResourceState('ox_lib') == 'started' then
            exports.ox_lib:hideTextUI()
        end
    end
    shown = nil
    SendNUIMessage({ action = 'controlsHide' })
end

function ShowControls(name, args)
    local def = GameControls[name]
    if not def then return end
    local ok, title, rows = pcall(def, args or {})
    if not ok or not rows then return end
    muteActive = MUTE_GAMES[name] == true
    if muteActive then
        -- just above the cancel row
        local row = { keys = { MuteKey.cap }, label = 'Mute sounds', mute = true }
        local last = rows[#rows]
        if last and last.cancel then table.insert(rows, #rows, row) else rows[#rows + 1] = row end
    end
    Draw(title, rows, muteActive)
end

function HideControls()
    muteActive = false
    Clear()
end

-- The NUI owns the muted state (saved in localStorage). It reports it when a game
-- with a mute row starts and on every toggle, so the row reads Mute / Unmute.
RegisterNUICallback('muteState', function(data, cb)
    cb('ok')
    if not shown or not shown.muteIndex then return end
    local label = data and data.muted and 'Unmute sounds' or 'Mute sounds'
    local row = shown.rows[shown.muteIndex]
    if row.label == label then return end
    row.label = label
    if shown.via == 'ui' then
        exports['glitch-uiElements']:UpdateKeybind(shown.muteIndex, { label = label })
    elseif shown.via == 'ox' then
        exports.ox_lib:showTextUI(OxText(shown.title, shown.rows), { position = config.OxTextUIPosition or 'left-center' })
    end
end)

-- The NUI reports held keys; glitch-uiElements lights up the matching row on the HUD
RegisterNUICallback('keyState', function(data, cb)
    cb('ok')
    if shown and shown.via == 'ui' and type(data) == 'table' then
        TriggerEvent('glitch-uiElements:keyState', data.key, data.down == true)
    end
end)

AddEventHandler('onResourceStop', function(res)
    if res == GetCurrentResourceName() and shown and shown.via == 'ox' and GetResourceState('ox_lib') == 'started' then
        exports.ox_lib:hideTextUI()
    end
end)

-- Games without NUI keyboard focus (backdoor sequence, rhythm, balance) never see the
-- key in the browser, so watch it here too. With keyboard focus the control does not
-- fire, and the NUI ignores a second toggle within 250ms anyway.
CreateThread(function()
    while true do
        if muteActive then
            if IsDisabledControlJustPressed(0, MuteKey.control) or IsControlJustPressed(0, MuteKey.control) then
                SendNUIMessage({ action = 'toggleMute' })
            end
            Wait(0)
        else
            Wait(250)
        end
    end
end)

-- Prefer glitch-uiElements for new scripts (exports ShowKeybinds / HideKeybinds, same looks).
-- Other resources can borrow our controls HUD through client events, e.g.
--   TriggerEvent('glitch-minigames:controlsPanel', 'Heist editor', { { keys = { 'Q' }, label = 'Look around' } })
--   TriggerEvent('glitch-minigames:controlsPanel', nil)   -- hide
-- It goes through the same display as the games (config.KeybindDisplay).
-- Ignored while a minigame runs: its own controls win.
AddEventHandler('glitch-minigames:controlsPanel', function(title, rows)
    if Minigames.busy then return end
    if type(rows) ~= 'table' or #rows == 0 then return Clear() end
    Draw(title, rows, false)
end)
