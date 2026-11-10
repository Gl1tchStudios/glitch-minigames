-- Glitch Minigames
-- Copyright (C) 2024-2026 Glitch Studios
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
-- Circuit breaker modules share one table instead of globals. class.lua is a
-- module (listed under files in fxmanifest) and is loaded once here, so the
-- resource never overrides the global require or package.

CircuitBreaker = {}

do
    local resource = GetCurrentResourceName()
    local path = 'client/circuitBreaker/class.lua'
    local code = LoadResourceFile(resource, path)
    local chunk, err = load(code or '', ('@@%s/%s'):format(resource, path), 't')
    if not code or not chunk then
        error(('[glitch-minigames] could not load %s: %s'):format(path, tostring(err)))
    end
    CircuitBreaker.Class = chunk()
end
