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

---@enum Difficulty
Difficulty = {
    Beginner = 0,
    Easy = 1,
    Medium = 2,
    Hard = 3
}

---@enum Directions
Directions = {
    Up = 0,
    Down = 1,
    Left = 2,
    Right = 3
}

---@enum GameStatus
GameStatus = {
    Error = -5,
    FailedToStart = -4,
    MissingHackKit = -3,
    TakingDamage = -2,
    Failure = -1,
    PlayerQuit = 0,
    Success = 1
}

---@enum PortPositionType
PortPositionType = {
    Start = 0,
    Finish = 1
}

---Clamp a value to a min and max value
---@param value number
---@param min number
---@param max number
---@return number
function math.clamp(value, min, max)
    return value < min and min or value > max and max or value
end

---Round a number to the specified decimal point
---@param number number
---@param decimalPoint number
---@return number
function math.round(number, decimalPoint)
    local multiplier = 10 ^ (decimalPoint or 0)
    return math.floor(number * multiplier + 0.5) / multiplier
end