-- Glitch Minigames - glitch-xpSystem rewards
--
-- The client reports start/finish for each wrapped export (client/core/client.lua).
-- XP amounts come from config only; the client just names the game.

local xpConfig = config.XP
if not xpConfig or not xpConfig.Enabled then return end

local sessions = {}    -- {source = {game = name, startedAt = ms}}
local lastAward = {}   -- {source = ms}

-- The XP resource has shipped as both glitch-xpSystem and glitch_xpSystem.
-- Exports only resolve under the real resource name, so look it up per call.
local function XPResource()
    for _, res in ipairs(xpConfig.Resources or { xpConfig.Resource }) do
        if GetResourceState(res) == 'started' then return res end
    end
end

RegisterNetEvent('glitch-minigames:xpStart', function(name)
    local src = source
    if type(name) ~= 'string' or not xpConfig.Games[name] then return end
    sessions[src] = { game = name, startedAt = GetGameTimer() }
end)

RegisterNetEvent('glitch-minigames:xpFinish', function(name, won)
    local src = source
    local session = sessions[src]
    sessions[src] = nil
    if not session or session.game ~= name then return end

    local amount = won == true and (xpConfig.Games[name] or 0) or (xpConfig.FailXP or 0)
    local res = XPResource()
    if amount <= 0 or not res then return end

    local now = GetGameTimer()
    if now - session.startedAt < (xpConfig.MinDuration or 0) * 1000 then return end
    if lastAward[src] and now - lastAward[src] < (xpConfig.Cooldown or 0) * 1000 then return end
    lastAward[src] = now

    exports[res]:AddPlayerXP(src, xpConfig.Category, amount)
end)

-- Perk values for the client to apply to the next game (client/core/client.lua)
RegisterNetEvent('glitch-minigames:getPerks', function()
    local src = source
    local perks = {}
    local keys = xpConfig.Perks
    local res = XPResource()
    if keys and keys.Enabled and res then
        local xp = exports[res]
        perks.time = xp:GetEffect(src, keys.Time)
        perks.mistakes = xp:GetEffect(src, keys.Mistakes)
        perks.retry = xp:GetEffect(src, keys.Retry)
    end
    TriggerClientEvent('glitch-minigames:perks', src, perks)
end)

AddEventHandler('playerDropped', function()
    sessions[source] = nil
    lastAward[source] = nil
end)
