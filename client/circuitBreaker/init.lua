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
---@source https://github.com/overextended/ox_core/blob/main/shared/init.lua

local loaded = {}

package = {
    loaded = setmetatable({}, {
        __index = loaded,
        __newindex = function() end,
        __metatable = false,
    }),
    path = './?.lua;./client/circuitBreaker/?.lua;'
}

local _require = require
local resource = GetCurrentResourceName()

---Loads the given module inside the current resource, returning any values returned by the file or `true` when `nil`.
---@param modname string
---@return unknown
function require(modname)
    local module = loaded[modname]

    if not module then
        if module == false then
            error(("^1circular-dependency occurred when loading module '%s'^0"):format(modname), 2)
        end

        local success, result = pcall(_require, modname)

        if success then
            loaded[modname] = result
            return result
        end

        local modpath = modname:gsub('%.', '/')
        local paths = { string.strsplit(';', package.path) }

        for i = 1, #paths do
            local scriptPath = paths[i]:gsub('%?', modpath):gsub('%.+%/+', '')
            local resourceFile = LoadResourceFile(resource, scriptPath)

            if resourceFile then
                loaded[modname] = false
                scriptPath = ('@@%s/%s'):format(resource, scriptPath)

                local chunk, err = load(resourceFile, scriptPath)

                if err or not chunk then
                    loaded[modname] = nil
                    return error(err or ("unable to load module '%s'"):format(modname), 3)
                end

                module = chunk(modname) or true
                loaded[modname] = module

                return module
            end
        end

        return error(("module '%s' not found"):format(modname), 2)
    end

    return module
end