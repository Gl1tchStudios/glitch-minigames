-- Glitch Minigames - XP rewards and hacking perks (server)
--
-- XP amounts come from config.XP only. Three ways a win turns into XP:
--   * server export AwardXP(src, game, won): for resources that validate the
--     result on their own server side. This is the authoritative path.
--   * server-opened sessions: the caller's server script calls
--     OpenXPSession(src, game) when the player reaches a real hack. With
--     config.XP.RequireServerSession = true a client-reported result only
--     counts inside such a session.
--   * client reported (config.XP.ClientReported): the export wrapper in
--     client/core/client.lua asks for a one-time session token when a game
--     starts and hands it back with the result. The server checks the token,
--     the game name, a minimum play time, a cooldown and an hourly cap.
-- Perk values (glitch-xpSystem GetEffect) and the Zero day skip are answered
-- through lib.callback, rate limited per player.

local xpConfig = config.XP or {}
local xpEnabled = xpConfig.Enabled == true
local perkKeys = xpConfig.Perks or {}
local games = xpConfig.Games or {}

local MAX_AWARDS_PER_HOUR = tonumber(xpConfig.MaxAwardsPerHour) or 20
local START_THROTTLE_MS = 1000      -- one xpStart per second per player
local LOOKUP_THROTTLE_MS = 500      -- one perk lookup per half second per player
local ZERO_DAY_THROTTLE_MS = 2000   -- one Zero day attempt per two seconds per player
local SESSION_MAX_MS = 10 * 60 * 1000
local OPEN_SESSION_DEFAULT_S = 120  -- OpenXPSession window when the caller gives none

local sessions = {}    -- [src] = { game = name, startedAt = ms, token = string }
local opened = {}      -- [src] = { [game] = expires ms } (OpenXPSession)
local lastStart = {}   -- [src] = ms
local lastLookup = {}  -- [src] = ms
local lastPerks = {}   -- [src] = perk table from the last lookup (answered while throttled)
local lastZeroDay = {} -- [src] = ms
-- Per character, so a relog resets neither the cooldown nor the cap:
-- awards[identifier] = { last = os.time() of the last award, times = { os.time(), ... } }
-- `times` holds the awards of the last hour (a sliding window, at most MaxAwardsPerHour)
local awards = {}
local HOUR = 3600

local function Count(src, name, ...)
    if MinigamesGuard then MinigamesGuard.Count(src, name, ...) end
end

-- The XP resource has shipped as both glitch-xpSystem and glitch_xpSystem.
-- Exports only resolve under the real resource name, so look it up per call.
local function XPResource()
    for _, res in ipairs(xpConfig.Resources or { xpConfig.Resource }) do
        if GetResourceState(res) == 'started' then return res end
    end
end

-- Returns ok, result. ok is false when the XP resource errored.
local function CallXP(res, fn, ...)
    local ok, result = pcall(exports[res][fn], exports[res], ...)
    if not ok then
        print(('^3[glitch-minigames] %s:%s failed: %s^7'):format(res, fn, tostring(result)))
        return false, nil
    end
    return true, result
end

local function Effect(res, src, key)
    if type(key) ~= 'string' or key == '' then return 0 end
    local _, value = CallXP(res, 'GetEffect', src, key)
    return tonumber(value) or 0
end

-- Character identifier for the hourly cap: qbx_core / qb-core citizenid, ESX
-- identifier, otherwise the licence. Every call is guarded, none is required.
local function CharacterId(src)
    if GetResourceState('qbx_core') == 'started' then
        local ok, player = pcall(function() return exports.qbx_core:GetPlayer(src) end)
        if ok and player and player.PlayerData then return player.PlayerData.citizenid end
    elseif GetResourceState('qb-core') == 'started' then
        local ok, player = pcall(function() return exports['qb-core']:GetCoreObject().Functions.GetPlayer(src) end)
        if ok and player and player.PlayerData then return player.PlayerData.citizenid end
    elseif GetResourceState('es_extended') == 'started' then
        local ok, player = pcall(function() return exports.es_extended:getSharedObject().GetPlayerFromId(src) end)
        if ok and player then return player.identifier end
    end
    return GetPlayerIdentifierByType(src, 'license')
end

local function Throttled(store, src, ms)
    local now = GetGameTimer()
    if store[src] and now - store[src] < ms then return true end
    store[src] = now
    return false
end

-- Cooldown + hourly cap shared by every award path. Returns true when XP was given.
-- The cooldown and the cap are only used up when the XP resource took the award.
local function Award(src, game, won)
    if not xpEnabled then return false end
    local amount = won == true and (tonumber(games[game]) or 0) or (tonumber(xpConfig.FailXP) or 0)
    local res = XPResource()
    if amount <= 0 or not res then return false end

    local id = CharacterId(src)
    if not id then return false end
    local t = os.time()
    local entry = awards[id]
    if not entry then
        entry = { last = 0, times = {} }
        awards[id] = entry
    end
    if t - entry.last < (tonumber(xpConfig.Cooldown) or 0) then return false end

    -- sliding hour: drop the awards older than an hour, then check the cap
    local times, kept = entry.times, 0
    for i = 1, #times do
        if t - times[i] < HOUR then
            kept = kept + 1
            times[kept] = times[i]
        end
    end
    for i = #times, kept + 1, -1 do times[i] = nil end
    if kept >= MAX_AWARDS_PER_HOUR then return false end

    -- glitch-xpSystem returns the XP added (0 with no character loaded); other XP
    -- resources may return nothing, which counts as given
    local ok, added = CallXP(res, 'AddPlayerXP', src, xpConfig.Category, amount)
    if not ok or added == false or added == 0 then return false end

    times[kept + 1] = t
    entry.last = t
    return true
end

-- Server-side award for resources that check the result themselves.
-- exports['glitch-minigames']:AwardXP(source, 'StartBruteForce', true)
exports('AwardXP', function(src, game, won)
    src = tonumber(src)
    if not src or not GetPlayerName(src) then return false end
    if type(game) ~= 'string' or not games[game] then return false end
    return Award(src, game, won == true)
end)

-- Server-opened session: the caller's server script says this player is at a
-- real hack. The next client-reported result for that game within `seconds`
-- (default 120, at most 600) may count. Required for client-reported XP when
-- config.XP.RequireServerSession is true, harmless otherwise.
-- exports['glitch-minigames']:OpenXPSession(source, 'StartBruteForce', 90)
exports('OpenXPSession', function(src, game, seconds)
    src = tonumber(src)
    if not src or not GetPlayerName(src) then return false end
    if type(game) ~= 'string' or not games[game] then return false end
    local window = math.min(tonumber(seconds) or OPEN_SESSION_DEFAULT_S, SESSION_MAX_MS / 1000)
    if window <= 0 then return false end
    opened[src] = opened[src] or {}
    opened[src][game] = GetGameTimer() + window * 1000
    return true
end)

-- Drops an opened session (the hack was aborted on the server side)
exports('CloseXPSession', function(src, game)
    src = tonumber(src)
    if src and opened[src] and type(game) == 'string' then opened[src][game] = nil end
    return true
end)

-- true when a server script opened a session for this game that has not run out
local function TakeOpenedSession(src, game)
    local mine = opened[src]
    local expires = mine and mine[game]
    if not expires then return false end
    mine[game] = nil
    return GetGameTimer() <= expires
end

-- Client-reported path ------------------------------------------------------
if xpEnabled and xpConfig.ClientReported ~= false then
    local requireOpened = xpConfig.RequireServerSession == true

    -- One line at start so owners know which trust mode they run (README: XP and perks)
    if not requireOpened then
        print(('^3[glitch-minigames] XP is client reported: a modified client can claim wins, up to %d awards per character per hour. Set config.XP.RequireServerSession = true or ClientReported = false if hacking XP buys more than perks.^7')
            :format(MAX_AWARDS_PER_HOUR))
    end

    lib.callback.register('glitch-minigames:xpStart', function(src, name)
        Count(src, '__ox_cb_glitch-minigames:xpStart', name)
        if type(name) ~= 'string' or not games[name] then return false end
        if Throttled(lastStart, src, START_THROTTLE_MS) then return false end
        if requireOpened and not TakeOpenedSession(src, name) then return false end
        local token = ('%d-%d-%d'):format(src, GetGameTimer(), math.random(100000, 999999))
        sessions[src] = { game = name, startedAt = GetGameTimer(), token = token }
        return token
    end)

    RegisterNetEvent('glitch-minigames:xpFinish', function(name, won, token)
        local src = source
        Count(src, 'glitch-minigames:xpFinish', name, won, token)
        local session = sessions[src]
        if not session then return end
        sessions[src] = nil   -- one finish per token, whatever happens next
        if session.game ~= name or type(token) ~= 'string' or session.token ~= token then return end

        local played = GetGameTimer() - session.startedAt
        local minSeconds = (xpConfig.MinDurations and xpConfig.MinDurations[name]) or xpConfig.MinDuration or 0
        if played < minSeconds * 1000 or played > SESSION_MAX_MS then return end

        Award(src, name, won == true)
    end)
end

-- Perks ---------------------------------------------------------------------
lib.callback.register('glitch-minigames:getPerks', function(src)
    Count(src, '__ox_cb_glitch-minigames:getPerks')
    local perks = {}
    local res = XPResource()
    if not (xpEnabled and perkKeys.Enabled and res) then return perks end
    -- a second game started right after the first (a retry chain) gets the same
    -- perks instead of none; nothing is read from the XP resource again
    if Throttled(lastLookup, src, LOOKUP_THROTTLE_MS) then
        local cached = lastPerks[src]
        if not cached then return perks end
        -- the cached Zero day flag may already be spent: never offer it twice
        return { time = cached.time, mistakes = cached.mistakes, retry = cached.retry, keylogger = cached.keylogger }
    end

    perks.time = Effect(res, src, perkKeys.Time)
    perks.mistakes = Effect(res, src, perkKeys.Mistakes)
    perks.retry = Effect(res, src, perkKeys.Retry)
    perks.keylogger = Effect(res, src, perkKeys.Keylogger)
    if Effect(res, src, perkKeys.Skip) > 0 then
        local _, can = CallXP(res, 'CanUseDaily', src, perkKeys.Skip)
        perks.zeroday = can == true
    end
    lastPerks[src] = perks
    return perks
end)

-- Zero day perk: spends today's skip (glitch-xpSystem UseDaily)
lib.callback.register('glitch-minigames:zeroDay', function(src)
    Count(src, '__ox_cb_glitch-minigames:zeroDay')
    local res = XPResource()
    if not (xpEnabled and perkKeys.Enabled and res) then return false end
    if Throttled(lastZeroDay, src, ZERO_DAY_THROTTLE_MS) then return false end
    if Effect(res, src, perkKeys.Skip) <= 0 then return false end
    local _, used = CallXP(res, 'UseDaily', src, perkKeys.Skip)
    if used == true and config.DebugPrints then
        print(('[glitch-minigames] %s used Zero day'):format(GetPlayerName(src) or src))
    end
    return used == true
end)

-- Cleanup -------------------------------------------------------------------
AddEventHandler('playerDropped', function()
    local src = source
    sessions[src] = nil
    opened[src] = nil
    lastStart[src] = nil
    lastLookup[src] = nil
    lastPerks[src] = nil
    lastZeroDay[src] = nil
end)

-- Award records are kept per character so a relog resets neither the cooldown
-- nor the cap. Drop the ones with no award in the last hour (and stale opened
-- sessions) every 10 minutes so the tables never grow unbounded.
CreateThread(function()
    while true do
        Wait(10 * 60 * 1000)
        local t = os.time()
        for id, entry in pairs(awards) do
            if t - entry.last >= HOUR then awards[id] = nil end
        end
        local now = GetGameTimer()
        for src, mine in pairs(opened) do
            for game, expires in pairs(mine) do
                if now > expires then mine[game] = nil end
            end
            if next(mine) == nil then opened[src] = nil end
        end
    end
end)
