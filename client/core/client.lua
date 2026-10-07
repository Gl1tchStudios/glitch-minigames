-- Glitch Minigames - core export hook
--
-- Loaded before every other client file. Every function the resource exports
-- goes through Wrap(), which adds:
--   * one shared busy lock: only one minigame (NUI, scaleform or drill) at a time
--   * XP reporting to the server for games listed in config.XP.Games
--   * Hacking perks from glitch-xpSystem (extra time, extra mistakes, retry)
--   * per-game style: a trailing { colour, theme, keybinds } table (client/core/style.lua)
-- Arguments and return values otherwise pass through untouched.

Minigames = {
    busy = false,      -- a minigame is running
    cancelled = false, -- set by the cancel key / death handlers in customMinigames/client.lua
}

local xpConfig = config.XP or {}
local xpEnabled = xpConfig.Enabled == true
local perksEnabled = xpEnabled and xpConfig.Perks and xpConfig.Perks.Enabled == true

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
    if config.usingGlitchNotifications and GetResourceState('glitch-notifications') == 'started' then
        exports['glitch-notifications']:ShowNotification('Hacking', text, 3000, '#A855F7')
    else
        BeginTextCommandThefeedPost('STRING')
        AddTextComponentSubstringPlayerName(text)
        EndTextCommandThefeedPostTicker(false, false)
    end
end

-- Perk values come from the server (glitch-xpSystem GetEffect). One request per game start.
local pendingPerks = nil

RegisterNetEvent('glitch-minigames:perks', function(perks)
    if pendingPerks then
        pendingPerks:resolve(type(perks) == 'table' and perks or {})
    end
end)

local function FetchPerks()
    local p = promise.new()
    pendingPerks = p
    TriggerServerEvent('glitch-minigames:getPerks')
    SetTimeout(1000, function()
        if pendingPerks == p then p:resolve({}) end
    end)
    local perks = Citizen.Await(p)
    pendingPerks = nil
    return perks
end

local function AddBonus(args, slot, bonus)
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

local function Wrap(name, fn)
    local reportXP = xpEnabled and xpConfig.Games and xpConfig.Games[name] ~= nil

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
        local perks = perksEnabled and reportXP and FetchPerks() or {}
        ApplyPerks(name, args, perks)

        if reportXP then
            TriggerServerEvent('glitch-minigames:xpStart', name)
        end
        if Style then Style.Apply(styleOpts) end            -- defaults unless overridden for this game
        if ShowControls then ShowControls(name, args) end   -- controls HUD on the left (client/core/controls.lua)

        local function Finish(result)
            -- a lock the watchdog already freed may belong to a newer game by now
            if Minigames.token ~= token then return end
            Minigames.busy = false
            if HideControls then HideControls() end
            if reportXP then
                TriggerServerEvent('glitch-minigames:xpFinish', name, IsWin(result))
            end
        end

        -- Async form (StartPlasmaDrilling with a callback): finish when the callback fires
        local async = false
        for i = 1, args.n do
            local userCb = args[i]
            if type(userCb) == 'function' then
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

-- For other scripts: check before starting a game (registered unwrapped)
rawExports('IsBusy', function()
    return Minigames.busy
end)
