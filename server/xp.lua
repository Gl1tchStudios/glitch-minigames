-- Glitch Minigames - glitch_xpSystem rewards
--
-- The client reports start/finish for each wrapped export (client/core/client.lua).
-- XP amounts come from config only; the client just names the game.

local xpConfig = config.XP
if not xpConfig or not xpConfig.Enabled then return end

local sessions = {}    -- {source = {game = name, startedAt = ms}}
local lastAward = {}   -- {source = ms}

local function XPAvailable()
    return GetResourceState(xpConfig.Resource) == 'started'
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
    if amount <= 0 or not XPAvailable() then return end

    local now = GetGameTimer()
    if now - session.startedAt < (xpConfig.MinDuration or 0) * 1000 then return end
    if lastAward[src] and now - lastAward[src] < (xpConfig.Cooldown or 0) * 1000 then return end
    lastAward[src] = now

    exports[xpConfig.Resource]:AddPlayerXP(src, xpConfig.Category, amount)
end)

-- Perk values for the client to apply to the next game (client/core/client.lua)
RegisterNetEvent('glitch-minigames:getPerks', function()
    local src = source
    local perks = {}
    local keys = xpConfig.Perks
    if keys and keys.Enabled and XPAvailable() then
        local xp = exports[xpConfig.Resource]
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
