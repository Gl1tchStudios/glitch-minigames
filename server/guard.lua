-- Glitch Minigames - optional net event reporting (server)
--
-- glitch-poolcleaning (Glitch Studios anticheat) counts the net events each
-- player sends and flags floods and malformed arguments. This resource reports
-- its own entry points (the xpFinish event and the lib.callback handlers in
-- server/xp.lua) through the same server-only local event that glitch-poolcleaning
-- listens to. No code from another resource is loaded or run here.
-- Without glitch-poolcleaning, or with config.NetGuard = false, Count() does nothing.

local GUARD_RESOURCE = 'glitch-poolcleaning'
local REPORT = GUARD_RESOURCE .. ':netcount'
local RES = GetCurrentResourceName()
local MAX_BAD = 50          -- malformed-argument reports kept per second
local MAX_ARGS = 16         -- arguments checked per event

local state = GetResourceState(GUARD_RESOURCE)
-- rawget(_G, '__glitchGuard'): glitch-poolcleaning's own include is already in this
-- resource's manifest and counts every net event, so do not count twice
local enabled = config.NetGuard ~= false and state ~= 'missing' and state ~= 'unknown'
    and not rawget(_G, '__glitchGuard')
local maxString = 32768
local counts, bad, pending = {}, {}, false

MinigamesGuard = {}

local function CheckArgs(...)
    local n = select('#', ...)
    for i = 1, math.min(n, MAX_ARGS) do
        local v = select(i, ...)
        local t = type(v)
        if t == 'number' then
            if v ~= v then return ('argument %d is NaN'):format(i) end
            if v == math.huge or v == -math.huge then return ('argument %d is infinite'):format(i) end
        elseif t == 'string' and #v > maxString then
            return ('argument %d is a %d character string'):format(i, #v)
        end
    end
end

-- Count one net event from a player. Never blocks: the handler always runs.
function MinigamesGuard.Count(src, name, ...)
    if not enabled then return end
    src = tonumber(src)
    if not src or src <= 0 then return end
    local c = counts[src]
    if not c then c = {} counts[src] = c end
    c[name] = (c[name] or 0) + 1
    local why = CheckArgs(...)
    if why and #bad < MAX_BAD then bad[#bad + 1] = { src, name, why } end
    pending = true
end

if not enabled then return end

-- Counts go out once a second, only when something was counted
CreateThread(function()
    while true do
        Wait(1000)
        if pending then
            local c, b = counts, bad
            counts, bad, pending = {}, {}, false
            if GetResourceState(GUARD_RESOURCE) == 'started' then
                TriggerEvent(REPORT, RES, c, b)
            end
        end
    end
end)

-- The string length limit lives in glitch-poolcleaning; ask for it once a minute
CreateThread(function()
    while true do
        if GetResourceState(GUARD_RESOURCE) == 'started' then
            local ok, s = pcall(function() return exports[GUARD_RESOURCE]:NetGuardSettings() end)
            if ok and type(s) == 'table' and tonumber(s.maxStringLength) then
                maxString = tonumber(s.maxStringLength)
            end
        end
        Wait(60000)
    end
end)
