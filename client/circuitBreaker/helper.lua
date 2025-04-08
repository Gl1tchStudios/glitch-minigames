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

---A function to get the x variable of a table, used in IsInPoly
---@param tbl vector2
---@return number
local function getX(tbl)
    return tbl.x
end

---A function to get the y variable of a table, used in IsInPoly
---@param tbl vector2
---@return number
local function getY(tbl)
    return tbl.y
end

---Gets the minimum value in a vector2 array
---@param tbl vector2[]
---@param getValue fun(thisTable: vector2): number
---@return number
local function min(tbl, getValue)
    local minValue
    for i = 1, #tbl do
        local value = getValue(tbl[i])
        minValue = not minValue and value or value < minValue and value or minValue
    end
    return minValue
end

---Gets the maximum value in a vector2 array
---@param tbl vector2[]
---@param getValue fun(thisTable: vector2): number
---@return number
local function max(tbl, getValue)
    local maxValue
    for i = 1, #tbl do
        local value = getValue(tbl[i])
        maxValue = not maxValue and value or value > maxValue and value or maxValue
    end
    return maxValue
end

---Determines whether the point is inside the given polygon
---@param poly vector2[]
---@param point vector2
---@return boolean
function IsInPoly(poly, point)
    local minX = min(poly, getX)
    local minY = min(poly, getY)
    local maxX = max(poly, getX)
    local maxY = max(poly, getY)

    if point.x < minX or point.x > maxX or point.y < minY or point.y > maxY then
        return false
    end

    local isMatch = false

    local j = #poly
    for i = 1, #poly do
        local data = poly[i]
        local data2 = poly[j]

        -- When the position is right on a point, count it as a match.
        if data.x == point.x and data.y == point.y then
            return true
        end

        -- When the position is right on a point, count it as a match.
        if data2.x == point.x and data2.y == point.y then
            return true
        end

        -- When the position is on a horizontal line, count it as a match.
        if data.x == data2.x and point.x == data.x and point.y >= math.min(data.y, data2.y) and point.y <= math.max(data.y, data2.y) then
            return true
        end

        -- When the position is on a vertical line, count it as a match.
        if data.y == data2.y and point.y == data.y and point.x >= math.min(data.x, data2.x) and point.x <= math.max(data.x, data2.x) then
            return true
        end

        if ((data.y > point.y) ~= (data2.y > point.y)) and point.x < ((data2.x - data.x) * (point.y - data.y) / (data2.y - data.y) + data.x) then
            isMatch = not isMatch
        end

        j = i
    end

    return isMatch
end

---Gets the 2d offset position relative to the start position
---@param startPosition vector2
---@param magnitude number
---@param heading number
---@param multiplier integer
---@return vector2
function GetOffsetPosition(startPosition, magnitude, heading, multiplier)
    local degree = math.pi / 180
    local headingDegrees = heading * degree
    local cosX = multiplier * math.cos(headingDegrees)
    local sinY = multiplier * math.sin(headingDegrees)
    return vec2(startPosition.x + magnitude * cosX, startPosition.y + magnitude * sinY)
end

---@return integer
function GetDebugCursorDirectionInput()
    local newDirection = -1

    if IsDisabledControlPressed(0, 34) then -- INPUT_MOVE_LEFT_ONLY
        newDirection = Directions.Left
    elseif IsDisabledControlPressed(0, 35) then -- INPUT_MOVE_RIGHT_ONLY
        newDirection = Directions.Right
    elseif IsDisabledControlPressed(0, 32) then -- INPUT_MOVE_UP_ONLY
        newDirection = Directions.Up
    elseif IsDisabledControlPressed(0, 33) then -- INPUT_MOVE_DOWN_ONLY
        newDirection = Directions.Down
    end

    return newDirection
end

---@return number
function GetDebugCursorSpeedInput()
    local debugCursorSpeed = 0

    if IsControlPressed(0, 127) then -- INPUT_VEH_SUB_PITCH_UP_ONLY
        debugCursorSpeed = 0.00025
    elseif IsControlPressed(0, 128) then -- INPUT_VEH_SUB_PITCH_DOWN_ONLY
        debugCursorSpeed = -0.00025
    end

    return debugCursorSpeed
end

---@param spriteName string
---@param position vector2
---@param heading number
---@param width number
---@param height number
function DrawDebugSprite(spriteName, position, heading, width, height)
    DrawSprite('MPCircuitHack', spriteName, position.x, position.y, width, height, heading, 255, 255, 255, 255)
end

---@param position vector2
---@param heading number
function DebugPortSprite(position, heading)
    local width = (heading == 0 or heading == 180) and 0.02 or 0.0325
    local height = (heading == 0 or heading == 180) and 0.055 or 0.03
    DrawDebugSprite('GenericPort', position, heading, width, height)
    DrawRect(position.x, position.y, 0.005, 0.01, 20, 255, 20, 255)
end

function GetPortDebugHeading(currentHeading)
    if IsControlPressed(0, 124) then -- INPUT_VEH_SUB_TURN_LEFT_ONLY
        currentHeading -= 90
    elseif IsControlPressed(0, 125) then -- INPUT_VEH_SUB_TURN_RIGHT_ONLY
        currentHeading += 90
    end

    return currentHeading
end