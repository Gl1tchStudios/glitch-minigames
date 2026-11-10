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

-- Data Crack: seven columns slide up and down; click while the highlighted one
-- sits in the sweet spot to lock it and move on, a miss steps back one column.
-- Lock all seven to win. One thread per game does input, motion and drawing.

local COLUMN_COUNT = 7
local COLUMN_X0, COLUMN_DX = 0.35, 0.05     -- screen x of column 1 and the gap between columns
local Y_TOP, Y_BOTTOM = 0.744, 0.4          -- the range a column slides through
local Y_LOCKED = 0.572                      -- where a locked (or stepped back) column rests
local SWEET_MIN, SWEET_MAX = 0.51, 0.62     -- a click inside this range locks the column
local SUCCESS_SCREEN_MS = 2500

local INPUT_CLICK = 237   -- INPUT_CURSOR_ACCEPT (control group 2)
local INPUT_ABORT = 202   -- INPUT_FRONTEND_CANCEL (control group 2)

-- Blocked for the whole game (group 0), plus the pause menu on group 2
local BLOCKED_CONTROLS = {
    24, 257, 25, 263, 32, 34, 31, 30, 45, 22, 44, 37, 23, 288, 289, 170, 167, 73, 47, 264, 140, 141, 142, 143,
}

local active = false        -- a Data Crack game is in progress (for the lock watchdog)
local stopRequested = false -- set by the lock watchdog: end the game as a fail

-- Slide speed per column: later columns move faster
local function NewColumns()
    local columns = {}
    for i = 1, COLUMN_COUNT do
        columns[i] = {
            y = Y_BOTTOM,
            speed = (0.02 + 0.005 * (i - 1)) * 0.55,
            phase = 0.0,       -- 0..1 position along the slide
            rising = true,     -- phase direction
            highlighted = false, -- the column the player is working on
            moving = true,     -- false once locked
        }
    end
    return columns
end

-- Cosine ease between a and b, t from 0 to 1
local function Ease(a, b, t)
    local n = (1.0 - math.cos(t * math.pi)) * 0.5
    return a * (1 - n) + b * n
end

local function InSweetSpot(column)
    return column.y >= SWEET_MIN and column.y <= SWEET_MAX
end

local function DrawHelp(text)
    BeginTextCommandDisplayHelp('STRING')
    AddTextComponentSubstringPlayerName(text)
    EndTextCommandDisplayHelp(0, false, true, -1)
end

local function DisableControls()
    for i = 1, #BLOCKED_CONTROLS do
        DisableControlAction(0, BLOCKED_CONTROLS[i], true)
    end
    DisableControlAction(2, 199, true)
end

local function ReleaseAssets(scaleform)
    if scaleform then SetScaleformMovieAsNoLongerNeeded(scaleform) end
    SetStreamedTextureDictAsNoLongerNeeded('hackingNG')
    SetStreamedTextureDictAsNoLongerNeeded('HACKING_PC_desktop_0')
end

-- Loads the HACKING_PC movie and the sprites. Returns the scaleform, or nil when
-- it did not load in time or the game was stopped while loading.
local function LoadAssets()
    RequestStreamedTextureDict('HACKING_PC_desktop_0', false)
    RequestStreamedTextureDict('hackingNG', false)
    local scaleform = RequestScaleformMovieInteractive('HACKING_PC')

    local deadline = GetGameTimer() + 5000
    while not HasScaleformMovieLoaded(scaleform) do
        if GetGameTimer() > deadline or stopRequested then
            ReleaseAssets(scaleform)
            return nil
        end
        Wait(0)
    end

    PushScaleformMovieFunction(scaleform, 'ADD_PROGRAM')
    PushScaleformMovieFunctionParameterFloat(1.0)
    PushScaleformMovieFunctionParameterFloat(4.0)
    PushScaleformMovieFunctionParameterString(Minigames.T('My Computer'))
    PopScaleformMovieFunctionVoid()

    PushScaleformMovieFunction(scaleform, 'ADD_PROGRAM')
    PushScaleformMovieFunctionParameterFloat(6.0)
    PushScaleformMovieFunctionParameterFloat(6.0)
    PushScaleformMovieFunctionParameterString(Minigames.T('Power Off'))
    PopScaleformMovieFunctionVoid()

    PushScaleformMovieFunction(scaleform, 'SET_BACKGROUND')
    PushScaleformMovieFunctionParameterInt(1)
    PopScaleformMovieFunctionVoid()

    while not HasStreamedTextureDictLoaded('hackingNG') do
        if GetGameTimer() > deadline + 5000 or stopRequested then
            ReleaseAssets(scaleform)
            return nil
        end
        Wait(0)
    end
    return scaleform
end

local function MoveColumns(columns, rate)
    local step = Timestep() * rate
    for i = 1, #columns do
        local column = columns[i]
        if column.rising then
            if column.phase < 1.0 then
                column.phase = column.phase + column.speed * step
            else
                column.rising = false
            end
        elseif column.phase > 0.0 then
            column.phase = column.phase - column.speed * step
        else
            column.rising = true
        end
        if column.highlighted or column.moving then
            column.y = Ease(Y_TOP, Y_BOTTOM, column.phase)
        end
    end
end

local function DrawBoard(scaleform, columns)
    DrawScaleformMovieFullscreen(scaleform, 255, 255, 255, 255, 0)
    DrawSprite('hackingNG', 'DHMain', 0.50, 0.50, 0.731, 1.306, 0, 255, 255, 255, 255, 0)
    for i = 1, #columns do
        local column = columns[i]
        local sprite = column.highlighted and 'DHCompHi' or 'DHComp'
        DrawSprite('hackingNG', sprite, COLUMN_X0 + COLUMN_DX * (i - 1), column.y, 0.4, 0.4, 0, 255, 255, 255, 255, 0)
    end
end

-- Difficulty 2-5 sets the slide rate (x10); anything else plays at 25
local function RateFromDifficulty(difficulty)
    difficulty = tonumber(difficulty)
    if not difficulty or difficulty < 2 or difficulty > 5 then return 25 end
    return difficulty * 10
end

-- One game, start to finish, on the calling thread. Returns true on a win.
local function RunGame(rate)
    local scaleform = LoadAssets()
    if not scaleform then return false end

    local columns = NewColumns()
    local current = 1
    columns[current].highlighted = true
    local helpText = Minigames.T('Press ~INPUT_FRONTEND_CANCEL~ to abort hack')
    local nextDeathCheck = 0
    local wonAt = nil

    while true do
        DisableControls()

        if stopRequested then
            ReleaseAssets(scaleform)
            return false
        end

        local now = GetGameTimer()
        if now >= nextDeathCheck then
            nextDeathCheck = now + 500
            if IsEntityDead(PlayerPedId()) then
                Minigames.Debug('data crack cancelled: player died')
                PlaySoundFrontend(-1, 'HACKING_FAILURE', '', true)
                ReleaseAssets(scaleform)
                return false
            end
        end

        if not wonAt then
            DrawHelp(helpText)
            if IsControlJustReleased(2, INPUT_CLICK) then
                local column = columns[current]
                if InSweetSpot(column) then
                    PlaySoundFrontend(-1, 'Pin_Good', 'DLC_HEIST_BIOLAB_PREP_HACKING_SOUNDS', true)
                    column.highlighted = false
                    column.moving = false
                    column.y = Y_LOCKED
                    current = current + 1
                    if current <= COLUMN_COUNT then
                        columns[current].highlighted = true
                    else
                        PlaySoundFrontend(-1, 'HACKING_SUCCESS', '', true)
                        wonAt = now
                    end
                else
                    PlaySoundFrontend(-1, 'Pin_Bad', 'DLC_HEIST_BIOLAB_PREP_HACKING_SOUNDS', true)
                    if current > 1 then
                        column.highlighted = false
                        current = current - 1
                        local previous = columns[current]
                        previous.highlighted = true
                        previous.y = Y_LOCKED
                        previous.moving = true
                    end
                end
            elseif IsControlJustReleased(2, INPUT_ABORT) then
                ReleaseAssets(scaleform)
                return false
            end
        elseif now - wonAt >= SUCCESS_SCREEN_MS then
            ReleaseAssets(scaleform)
            return true
        end

        MoveColumns(columns, rate)
        DrawBoard(scaleform, columns)
        Wait(0)
    end
end

local function StartDataCrack(difficulty)
    local p = promise.new()
    active = true
    stopRequested = false

    CreateThread(function()
        local ok, result = pcall(RunGame, RateFromDifficulty(difficulty))
        if not ok then
            print(('^1[glitch-minigames] data crack error: %s^7'):format(tostring(result)))
            ReleaseAssets(nil)
            result = false
        end
        active = false
        -- local event kept for older scripts that listen for the result
        TriggerEvent('datacrack', result == true)
        p:resolve(result == true)
    end)

    return Citizen.Await(p)
end

exports('StartDataCrack', StartDataCrack)

-- Lock watchdog (client/core/client.lua): end a stuck game as a fail
Minigames.OnRelease(function()
    if active then stopRequested = true end
end)

-- Legacy local event (older scripts): goes through the wrapped export, so the busy
-- lock, controls HUD and XP rules apply exactly as for a direct export call
AddEventHandler('datacrack:start', function(difficulty, cb)
    local success = exports[GetCurrentResourceName()]:StartDataCrack(difficulty)
    if Minigames.IsCallable(cb) then cb(success) end
end)

if config.DebugCommands then
    RegisterCommand('testdatacrack', function(_, args)
        local success = exports[GetCurrentResourceName()]:StartDataCrack(tonumber(args[1]) or 3)
        Minigames.Debug(('[testdatacrack] %s'):format(success and 'completed' or 'failed'))
    end, false)
end
