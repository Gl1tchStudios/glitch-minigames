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

local output = {}
local stophack = false
local Dat_1 = { [1] = { val1 = 0.4, }, [2] = { val1 = 0.4, }, [3] = { val1 = 0.4, }, [4] = { val1 = 0.4, }, [5] = { val1 = 0.4, }, [6] = { val1 = 0.4, }, [7] = { val1 = 0.4, }, }
local Dat_2 = { [1] = { val0 = 1, val1 = (0.02 * 0.55), val2 = 0, val3 = 1, val4 = true }, [2] = { val0 = 1, val1 = (0.025 * 0.55), val2 = 0, val3 = 1, val4 = true }, [3] = { val0 = 1, val1 = (0.03 * 0.55), val2 = 0, val3 = 1, val4 = true }, [4] = { val0 = 1, val1 = (0.035 * 0.55), val2 = 0, val3 = 1, val4 = true }, [5] = { val0 = 1, val1 = (0.04 * 0.55), val2 = 0, val3 = 1, val4 = true }, [6] = { val0 = 1, val1 = (0.045 * 0.55), val2 = 0, val3 = 1, val4 = true }, [7] = { val0 = 1, val1 = (0.05 * 0.55), val2 = 0, val3 = 1, val4 = true } }
function F_02536(arg1) BeginTextCommandDisplayHelp('STRING') AddTextComponentSubstringPlayerName(arg1) EndTextCommandDisplayHelp(0, false, true, -1) end
function F_02539() DisableControlAction(0, 73, false) DisableControlAction(0, 24, true) DisableControlAction(0, 257, true) DisableControlAction(0, 25, true) DisableControlAction(0, 263, true) DisableControlAction(0, 32, true) DisableControlAction(0, 34, true) DisableControlAction(0, 31, true) DisableControlAction(0, 30, true) DisableControlAction(0, 45, true) DisableControlAction(0, 22, true) DisableControlAction(0, 44, true) DisableControlAction(0, 37, true) DisableControlAction(0, 23, true) DisableControlAction(0, 288, true) DisableControlAction(0, 289, true) DisableControlAction(0, 170, true) DisableControlAction(0, 167, true) DisableControlAction(0, 73, true) DisableControlAction(2, 199, true) DisableControlAction(0, 47, true) DisableControlAction(0, 264, true) DisableControlAction(0, 257, true) DisableControlAction(0, 140, true) DisableControlAction(0, 141, true) DisableControlAction(0, 142, true) DisableControlAction(0, 143, true) end
function F_02540(arg1) if (Dat_1[arg1].val1 >= 0.51) and (Dat_1[arg1].val1 <= 0.62) then return true end return false end
function F_02541(arg1, arg2, arg3) local number number = ((1.0 - Cos(F_02542((arg3 * 3.141593)))) * 0.5); return ((arg1 * (1 - number)) + (arg2 * number)); end
function F_02542(arg1) return (arg1 * 57.29578) end
function F_02668(arg1)
    Citizen.CreateThread(function()
        local current = 1
        Dat_2[current].val0 = 0
        while true do
            F_02539()
            F_02536("Press ~INPUT_FRONTEND_CANCEL~ to abort hack")
            if IsControlJustReleased(2, 237) then
                if F_02540(current) then
                    PlaySoundFrontend(-1, "Pin_Good", "DLC_HEIST_BIOLAB_PREP_HACKING_SOUNDS", true)
                    Dat_2[current].val0 = 1
                    Dat_2[current].val4 = false
                    Dat_1[current].val1 = 0.572
                    if current < 7 then
                        Dat_2[current+1].val0 = 0
                    end
                    current = current + 1
                    if current > 7 then
                        return
                    end
                else
                    PlaySoundFrontend(-1, "Pin_Bad", "DLC_HEIST_BIOLAB_PREP_HACKING_SOUNDS", true)
                    if current > 1 then
                        Dat_2[current].val0 = 1
                        current = current - 1
                        Dat_2[current].val0 = 0
                        Dat_1[current].val1 = 0.572
                        Dat_2[current].val4 = true
                    end
                end
            elseif IsControlJustReleased(2, 202) then
                Abort()
                return
            end
            if stophack then
                return
            end
            Citizen.Wait(1)
        end
    end)
    Citizen.CreateThread(function()
        while true do
            for i = 1, #Dat_2, 1 do
                if Dat_2[i].val3 == 1 then
                    if Dat_2[i].val2 < 1.0 then
                        Dat_2[i].val2 = Dat_2[i].val2 + ((Dat_2[i].val1 * Timestep()) * (arg1 * 1.0))
                    else
                        Dat_2[i].val3 = 0
                    end
                elseif Dat_2[i].val2 > 0.0 then
                    Dat_2[i].val2 = Dat_2[i].val2 - ((Dat_2[i].val1 * Timestep()) * (arg1 * 1.0))
                else
                    Dat_2[i].val3 = 1
                end
                if Dat_2[i].val0 == 0 or Dat_2[i].val4 then
                    Dat_1[i].val1 = F_02541(0.744, 0.4, Dat_2[i].val2)
                end
                if stophack then
                    return
                end
            end
            Citizen.Wait(1)
        end
    end)
    Citizen.CreateThread(function()
        RequestStreamedTextureDict("HACKING_PC_desktop_0", false)
        RequestStreamedTextureDict("hackingNG", false)
        local scaleform = RequestScaleformMovieInteractive("HACKING_PC")

        while not HasScaleformMovieLoaded(scaleform) do
            Citizen.Wait(0)
        end
        PushScaleformMovieFunction(scaleform, "ADD_PROGRAM")
        PushScaleformMovieFunctionParameterFloat(1.0)
        PushScaleformMovieFunctionParameterFloat(4.0)
        PushScaleformMovieFunctionParameterString("My Computer")
        PopScaleformMovieFunctionVoid()

        PushScaleformMovieFunction(scaleform, "ADD_PROGRAM")
        PushScaleformMovieFunctionParameterFloat(6.0)
        PushScaleformMovieFunctionParameterFloat(6.0)
        PushScaleformMovieFunctionParameterString("Power Off")
        PopScaleformMovieFunctionVoid()

        PushScaleformMovieFunction(scaleform, "SET_BACKGROUND")
        PushScaleformMovieFunctionParameterInt(1)
        PopScaleformMovieFunctionVoid()

        while not HasStreamedTextureDictLoaded("hackingNG") do
            Citizen.Wait(1)
        end
        while true do
            DrawScaleformMovieFullscreen(scaleform, 255, 255, 255, 255, 0)
            DrawSprite("hackingNG", "DHMain",0.50, 0.50, 0.731, 1.306, 0, 255, 255, 255, 255, 0)
            if Dat_2[1].val0 == 1 then
                DrawSprite("hackingNG", "DHComp", 0.35, Dat_1[1].val1, 0.4, 0.4, 0, 255, 255, 255, 255, 0)
            elseif Dat_2[1].val0 == 0 then
                DrawSprite("hackingNG", "DHCompHi", 0.35, Dat_1[1].val1, 0.4, 0.4, 0, 255, 255, 255, 255, 0)
            end
            if Dat_2[2].val0 == 1 then
                DrawSprite("hackingNG", "DHComp", 0.40, Dat_1[2].val1, 0.4, 0.4, 0, 255, 255, 255, 255, 0)
            elseif Dat_2[2].val0 == 0 then
                DrawSprite("hackingNG", "DHCompHi", 0.40, Dat_1[2].val1, 0.4, 0.4, 0, 255, 255, 255, 255, 0)
            end
            if Dat_2[3].val0 == 1 then
                DrawSprite("hackingNG", "DHComp", 0.45, Dat_1[3].val1, 0.4, 0.4, 0, 255, 255, 255, 255, 0)
            elseif Dat_2[3].val0 == 0 then
                DrawSprite("hackingNG", "DHCompHi", 0.45, Dat_1[3].val1, 0.4, 0.4, 0, 255, 255, 255, 255, 0)
            end
            if Dat_2[4].val0 == 1 then
                DrawSprite("hackingNG", "DHComp", 0.50, Dat_1[4].val1, 0.4, 0.4, 0, 255, 255, 255, 255, 0)
            elseif Dat_2[4].val0 == 0 then
                DrawSprite("hackingNG", "DHCompHi", 0.50, Dat_1[4].val1, 0.4, 0.4, 0, 255, 255, 255, 255, 0)
            end
            if Dat_2[5].val0 == 1 then
                DrawSprite("hackingNG", "DHComp", 0.55, Dat_1[5].val1, 0.4, 0.4, 0, 255, 255, 255, 255, 0)
            elseif Dat_2[5].val0 == 0 then
                DrawSprite("hackingNG", "DHCompHi", 0.55, Dat_1[5].val1, 0.4, 0.4, 0, 255, 255, 255, 255, 0)
            end
            if Dat_2[6].val0 == 1 then
                DrawSprite("hackingNG", "DHComp", 0.60, Dat_1[6].val1, 0.4, 0.4, 0, 255, 255, 255, 255, 0)
            elseif Dat_2[6].val0 == 0 then
                DrawSprite("hackingNG", "DHCompHi", 0.60, Dat_1[6].val1, 0.4, 0.4, 0, 255, 255, 255, 255, 0)
            end
            if Dat_2[7].val0 == 1 then
                DrawSprite("hackingNG", "DHComp", 0.65, Dat_1[7].val1, 0.4, 0.4, 0, 255, 255, 255, 255, 0)
            elseif Dat_2[7].val0 == 0 then
                DrawSprite("hackingNG", "DHCompHi", 0.65, Dat_1[7].val1, 0.4, 0.4, 0, 255, 255, 255, 255, 0)
            end
            if stophack == true then
                return
            end
            if Dat_2[1].val4 == false and Dat_2[2].val4 == false and Dat_2[3].val4 == false and Dat_2[4].val4 == false and Dat_2[5].val4 == false and Dat_2[6].val4 == false and Dat_2[7].val4 == false then
                PlaySoundFrontend(-1, "HACKING_SUCCESS", "", true)
                Citizen.Wait(2500)
                stophack = true
                TriggerEvent("datacrack", true)
                return
            end
            Citizen.Wait(1)
        end
    end)
    Citizen.CreateThread(function()
        while not stophack do
            if IsEntityDead(PlayerPedId()) then
                print("DataCrack hack cancelled - player died")
                PlaySoundFrontend(-1, "HACKING_FAILURE", "", true)
                Abort()
                break
            end
            Citizen.Wait(500)
        end
    end)
end

function Abort()
    stophack = true
    TriggerEvent("datacrack", false)
end

function Start(arg1)
    local loc1
    if arg1 == nil then
        loc1 = 25
    elseif arg1 < 2 then
        loc1 = 25
    elseif arg1 > 5 then
        loc1 = 25
    else
        loc1 = arg1 * 10
    end
    Dat_1 = { [1] = { val1 = 0.4, }, [2] = { val1 = 0.4, }, [3] = { val1 = 0.4, }, [4] = { val1 = 0.4, }, [5] = { val1 = 0.4, }, [6] = { val1 = 0.4, }, [7] = { val1 = 0.4, }, }
    Dat_2 = { [1] = { val0 = 1, val1 = (0.02 * 0.55), val2 = 0, val3 = 1, val4 = true }, [2] = { val0 = 1, val1 = (0.025 * 0.55), val2 = 0, val3 = 1, val4 = true }, [3] = { val0 = 1, val1 = (0.03 * 0.55), val2 = 0, val3 = 1, val4 = true }, [4] = { val0 = 1, val1 = (0.035 * 0.55), val2 = 0, val3 = 1, val4 = true }, [5] = { val0 = 1, val1 = (0.04 * 0.55), val2 = 0, val3 = 1, val4 = true }, [6] = { val0 = 1, val1 = (0.045 * 0.55), val2 = 0, val3 = 1, val4 = true }, [7] = { val0 = 1, val1 = (0.05 * 0.55), val2 = 0, val3 = 1, val4 = true } }
    stophack = false
    F_02668(loc1)
end

local function StartDataCrack(difficulty)
    local p = promise.new()
    
    Start(difficulty)
    
    Citizen.CreateThread(function()
        while stophack == false do 
            Citizen.Wait(100)
        end
        
        local success = Dat_2[1].val4 == false and 
                       Dat_2[2].val4 == false and 
                       Dat_2[3].val4 == false and 
                       Dat_2[4].val4 == false and 
                       Dat_2[5].val4 == false and 
                       Dat_2[6].val4 == false and 
                       Dat_2[7].val4 == false
                       
        p:resolve(success)
    end)
    
    return Citizen.Await(p)
end

exports('StartDataCrack', StartDataCrack)

AddEventHandler('datacrack:start', function(arg1, cb)
    local success = StartDataCrack(arg1)
    cb(success)
end)

if config.DebugCommands then 
    RegisterCommand("testdatacrack", function(source, args, rawCommand)
        local difficulty = tonumber(args[1]) or 3
        local success = exports['glitch-minigames']:StartDataCrack(difficulty)
        
        if success then
            print("Hacking successful!")
        else
            print("Hacking failed!")
        end
    end, false)
end