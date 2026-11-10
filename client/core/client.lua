-- Glitch Minigames - core export hook
--
-- Loaded before every other client file. Every function the resource exports
-- goes through Wrap(), which adds:
--   * one shared busy lock: only one minigame (NUI, scaleform or drill) at a time
--   * XP reporting to the server for games listed in config.XP.Games (server/xp.lua)
--   * Hacking perks from glitch-xpSystem (extra time, extra mistakes, retry), read
--     through lib.callback when an XP resource is running
--   * per-game style: a trailing { colour, theme, keybinds, position, xp } table (client/core/style.lua)
--     (xp = true turns XP + perks on for games in config.XP.OptIn; xp = false turns them off)
-- Arguments and return values otherwise pass through untouched.
--
-- Resource-wide globals (only visible inside this resource). These are the only
-- intended ones; everything else in the client files is local:
--   Minigames      this file: lock state, helpers, stop hooks
--   Style          client/core/style.lua
--   ShowControls, HideControls   client/core/controls.lua
--   CircuitBreaker client/circuitBreaker/init.lua (all circuit breaker modules)
--   Scaleforms     client/utils/scaleforms.lua
--   Drilling       client/fleecaDrilling/fleecaDrilling.lua
--   PlasmaDrilling client/plasmaDrilling/plasmaDrilling.lua
--   config         shared/config.lua

Minigames = {
    busy = false,      -- a minigame is running
    cancelled = false, -- set by the cancel key / death handlers in customMinigames/client.lua
}

-- Console output for testing; silent unless config.DebugPrints is on
function Minigames.Debug(...)
    if config.DebugPrints then print('[glitch-minigames]', ...) end
end

-- Player-facing text: config.Text replaces a string by its exact English text
function Minigames.T(text)
    local map = config.Text
    return (type(map) == 'table' and type(text) == 'string' and map[text]) or text
end

-- A function, or a function reference passed in from another resource through an
-- export (that arrives as a table with a __call metamethod, not as a function)
function Minigames.IsCallable(value)
    if type(value) == 'function' then return true end
    if type(value) ~= 'table' then return false end
    local mt = getmetatable(value)
    return type(mt) == 'table' and rawget(mt, '__call') ~= nil
end

-- Stop hooks: each game file registers how to end its game early. The lock
-- watchdog below runs them so a stuck game resolves its caller with a fail.
Minigames.stopHooks = {}
function Minigames.OnRelease(fn)
    Minigames.stopHooks[#Minigames.stopHooks + 1] = fn
end

-- Model / anim dict loaders with a timeout (the Lua games use these). Return true when loaded.
function Minigames.LoadModel(model, timeoutMs)
    local hash = type(model) == 'number' and model or joaat(model)
    if not IsModelValid(hash) then return false end
    RequestModel(hash)
    local deadline = GetGameTimer() + (timeoutMs or 5000)
    while not HasModelLoaded(hash) do
        if GetGameTimer() > deadline then
            print(('^3[glitch-minigames] model %s did not load^7'):format(tostring(model)))
            return false
        end
        Wait(10)
    end
    return true
end

function Minigames.LoadAnimDict(dict, timeoutMs)
    RequestAnimDict(dict)
    local deadline = GetGameTimer() + (timeoutMs or 5000)
    while not HasAnimDictLoaded(dict) do
        if GetGameTimer() > deadline then
            print(('^3[glitch-minigames] anim dict %s did not load^7'):format(dict))
            return false
        end
        Wait(10)
    end
    return true
end

local xpConfig = config.XP or {}
local xpEnabled = xpConfig.Enabled == true
local perksEnabled = xpEnabled and xpConfig.Perks and xpConfig.Perks.Enabled == true
local clientReported = xpEnabled and xpConfig.ClientReported ~= false

-- Which argument each perk bonus touches, per export.
-- time:     { arg index, 's' or 'ms', default when the caller passes nil }
-- mistakes: { arg index, default when the caller passes nil }
-- Values of 0 mean "unlimited" in those games and are left alone.
local PERK_ARGS = {
    StartFirewallPulse        = { time = { 4, 's', 10 } },
    StartBackdoorSequence     = { time = { 3, 's', 15 }, mistakes = { 4, 3 } },
    StartCircuitRhythm        = { mistakes = { 7, 5 } },
    StartMemoryGame           = { mistakes = { 5, 3 } },
    StartSequenceMemoryGame   = { mistakes = { 3, 3 } },
    StartVerbalMemoryGame     = { mistakes = { 1, 3 } },
    StartNumberedSequenceGame = { time = { 5, 'ms', 10000 }, mistakes = { 6, 3 } },
    StartSymbolSearchGame     = { time = { 3, 'ms', 30000 } },
    StartPipePressureGame     = { time = { 2, 'ms', 30000 } },
    StartPairsGame            = { time = { 2, 'ms', 120000 }, mistakes = { 3, 0 } },
    StartMemoryColorsGame     = { time = { 3, 'ms', 10000 } },
    StartUntangleGame         = { time = { 2, 'ms', 60000 } },
    StartFingerprintGame      = { time = { 1, 'ms', 30000 } },
    StartCodeCrackGame        = { time = { 1, 'ms', 60000 }, mistakes = { 3, 6 } },
    StartWordCrackGame        = { time = { 1, 'ms', 120000 }, mistakes = { 3, 6 } },
    StartAimTestGame          = { time = { 1, 'ms', 30000 }, mistakes = { 6, 5 } },
    StartCircleClickGame      = { mistakes = { 4, 3 } },
    StartLockpickGame         = { mistakes = { 3, 2 } },
    StartBarHitGame           = { time = { 7, 'ms', 30000 }, mistakes = { 6, 3 } },
    StartSkillCheckGame       = { time = { 3, 'ms', 15000 }, mistakes = { 6, 1 } },
    StartNumberUpGame         = { time = { 2, 'ms', 30000 }, mistakes = { 4, 3 } },
    StartKeysGame             = { time = { 2, 'ms', 15000 }, mistakes = { 4, 3 } },
    StartComboInputGame       = { time = { 3, 's', 6 }, mistakes = { 4, 2 } },
    StartHoldZoneGame         = { mistakes = { 6, 2 } },
    StartWireConnectGame      = { time = { 2, 's', 0 } },
    StartSimonSaysGame        = { time = { 3, 's', 20 }, mistakes = { 4, 1 } },
    -- hack games pack: one settings table at arg 1, `field` names the key inside it
    StartShapeRecallGame      = { time = { 1, 'ms', field = 'answerTime' }, mistakes = { 1, field = 'maxStrikes' } },
    StartMemoryDiffGame       = { time = { 1, 'ms', field = 'timeLimit' }, mistakes = { 1, field = 'maxStrikes' } },
    StartTracerouteGame       = { time = { 1, 'ms', field = 'ttl' }, mistakes = { 1, field = 'maxStrikes' } },
    StartCarrierTuneGame      = { time = { 1, 'ms', field = 'timeLimit' } },
    StartBruteForce           = { mistakes = { 1, 5 } },
    -- Balance: its timer is how long you must survive, so extra time would make it harder
}

local function IsWin(result)
    if type(result) == 'table' then
        return result.success == true
    end
    return result == true
end

local function Notify(text)
    text = Minigames.T(text)
    if config.usingGlitchNotifications and GetResourceState('glitch-notifications') == 'started' then
        exports['glitch-notifications']:ShowNotification(Minigames.T('Hacking'), text, 3000, config.NotifyColour or '#A855F7')
    else
        BeginTextCommandThefeedPost('STRING')
        AddTextComponentSubstringPlayerName(text)
        EndTextCommandThefeedPostTicker(false, false)
    end
end

-- Server callback with a timeout: a slow or missing answer gives the fallback
-- instead of holding up the game (lib.callback.await would wait 5 minutes).
local function AskServer(name, timeoutMs, fallback)
    local p = promise.new()
    lib.callback(name, false, function(result)
        if p.state == 0 then p:resolve(result) end
    end)
    SetTimeout(timeoutMs, function()
        if p.state == 0 then p:resolve(fallback) end
    end)
    return Citizen.Await(p)
end

-- Perk values come from the server (glitch-xpSystem GetEffect). One request per game start.
local function FetchPerks()
    local perks = AskServer('glitch-minigames:getPerks', 1000, {})
    return type(perks) == 'table' and perks or {}
end

-- Settings-table games (slot.field): the bonus is stored as settings._perk[field] = { add, scale }
-- and applied after the preset is merged (customMinigames/client.lua BuildHackConfig).
local function FieldPerk(args, slot)
    local index = slot[1]
    if type(args[index]) ~= 'table' then
        args[index] = {}
        if index > args.n then args.n = index end
    end
    local settings = args[index]
    settings._perk = settings._perk or {}
    settings._perk[slot.field] = settings._perk[slot.field] or { add = 0, scale = 1 }
    return settings._perk[slot.field]
end

local function AddBonus(args, slot, bonus)
    if slot.field then
        local perk = FieldPerk(args, slot)
        perk.add = perk.add + bonus
        return
    end
    local index, default = slot[1], slot[#slot]
    local value = args[index]
    if value == nil then value = default end
    if type(value) ~= 'number' or value <= 0 then return end
    args[index] = value + bonus
    if index > args.n then args.n = index end
end

local function ApplyPerks(name, args, perks)
    local slots = PERK_ARGS[name]
    if not slots then return end
    local time = tonumber(perks.time) or 0
    local mistakes = math.floor(tonumber(perks.mistakes) or 0)
    if slots.time and time > 0 then
        AddBonus(args, slots.time, slots.time[2] == 'ms' and time * 1000 or time)
    end
    if slots.mistakes and mistakes > 0 then
        AddBonus(args, slots.mistakes, mistakes)
    end
end

-- Timed buffs: any script can set LocalPlayer.state.hackTimeBonus (e.g. 0.05 for a consumable
-- buff while it lasts) and the game's time limit, perks included, gets that share longer (max 0.5)
local function ApplyHackBuff(name, args)
    local slot = PERK_ARGS[name] and PERK_ARGS[name].time
    local bonus = tonumber(LocalPlayer.state.hackTimeBonus) or 0
    if not slot or bonus <= 0 then return end
    if slot.field then
        local perk = FieldPerk(args, slot)
        perk.scale = perk.scale * (1 + math.min(bonus, 0.5))
        return
    end
    local index, default = slot[1], slot[#slot]
    local value = args[index]
    if value == nil then value = default end
    if type(value) ~= 'number' or value <= 0 then return end
    local longer = value * (1 + math.min(bonus, 0.5))
    args[index] = slot[2] == 'ms' and math.floor(longer) or longer
    if index > args.n then args.n = index end
end

-- Keylogger perk (config.XP.Perks.Keylogger): a game won within the last 10 minutes
-- runs again with its time limit half as long again
local lastWin = {}   -- [export name] = GetGameTimer() of the last win
local KEYLOGGER_MS = 10 * 60 * 1000

local function ScaleTime(name, args, factor)
    local slot = PERK_ARGS[name] and PERK_ARGS[name].time
    if not slot then return false end
    if slot.field then
        local perk = FieldPerk(args, slot)
        perk.scale = perk.scale * factor
        return true
    end
    local index, default = slot[1], slot[#slot]
    local value = args[index]
    if value == nil then value = default end
    if type(value) ~= 'number' or value <= 0 then return false end
    local longer = value * factor
    args[index] = slot[2] == 'ms' and math.floor(longer) or longer
    if index > args.n then args.n = index end
    return true
end

-- Zero day perk (config.XP.Perks.Skip): once a day the player may skip a hack outright.
-- Offered on the left keycap HUD for a few seconds before the game. Never offered
-- for games started by a resource in config.XP.ZeroDayNever (the endgame heists)
-- or a call that passes { noSkip = true }. Saying no hides the offer for 10 minutes.
local zeroDeclinedUntil = 0

local function OfferZeroDay(owner)
    if GetGameTimer() < zeroDeclinedUntil then return false end
    for _, res in ipairs(xpConfig.ZeroDayNever or {}) do
        if res == owner then return false end
    end
    local ui = GetResourceState('glitch-uiElements') == 'started'
    if ui then
        exports['glitch-uiElements']:ShowKeybinds(Minigames.T('Zero day'), {
            { keys = { 'E' }, label = Minigames.T('Skip this hack (once a day)'), active = true },
            { keys = { 'BACKSPACE' }, label = Minigames.T('Hack it myself'), cancel = true },
        })
    else
        Notify('Zero day ready: press E to skip this hack')
    end
    local chosen, started = nil, GetGameTimer()
    while chosen == nil and GetGameTimer() - started < (xpConfig.ZeroDaySeconds or 4) * 1000 do
        Wait(0)
        DisableControlAction(0, 38, true)    -- E (INPUT_PICKUP)
        DisableControlAction(0, 177, true)   -- BACKSPACE (INPUT_CELLPHONE_CANCEL)
        if IsDisabledControlJustPressed(0, 38) then chosen = true
        elseif IsDisabledControlJustPressed(0, 177) then chosen = false end
    end
    if ui then exports['glitch-uiElements']:HideKeybinds() end
    if not chosen then
        zeroDeclinedUntil = GetGameTimer() + 10 * 60 * 1000
        return false
    end
    -- Long timeout on purpose: the server spends the skip (UseDaily) before it
    -- answers, so giving up early on a slow reply would cost the player that
    -- day's skip and still make them play the hack.
    return AskServer('glitch-minigames:zeroDay', 15000, false) == true
end

local function Wrap(name, fn)
    local listedXP = xpEnabled and xpConfig.Games and xpConfig.Games[name] ~= nil
    local optIn = xpConfig.OptIn and xpConfig.OptIn[name] == true

    return function(...)
        if Minigames.busy then return false end
        Minigames.busy = true
        Minigames.cancelled = false
        -- who holds the lock (the watchdog below frees it if that script stops)
        Minigames.token = (Minigames.token or 0) + 1
        local token = Minigames.token
        Minigames.owner = GetInvokingResource()
        Minigames.name = name
        Minigames.since = GetGameTimer()

        local args = table.pack(...)
        -- optional trailing { colour, theme, keybinds } table (client/core/style.lua)
        local styleOpts = Style and Style.Extract(args)
        -- opt-in games only give XP (and perks / retry) when the call passes { xp = true }
        local reportXP = listedXP and (not optIn or (styleOpts ~= nil and styleOpts.xp == true))
        -- { xp = false } opts out (civilian jobs use these games without hacking XP)
        if styleOpts ~= nil and styleOpts.xp == false then reportXP = false end
        local perks = perksEnabled and reportXP and FetchPerks() or {}
        ApplyPerks(name, args, perks)
        if reportXP then ApplyHackBuff(name, args) end

        -- Zero day: skip the whole game and report a win to the caller (no XP for it)
        if reportXP and PERK_ARGS[name] and perks.zeroday == true and not (styleOpts and styleOpts.noSkip)
            and OfferZeroDay(Minigames.owner) then
            Notify('Zero day: you walked straight through it')
            if Minigames.token == token then Minigames.busy = false end
            for i = 1, args.n do
                if Minigames.IsCallable(args[i]) then args[i](true); return nil end
            end
            return true
        end
        -- Keylogger: this game was won a few minutes ago, so the timer runs longer
        if reportXP and (tonumber(perks.keylogger) or 0) > 0 and lastWin[name]
            and GetGameTimer() - lastWin[name] < KEYLOGGER_MS and ScaleTime(name, args, 1.5) then
            Notify('Keylogger: you have seen this one before')
        end

        -- one-time session token from the server; the result is only counted with it
        local xpToken = nil
        if reportXP and clientReported then
            lib.callback('glitch-minigames:xpStart', false, function(t)
                if type(t) == 'string' then xpToken = t end
            end, name)
        end
        if Style then Style.Apply(styleOpts) end            -- defaults unless overridden for this game
        if ShowControls then ShowControls(name, args) end   -- controls HUD on the left (client/core/controls.lua)

        local function Finish(result)
            -- a lock the watchdog already freed may belong to a newer game by now
            if Minigames.token ~= token then return end
            Minigames.busy = false
            if HideControls then HideControls() end
            if reportXP then
                if IsWin(result) then lastWin[name] = GetGameTimer() end
                if xpToken then
                    TriggerServerEvent('glitch-minigames:xpFinish', name, IsWin(result), xpToken)
                end
            end
        end

        -- Async form (StartPlasmaDrilling with a callback): finish when the callback fires.
        -- A callback from another resource is a function reference; it is swapped for a
        -- plain function here, so the game itself only ever sees functions.
        local async = false
        for i = 1, args.n do
            local userCb = args[i]
            if Minigames.IsCallable(userCb) then
                async = true
                args[i] = function(result, ...)
                    Finish(result)
                    return userCb(result, ...)
                end
            end
        end

        local function Run()
            local ok, packed = pcall(function()
                return table.pack(fn(table.unpack(args, 1, args.n)))
            end)
            if not ok then
                if Minigames.token == token then
                    Minigames.busy = false
                    if HideControls then HideControls() end
                end
                error(packed, 0)
            end
            return packed
        end

        local results = Run()

        if async then
            -- A callback-form game that refused to start returns a value and never calls back
            if results[1] ~= nil then Finish(results[1]) end
        else
            -- Backdoor perk: rerun a failed game, unless the player quit or died.
            -- Only games in PERK_ARGS: they report quitting through Minigames.cancelled
            -- (or, like brute force, have no quit), so a loss there is a real loss.
            local retries = PERK_ARGS[name] and math.floor(tonumber(perks.retry) or 0) or 0
            while retries > 0 and not IsWin(results[1]) and not Minigames.cancelled and not IsEntityDead(PlayerPedId()) do
                retries = retries - 1
                Notify('Backdoor open - one more try')
                Wait(750)
                results = Run()
            end
            Finish(results[1])
        end
        return table.unpack(results, 1, results.n)
    end
end

-- Proxy the resource's global exports so exports('Name', fn) registers the wrapped fn
local rawExports = exports
exports = setmetatable({}, {
    __index = function(_, key) return rawExports[key] end,
    __newindex = function(_, key, value) rawExports[key] = value end,
    __call = function(_, name, fn)
        if type(fn) == 'function' then
            fn = Wrap(name, fn)
        end
        return rawExports(name, fn)
    end,
})

-- Lock watchdog: a game whose caller stopped (resource restart) or that never
-- finished would otherwise leave the lock on and every later game would fail
-- straight away. Frees it when the calling resource is gone or after MAX_GAME_MS.
local MAX_GAME_MS = 10 * 60 * 1000

local function ReleaseLock(reason)
    if not Minigames.busy then return end
    print(('[glitch-minigames] freed the minigame lock (%s held by %s): %s'):format(
        tostring(Minigames.name), tostring(Minigames.owner), reason))
    Minigames.token = (Minigames.token or 0) + 1   -- the old game's Finish is ignored now
    Minigames.busy = false
    Minigames.cancelled = true
    if HideControls then HideControls() end
    -- end whatever game is still running so the waiting export returns false
    -- (NUI games resolve their promise, drills drop the prop and unfreeze)
    for _, stop in ipairs(Minigames.stopHooks) do
        local ok, err = pcall(stop)
        if not ok then print(('^3[glitch-minigames] stop hook failed: %s^7'):format(tostring(err))) end
    end
    SendNUIMessage({ action = 'forceClose', reason = 'lockReleased' })
end

AddEventHandler('onResourceStop', function(res)
    if Minigames.busy and Minigames.owner == res then ReleaseLock(res .. ' stopped') end
end)

CreateThread(function()
    while true do
        Wait(2000)
        if Minigames.busy then
            local owner = Minigames.owner
            if owner and owner ~= GetCurrentResourceName() and GetResourceState(owner) ~= 'started' then
                ReleaseLock(owner .. ' is not running')
            elseif GetGameTimer() - (Minigames.since or 0) > MAX_GAME_MS then
                ReleaseLock('ran longer than 10 minutes')
            end
        end
    end
end)

-- other client files register non-game exports (no busy lock / XP) through this
Minigames.RawExport = rawExports

-- For other scripts: check before starting a game (registered unwrapped)
rawExports('IsBusy', function()
    return Minigames.busy
end)

-- ox_lib lib.cancelSkillCheck: closes the redirected skill check (fails it)
rawExports('CancelOxSkillCheck', function()
    if Minigames.busy and Minigames.name == 'OxSkillCheck' and Minigames.CancelActive then
        Minigames.CancelActive()
    end
end)
