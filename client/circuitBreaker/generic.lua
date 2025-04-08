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

local Class = require 'class'

local generic = {}

---Gets the port position bounds.
---@param mapNumber integer
---@return vector2[][]
local function getPortPositionBounds(mapNumber)
    if mapNumber == 1 then
        return {
            {
                vec2(0.169, 0.613),
                vec2(0.169, 0.816)
            },
            {
                vec2(0.179, 0.837),
                vec2(0.284, 0.837)
            },
            {
                vec2(0.833, 0.181),
                vec2(0.833, 0.277)
            },
            {
                vec2(0.751, 0.163),
                vec2(0.823, 0.163)
            }
        }
    elseif mapNumber == 2 then
        return {
            {
                vec2(0.169, 0.673),
                vec2(0.169, 0.818)
            },
            {
                vec2(0.18, 0.838),
                vec2(0.297, 0.838)
            },
            {
                vec2(0.832, 0.181),
                vec2(0.832, 0.324)
            },
            {
                vec2(0.778, 0.16),
                vec2(0.821, 0.16)
            }
        }
    elseif mapNumber == 3 then
        return {
            {
                vec2(0.166, 0.182),
                vec2(0.166, 0.263)
            },
            {
                vec2(0.166, 0.745),
                vec2(0.166, 0.816)
            },
            {
                vec2(0.18, 0.837),
                vec2(0.31, 0.837)
            },
            {
                vec2(0.184, 0.164),
                vec2(0.277, 0.164)
            }
        }
    elseif mapNumber == 4 then
        return {
            {
                vec2(0.169, 0.628),
                vec2(0.169, 0.817)
            },
            {
                vec2(0.183, 0.838),
                vec2(0.259, 0.838)
            },
            {
                vec2(0.833, 0.186),
                vec2(0.833, 0.359)
            },
            {
                vec2(0.797, 0.161),
                vec2(0.819, 0.161)
            }
        }
    elseif mapNumber == 5 then
        return {
            {
                vec2(0.832, 0.742),
                vec2(0.832, 0.811)
            },
            {
                vec2(0.761, 0.839),
                vec2(0.821, 0.839)
            },
            {
                vec2(0.169, 0.184),
                vec2(0.169, 0.383)
            },
            {
                vec2(0.184, 0.162),
                vec2(0.234, 0.162)
            }
        }
    elseif mapNumber == 6 then
        return {
            {
                vec2(0.167, 0.183),
                vec2(0.167, 0.3)
            },
            {
                vec2(0.18, 0.162),
                vec2(0.214, 0.162),
            },
            {
                vec2(0.833, 0.186),
                vec2(0.833, 0.282)
            },
            {
                vec2(0.768, 0.161),
                vec2(0.82, 0.161)
            }
        }
    end

    return {}
end

---Gets the random port position.
---@param portBounds vector2[]
---@return vector2
local function getRandomPortPosition(portBounds)
    if not portBounds or #portBounds < 2 then
        error(('[Generic] portBounds not formatted, count: %s'):format(#portBounds))
        return vec2(0)
    end

    local portX = math.random(math.round(portBounds[1].x * 1000, -1), math.round(portBounds[2].x * 1000, -1)) / 1000
    local portY = math.random(math.round(portBounds[1].y * 1000, -1), math.round(portBounds[2].y * 1000, -1)) / 1000

    return vec2(portX, portY)
end

---Gets the port heading.
---@param portPosition vector2
---@return number
local function getPortHeading(portPosition)
    local minX = 0.159
    local maxX = 0.841
    local minY = 0.153
    local maxY = 0.848
    local xBounds = {minX, maxX}
    local yBounds = {minY, maxY}

    table.sort(xBounds, function(a, b)
        local x1 = math.abs(portPosition.x - a)
        local x2 = math.abs(portPosition.x - b)
        return x1 < x2
    end)

    table.sort(yBounds, function(a, b)
        local y1 = math.abs(portPosition.y - a)
        local y2 = math.abs(portPosition.y - b)
        return y1 < y2
    end)

    local closestX = xBounds[1]
    local closestY = yBounds[1]

    if math.abs(portPosition.x - closestX) < math.abs(portPosition.y - closestY) then
        return math.abs(closestX - minX) < math.abs(closestX - maxX) and 0 or 180
    end

    return math.abs(closestY - minY) < math.abs(closestY - maxY) and 90 or 270
end

---Gets the finish port position.
---@param levelNumber integer
---@param startPortPosition vector2
---@return vector2
local function getFinishPortPosition(levelNumber, startPortPosition)
    local potentialPortBounds = getPortPositionBounds(levelNumber)
    local maxDist = 0
    local endPos = vec2(0)
    for i = 1, #potentialPortBounds do
        local potentialPos = vec2(0)
        while potentialPos == vec2(0) do
            potentialPos = getRandomPortPosition(potentialPortBounds[i])
        end

        local startEndDistance = #(startPortPosition - potentialPos)
        if startEndDistance > maxDist then
            maxDist = startEndDistance
            endPos = potentialPos
        end
    end

    return endPos
end

---Gets the start port position
---@param levelNumber integer
---@return vector2
local function getStartPortPosition(levelNumber)
    local potentialPortBounds = getPortPositionBounds(levelNumber)
    if table.type(potentialPortBounds) == 'empty' then return vec2(0) end

    local startPortBounds = potentialPortBounds[math.random(1, #potentialPortBounds)]
    local startPos = vec2(0)
    local attempts = 20
    while startPos == vec2(0) and attempts > 0 do
        startPos = getRandomPortPosition(startPortBounds)
        attempts -= 1
    end

    return startPos
end

---@return vector2[]
function generic:getWinBounds()
    local headingSet = self.finishPortHeading == 0 or self.finishPortHeading == 180
    local multiplier = headingSet and 1 or -1
    local magnitudeAngleOffsetPairs = headingSet and {
        {0.0278, 70.25},
        {0.02807, 289.5},
        {0.02708, 282},
        {0.02665, 77.75}
    } or {
        {0.02088, 228.5},
        {0.01827, 238.75},
        {0.01806, 121.75},
        {0.02061, 131.75}
    }
    local portBounds = {}
    for i = 1, #magnitudeAngleOffsetPairs do
        local data = magnitudeAngleOffsetPairs[i]
        portBounds[i] = GetOffsetPosition(self.finishPortPos, data[1], (self.finishPortHeading + data[2]) % 360, multiplier)
    end

    return portBounds
end

---Gets the port collision bounds.
---@param position vector2
---@param heading number
---@param isStartPort boolean
---@return vector2[]
local function getPortCollisionBounds(position, heading, isStartPort)
    local magnitude, multiplier, angles
    if heading == 0 or heading == 180 then
        magnitude = isStartPort and 0.0279 or 0.0266
        angles = isStartPort and {289.75, 250.75, 109.75, 70} or {277.75, 259.25, 100.75, 82.5}
        multiplier = 1
    else
        magnitude = isStartPort and 0.0211 or 0.0173
        angles = isStartPort and {313.25, 227.75, 132.25, 48.5} or {111, 66.5, 293.25, 249.25}
        multiplier = -1
    end

    local portBounds = {}
    for i = 1, #angles do
        local angle = angles[i]
        portBounds[i] = GetOffsetPosition(position, magnitude, (heading + angle) % 360, multiplier)
    end

    return portBounds
end

---Draws the port sprite
---@param position vector2
---@param heading number
local function drawPortSprite(position, heading)
    local headingSet = heading == 0 or heading == 180
    local portWidth = headingSet and 0.02 or 0.0325
    local portHeight = headingSet and 0.055 or 0.03
    DrawSprite('MPCircuitHack', 'GenericPort', position.x, position.y, portWidth, portHeight, heading, 255, 255, 255, 255)
end

---Determines whether the specified cursor is in the game winning position.
---@param cursorPosition vector2
---@return boolean
function generic:IsCursorInGameWinningPosition(cursorPosition)
    return IsInPoly(self.winBounds, cursorPosition)
end

---Determines wether the specified cursor position is colliding with port
---@param cursorPosition vector2
---@return boolean
function generic:IsCollisionWithPort(cursorPosition)
    return IsInPoly(self.startPortBounds, cursorPosition) or IsInPoly(self.finishPortBounds, cursorPosition) and self:IsCursorInGameWinningPosition(cursorPosition)
end

function generic:DrawPorts()
    if self.startPortPos == vec2(0) or self.finishPortPos == vec2(0) or self.startPortHeading == -1 or self.finishPortHeading == -1 then
        error(('[Generic] error setting position and heading. %s, %s, %s, %s'):format(self.startPortPos, self.startPortHeading, self.finishPortPos, self.finishPortHeading))
        return
    end

    drawPortSprite(self.startPortPos, self.startPortHeading)
    drawPortSprite(self.finishPortPos, self.finishPortHeading)

    self.startPortLights:DrawLights()
    self.finishPortLights:DrawLights()
end

Generic = Class.new(generic)

---@param levelNumber integer
---@return table
function newGeneric(levelNumber)
    local startPortPos = getStartPortPosition(levelNumber)
    local finishPortPos = getFinishPortPosition(levelNumber, startPortPos)
    local startPortHeading = getPortHeading(startPortPos)
    local finishPortHeading = getPortHeading(finishPortPos)
    local gen = Generic.new({
        startPortPos = startPortPos,
        finishPortPos = finishPortPos,
        startPortHeading = startPortHeading,
        finishPortHeading = finishPortHeading,
        startPortLights = newPortLights(startPortPos, startPortHeading, PortPositionType.Start),
        finishPortLights = newPortLights(finishPortPos, finishPortHeading, PortPositionType.Finish),
        startPortBounds = {},
        finishPortBounds = {},
        winBounds = {}
    })

    gen.startPortBounds = getPortCollisionBounds(startPortPos, startPortHeading, true)
    gen.finishPortBounds = getPortCollisionBounds(finishPortPos, finishPortHeading, false)
    gen.winBounds = gen:getWinBounds()

    return gen
end

return {
    newGeneric = newGeneric,
    Generic = Generic
}