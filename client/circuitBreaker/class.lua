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

---@source https://github.com/overextended/ox_core/blob/main/shared/class.lua

local Class = {}

-- Private fields are not private in the traditional sense (only accessible to the class/object)
-- Instead it cannot be accessed by other resources (perhaps a new name would be better?)
local private_mt = {
    __ext = 0,
    __pack = function() return '' end,
}

---@generic T
---@param prototype T
---@return { new: fun(obj): T}
function Class.new(prototype)
    local class = {
        __index = prototype
    }

    function class.new(obj)
        if obj.private then
            setmetatable(obj.private, private_mt)
        end

        return setmetatable(obj, class)
    end

    return class
end

return Class