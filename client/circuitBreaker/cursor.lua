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

local cursor = {}

---@param direction Directions
---@param cursorSpeed number
function cursor:setPosition(direction, cursorSpeed)
    if direction == Directions.Up then
        self.position = vec2(self.position.x, self.position.y - cursorSpeed)
    elseif direction == Directions.Down then
        self.position = vec2(self.position.x, self.position.y + cursorSpeed)
    elseif direction == Directions.Left then
        self.position = vec2(self.position.x - cursorSpeed, self.position.y)
    elseif direction == Directions.Right then
        self.position = vec2(self.position.x + cursorSpeed, self.position.y)
    end

    self.position = vec2(math.clamp(self.position.x, 0, 1), math.clamp(self.position.y, 0, 1))
end

---@param direction Directions
---@param cursorSpeed number
function cursor:DebugCursorPosition(direction, cursorSpeed)
    self:setPosition(direction, cursorSpeed)
end

---@param cursorSpeed number
function cursor:setNewCursorPosition(cursorSpeed)
    self:setPosition(self.lastDirection, cursorSpeed)
end

function cursor:setCursorStartPosition(gamePorts)
    local magnitude = (gamePorts.startPortHeading == 0 or gamePorts.startPortHeading == 180) and 0.0144 or 0.0210
    self.position = GetOffsetPosition(gamePorts.startPortPos, magnitude, gamePorts.startPortHeading, 1)
end

function cursor:updateAlpha()
    if self.isAlive then return end
    self.private.alpha = math.clamp(self.private.alpha - 5, 0, 255)

    if self.private.alpha ~= 0 then return end
    self.isVisible = false
end

function cursor:StartCursorDeathAnimation()
    CreateThread(function()
        while self.private.alpha > 0 do
            self:updateAlpha()
            Wait(20)
        end
    end)
end

function cursor:GetCursorInputFromPlayer()
    local newDirection = self.lastDirection
    local lastPos = self.position

    if IsDisabledControlPressed(0, 34) then -- INPUT_MOVE_LEFT_ONLY
        newDirection = Directions.Left
    elseif IsDisabledControlPressed(0, 35) then -- INPUT_MOVE_RIGHT_ONLY
        newDirection = Directions.Right
    elseif IsDisabledControlPressed(0, 32) then -- INPUT_MOVE_UP_ONLY
        newDirection = Directions.Up
    elseif IsDisabledControlPressed(0, 33) then -- INPUT_MOVE_DOWN_ONLY
        newDirection = Directions.Down
    end

    if newDirection == self.lastDirection then return end

    self.lastDirection = newDirection
    self.private.history[#self.private.history + 1] = lastPos
    PlaySoundFrontend(-1, 'Click', 'DLC_HEIST_HACKING_SNAKE_SOUNDS', true)
end

function cursor:CheckTailCollision()
    for i = 1, #self.private.history do
        local distance, xDelta, yDelta, centerPoint
        local data = self.private.history[i]
        if i == #self.private.history then
            distance = #(self.position - data)
            xDelta = self.position.x - data.x
            yDelta = self.position.y - data.y

            if math.abs(xDelta) > math.abs(yDelta) then
                centerPoint = xDelta < 0 and vec2(self.position.x + distance / 2, self.position.y) or vec2(self.position.x - distance / 2, self.position.y)
            else
                centerPoint = yDelta < 0 and vec2(self.position.x, self.position.y + distance / 2) or vec2(self.position.x, self.position.y - distance / 2)
            end
        else
            local data2 = self.private.history[i + 1]
            distance = #(data - data2)
            xDelta = data2.x - data.x
            yDelta = data2.y - data.y

            if math.abs(xDelta) > math.abs(yDelta) then
                centerPoint = xDelta < 0 and vec2(data2.x + distance / 2, data2.y) or vec2(data2.x - distance / 2, data2.y)
            else
                centerPoint = yDelta < 0 and vec2(data2.x, data2.y + distance / 2) or vec2(data2.x, data2.y - distance / 2)
            end
        end

        if math.abs(xDelta) > math.abs(yDelta) then
            if math.round(self.position.x, 4) > math.round(centerPoint.x - distance / 2, 4) and math.round(self.position.x, 4) < math.round(centerPoint.x + distance / 2, 4) and math.abs(self.position.y - centerPoint.y) <= 0.006 then
                return true
            end
        else
            if math.round(self.position.y, 4) > math.round(centerPoint.y - distance / 2, 4) and math.round(self.position.y, 4) < math.round(centerPoint.y + distance / 2, 4) and math.abs(self.position.x - centerPoint.x) <= 0.006 then
                return true
            end
        end
    end
    return false
end

---Sets the start direction
---@param startHeading number
function cursor:SetStartDirection(startHeading)
    if startHeading == 0 then
        self.lastDirection = Directions.Right
    elseif startHeading == 90 then
        self.lastDirection = Directions.Down
    elseif startHeading == 180 then
        self.lastDirection = Directions.Left
    else
        self.lastDirection = Directions.Up
    end
end

---Moves the cursor
---@param cursorSpeed number
function cursor:MoveCursor(cursorSpeed)
    self:setNewCursorPosition(cursorSpeed)
end

function cursor:DrawTailHistory()
    for i = 1, #self.private.history do
        local distance, xDelta, yDelta, centerPoint
        local data = self.private.history[i]
        if i == #self.private.history then
            distance = #(self.position - data)
            xDelta = self.position.x - data.x
            yDelta = self.position.y - data.y

            if math.abs(xDelta) > math.abs(yDelta) then
                centerPoint = xDelta < 0 and vec2(self.position.x + distance / 2, self.position.y) or vec2(self.position.x - distance / 2, self.position.y)
            else
                centerPoint = yDelta < 0 and vec2(self.position.x, self.position.y + distance / 2) or vec2(self.position.x, self.position.y - distance / 2)
            end
        else
            local data2 = self.private.history[i + 1]
            distance = #(data - data2)
            xDelta = data2.x - data.x
            yDelta = data2.y - data.y

            if math.abs(xDelta) > math.abs(yDelta) then
                centerPoint = xDelta < 0 and vec2(data2.x + distance / 2, data2.y) or vec2(data2.x - distance / 2, data2.y)
            else
                centerPoint = yDelta < 0 and vec2(data2.x, data2.y + distance / 2) or vec2(data2.x, data2.y - distance / 2)
            end
        end

        if math.abs(xDelta) > math.abs(yDelta) then
            if HasCircuitFailed then
                DrawSprite('MPCircuitHack', 'Tail', centerPoint.x, centerPoint.y, distance + 0.0018, 0.003, 0, 188, 49, 43, self.private.alpha)
            else
                DrawSprite('MPCircuitHack', 'Tail', centerPoint.x, centerPoint.y, distance + 0.0018, 0.003, 0, 45, 203, 134, self.private.alpha)
            end
        else
            if HasCircuitFailed then
                DrawSprite('MPCircuitHack', 'Tail', centerPoint.x, centerPoint.y, 0.0018, distance + 0.001, 0, 188, 49, 43, self.private.alpha)
            else
                DrawSprite('MPCircuitHack', 'Tail', centerPoint.x, centerPoint.y, 0.0018, distance + 0.001, 0, 45, 203, 134, self.private.alpha)
            end
        end
    end
end

function cursor:DrawCursor()
    if not self.isAlive then
        DrawSprite('MPCircuitHack', 'Spark', self.position.x, self.position.y, 0.0125, 0.0125, 0, 255, 255, 255, self.private.alpha)
    end

    if HasCircuitFailed then
        DrawSprite('MPCircuitHack', 'Head', self.position.x, self.position.y, self.cursorHeadSize, self.cursorHeadSize, 0, 188, 49, 43, self.private.alpha)
    else
        DrawSprite('MPCircuitHack', 'Head', self.position.x, self.position.y, self.cursorHeadSize, self.cursorHeadSize, 0, 45, 203, 134, self.private.alpha)
    end
end

Cursor = Class.new(cursor)

---@param gamePorts table
---@return table
function newCursor(gamePorts)
    local cur = Cursor.new({
        cursorHeadSize = 0.0125,
        isAlive = true,
        isVisible = true,
        lastDirection = Directions.Right,
        position = vec2(0),
        private = {
            history = {gamePorts.startPortPos},
            alpha = 255
        }
    })
    cur:setCursorStartPosition(gamePorts)
    cur:SetStartDirection(gamePorts.startPortHeading)
    return cur
end