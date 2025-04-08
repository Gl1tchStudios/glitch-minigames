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

local portLights = {}

---Get the light position
---@param portPos vector2
---@param portHeading number
---@param lightNum integer
---@return vector2
local function getLightPosition(portPos, portHeading, lightNum)
    local headingSet = portHeading == 90 or portHeading == 270
    local lightNumOverZero = lightNum > 0
    local angleOffset = headingSet and (lightNumOverZero and 128.75 or 232) or (lightNumOverZero and 73 or 287.25)
    return GetOffsetPosition(portPos, headingSet and 0.0164 or 0.0228, (angleOffset + portHeading) % 360, headingSet and -1 or 1)
end

---Draws the light sprite
---@param position vector2
---@param red integer
---@param green integer
---@param blue integer
---@param alpha? integer
function portLights:DrawLightSprite(position, red, green, blue, alpha)
    alpha = alpha or 255
    DrawSprite('MPCircuitHack', 'Light', position.x, position.y, 0.00775, 0.00775, 0, red, green, blue, alpha)
end

function portLights:DrawLights()
    if self.portType == PortPositionType.Start then
        self:DrawLightSprite(self.light0Position, 45, 203, 134)
        self:DrawLightSprite(self.light1Position, 45, 203, 134)
    else
        if GetGameTimer() - (self.private.lastBlink + 500) >= 0 then
            self.private.alpha = self.private.alpha == 255 and 0 or 255
            self.private.lastBlink = GetGameTimer()
        end

        self:DrawLightSprite(self.light0Position, 188, 49, 43, self.private.alpha)
        self:DrawLightSprite(self.light1Position, 188, 49, 43, self.private.alpha)
    end
end

PortLights = Class.new(portLights)

function newPortLights(portPos, portHeading, _type)
    return PortLights.new({
        light0Position = getLightPosition(portPos, portHeading, 0),
        light1Position = getLightPosition(portPos, portHeading, 1),
        portType = _type,
        private = {
            lastBlink = GetGameTimer(),
            alpha = 255
        }
    })
end

return {
    newPortLights = newPortLights,
    PortLights = PortLights
}