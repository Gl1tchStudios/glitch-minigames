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

local scaleform = nil
local ClickReturn 
local lives = 5 --In the original scaleform minigame which you can play online, there are 7 lives given to the player.
local passwords = {"HACKME01", "SECUREIT", "PASSWORD", "CYBERNET", "ENCRYPTD", "INTRUDER", "BRUTE123", "HACKING8"}
local gamePassword

local inMinigame = false
local minigameResult = nil

local function cleanupControls()
    FreezeEntityPosition(PlayerPedId(), false)
    EnableControlAction(0, 24, true) -- LEFT CLICK
    EnableControlAction(0, 25, true) -- RIGHT CLICK
end

function Initialize(scaleform)
    local scaleform = RequestScaleformMovieInteractive(scaleform)
    while not HasScaleformMovieLoaded(scaleform) do
        Citizen.Wait(0)
    end

    PushScaleformMovieFunction(scaleform, "SET_LABELS") --this allows us to label every item inside My Computer
    PushScaleformMovieFunctionParameterString("Local Disk (C:)")
    PushScaleformMovieFunctionParameterString("Network")
    PushScaleformMovieFunctionParameterString("External Device (J:)")
    PushScaleformMovieFunctionParameterString("HackConnect.exe")
    PushScaleformMovieFunctionParameterString("BruteForce.exe")
    PopScaleformMovieFunctionVoid()

    PushScaleformMovieFunction(scaleform, "SET_BACKGROUND") --We can set the background of the scaleform, so far 0-6 works.
    PushScaleformMovieFunctionParameterInt(0)
    PopScaleformMovieFunctionVoid()

    PushScaleformMovieFunction(scaleform, "ADD_PROGRAM") --We add My Computer application to the scaleform
    PushScaleformMovieFunctionParameterFloat(1.0) -- Position in the scaleform most left corner
    PushScaleformMovieFunctionParameterFloat(4.0)
    PushScaleformMovieFunctionParameterString("My Computer")
    PopScaleformMovieFunctionVoid()

    PushScaleformMovieFunction(scaleform, "ADD_PROGRAM") --Power Off app.
    PushScaleformMovieFunctionParameterFloat(6.0) -- Position in the scaleform most right corner
    PushScaleformMovieFunctionParameterFloat(6.0)
    PushScaleformMovieFunctionParameterString("Power Off")
    PopScaleformMovieFunctionVoid()

    PushScaleformMovieFunction(scaleform, "SET_COLUMN_SPEED") --Column speed used in the minigame, (0-255). 
    PushScaleformMovieFunctionParameterInt(0)
    PushScaleformMovieFunctionParameterInt(math.random(150,255))
    PopScaleformMovieFunctionVoid()

    PushScaleformMovieFunction(scaleform, "SET_COLUMN_SPEED")
    PushScaleformMovieFunctionParameterInt(1)
    PushScaleformMovieFunctionParameterInt(math.random(160,255))
    PopScaleformMovieFunctionVoid()

    PushScaleformMovieFunction(scaleform, "SET_COLUMN_SPEED")
    PushScaleformMovieFunctionParameterInt(2)
    PushScaleformMovieFunctionParameterInt(math.random(170,255))
    PopScaleformMovieFunctionVoid()

    PushScaleformMovieFunction(scaleform, "SET_COLUMN_SPEED")
    PushScaleformMovieFunctionParameterInt(3)
    PushScaleformMovieFunctionParameterInt(math.random(190,255))
    PopScaleformMovieFunctionVoid()

    PushScaleformMovieFunction(scaleform, "SET_COLUMN_SPEED")
    PushScaleformMovieFunctionParameterInt(4)
    PushScaleformMovieFunctionParameterInt(math.random(200,255))
    PopScaleformMovieFunctionVoid()

    PushScaleformMovieFunction(scaleform, "SET_COLUMN_SPEED")
    PushScaleformMovieFunctionParameterInt(5)
    PushScaleformMovieFunctionParameterInt(math.random(210,255))
    PopScaleformMovieFunctionVoid()

    PushScaleformMovieFunction(scaleform, "SET_COLUMN_SPEED")
    PushScaleformMovieFunctionParameterInt(6)
    PushScaleformMovieFunctionParameterInt(math.random(220,255))
    PopScaleformMovieFunctionVoid()

    PushScaleformMovieFunction(scaleform, "SET_COLUMN_SPEED")
    PushScaleformMovieFunctionParameterInt(7)
    PushScaleformMovieFunctionParameterInt(255)
    PopScaleformMovieFunctionVoid()

    return scaleform
end

Citizen.CreateThread(function()
    while true do
        Citizen.Wait(0)
        if inMinigame and scaleform then
            DrawScaleformMovieFullscreen(scaleform, 255, 255, 255, 255, 0)
            PushScaleformMovieFunction(scaleform, "SET_CURSOR")
            PushScaleformMovieFunctionParameterFloat(GetControlNormal(0, 239)) 
            PushScaleformMovieFunctionParameterFloat(GetControlNormal(0, 240))
            PopScaleformMovieFunctionVoid()
            if IsDisabledControlJustPressed(0,24) then
                PushScaleformMovieFunction(scaleform, "SET_INPUT_EVENT_SELECT")
                ClickReturn = PopScaleformMovieFunction()
                PlaySoundFrontend(-1, "HACKING_CLICK", "", true)
            elseif IsDisabledControlJustPressed(0, 25) then
                PushScaleformMovieFunction(scaleform, "SET_INPUT_EVENT_BACK")
                PopScaleformMovieFunctionVoid()
                PlaySoundFrontend(-1, "HACKING_CLICK", "", true)
            end
        end
    end
end)

Citizen.CreateThread(function()
    while true do
        Citizen.Wait(0)
        if inMinigame and HasScaleformMovieLoaded(scaleform) then
            FreezeEntityPosition(PlayerPedId(), true)
            DisableControlAction(0, 24, true)
            DisableControlAction(0, 25, true)
            
            if GetScaleformMovieFunctionReturnBool(ClickReturn) then
                ProgramID = GetScaleformMovieFunctionReturnInt(ClickReturn)
                print("ProgramID: "..ProgramID) -- Prints the ID of the Apps we click on inside the scaleform, very useful.

                if ProgramID == 83 or ProgramID == 82 then  --BRUTEFORCE.EXE
                    PushScaleformMovieFunction(scaleform, "RUN_PROGRAM")
                    PushScaleformMovieFunctionParameterFloat(83.0)
                    PopScaleformMovieFunctionVoid()

                    PushScaleformMovieFunction(scaleform, "SET_ROULETTE_WORD")
                    PushScaleformMovieFunctionParameterString(gamePassword)
                    PopScaleformMovieFunctionVoid()

                elseif ProgramID == 87 then --IF YOU CLICK THE WRONG LETTER IN BRUTEFORCE APP
                    lives = lives - 1

                    PushScaleformMovieFunction(scaleform, "SET_ROULETTE_WORD")
                    PushScaleformMovieFunctionParameterString(gamePassword)
                    PopScaleformMovieFunctionVoid()

                    PlaySoundFrontend(-1, "HACKING_CLICK_BAD", "", false)
                    PushScaleformMovieFunction(scaleform, "SET_LIVES")
                    PushScaleformMovieFunctionParameterInt(lives) --We set how many lives our user has before he fails the bruteforce.
                    PushScaleformMovieFunctionParameterInt(5)
                    PopScaleformMovieFunctionVoid()

                elseif ProgramID == 92 then --IF YOU CLICK THE RIGHT LETTER IN BRUTEFORCE APP, you could add more lives here.
                    PlaySoundFrontend(-1, "HACKING_CLICK_GOOD", "", false)

                -- Modify the successful hack section (ProgramID == 86)
                elseif ProgramID == 86 then --IF YOU SUCCESSFULY GET ALL LETTERS RIGHT IN BRUTEFORCE APP
                    PlaySoundFrontend(-1, "HACKING_SUCCESS", "", true)
                    minigameResult = true
                    inMinigame = false
                    
                    cleanupControls()
                    
                    PushScaleformMovieFunction(scaleform, "SET_ROULETTE_OUTCOME")
                    PushScaleformMovieFunctionParameterBool(true)
                    PushScaleformMovieFunctionParameterString("BRUTEFORCE SUCCESSFUL!")
                    PopScaleformMovieFunctionVoid()
                    
                    Wait(2800) --We wait 2.8 to let the bruteforce message sink in before we continue
                    PushScaleformMovieFunction(scaleform, "CLOSE_APP")
                    PopScaleformMovieFunctionVoid()
                    
                    PushScaleformMovieFunction(scaleform, "OPEN_LOADING_PROGRESS")
                    PushScaleformMovieFunctionParameterBool(true)
                    PopScaleformMovieFunctionVoid()
                    
                    PushScaleformMovieFunction(scaleform, "SET_LOADING_PROGRESS")
                    PushScaleformMovieFunctionParameterInt(35)
                    PopScaleformMovieFunctionVoid()
                    
                    PushScaleformMovieFunction(scaleform, "SET_LOADING_TIME")
                    PushScaleformMovieFunctionParameterInt(35)
                    PopScaleformMovieFunctionVoid()
                    
                    PushScaleformMovieFunction(scaleform, "SET_LOADING_MESSAGE")
                    PushScaleformMovieFunctionParameterString("Writing data to buffer..")
                    PushScaleformMovieFunctionParameterFloat(2.0)
                    PopScaleformMovieFunctionVoid()
                    Wait(1500)
                    
                    PushScaleformMovieFunction(scaleform, "SET_LOADING_MESSAGE")
                    PushScaleformMovieFunctionParameterString("Executing malicious code..")
                    PushScaleformMovieFunctionParameterFloat(2.0)
                    PopScaleformMovieFunctionVoid()
                    
                    PushScaleformMovieFunction(scaleform, "SET_LOADING_TIME")
                    PushScaleformMovieFunctionParameterInt(15)
                    PopScaleformMovieFunctionVoid()
                    
                    PushScaleformMovieFunction(scaleform, "SET_LOADING_PROGRESS")
                    PushScaleformMovieFunctionParameterInt(75)
                    PopScaleformMovieFunctionVoid()
                    
                    Wait(1500)
                    PushScaleformMovieFunction(scaleform, "OPEN_LOADING_PROGRESS")
                    PushScaleformMovieFunctionParameterBool(false)
                    PopScaleformMovieFunctionVoid()
                    
                    PushScaleformMovieFunction(scaleform, "OPEN_ERROR_POPUP")
                    PushScaleformMovieFunctionParameterBool(true)
                    PushScaleformMovieFunctionParameterString("MEMORY LEAK DETECTED, DEVICE SHUTTING DOWN")
                    PopScaleformMovieFunctionVoid()
                    
                    Wait(3500)
                    SetScaleformMovieAsNoLongerNeeded(scaleform)
                    PopScaleformMovieFunctionVoid()
                    TriggerEvent('bruteforce:uiSequenceComplete')

                elseif ProgramID == 6 then
                    Wait(500) -- WE WAIT 0.5 SECONDS TO EXIT SCALEFORM, JUST TO SIMULATE A SHUTDOWN, OTHERWISE IT CLOSES INSTANTLY
                    SetScaleformMovieAsNoLongerNeeded(scaleform) --EXIT SCALEFORM
                    inMinigame = false
                    FreezeEntityPosition(PlayerPedId(), false) --unfreeze our character
                    DisableControlAction(0, 24, false) --LEFT CLICK enabled again
                    DisableControlAction(0, 25, false) --RIGHT CLICK enabled again
                end

                if lives == 0 then
                    PlaySoundFrontend(-1, "HACKING_FAILURE", "", true)
                    minigameResult = false
                    inMinigame = false
                    
                    cleanupControls()
                    
                    PushScaleformMovieFunction(scaleform, "SET_ROULETTE_OUTCOME")
                    PushScaleformMovieFunctionParameterBool(false)
                    PushScaleformMovieFunctionParameterString("BRUTEFORCE FAILED!")
                    PopScaleformMovieFunctionVoid()
                    
                    Wait(2800)
                    PushScaleformMovieFunction(scaleform, "CLOSE_APP")
                    PopScaleformMovieFunctionVoid()
                    
                    PushScaleformMovieFunction(scaleform, "OPEN_LOADING_PROGRESS")
                    PushScaleformMovieFunctionParameterBool(true)
                    PopScaleformMovieFunctionVoid()
                    
                    PushScaleformMovieFunction(scaleform, "SET_LOADING_PROGRESS")
                    PushScaleformMovieFunctionParameterInt(35)
                    PopScaleformMovieFunctionVoid()
                    
                    PushScaleformMovieFunction(scaleform, "SET_LOADING_TIME")
                    PushScaleformMovieFunctionParameterInt(35)
                    PopScaleformMovieFunctionVoid()
                    
                    PushScaleformMovieFunction(scaleform, "SET_LOADING_MESSAGE")
                    PushScaleformMovieFunctionParameterString("System failure detected...")
                    PushScaleformMovieFunctionParameterFloat(2.0)
                    PopScaleformMovieFunctionVoid()
                    Wait(1500)
                    
                    PushScaleformMovieFunction(scaleform, "SET_LOADING_TIME")
                    PushScaleformMovieFunctionParameterInt(15)
                    PopScaleformMovieFunctionVoid()
                    
                    PushScaleformMovieFunction(scaleform, "SET_LOADING_PROGRESS")
                    PushScaleformMovieFunctionParameterInt(75)
                    PopScaleformMovieFunctionVoid()
                    
                    Wait(1500)
                    PushScaleformMovieFunction(scaleform, "OPEN_LOADING_PROGRESS")
                    PushScaleformMovieFunctionParameterBool(false)
                    PopScaleformMovieFunctionVoid()
                    
                    PushScaleformMovieFunction(scaleform, "OPEN_ERROR_POPUP")
                    PushScaleformMovieFunctionParameterBool(true)
                    PushScaleformMovieFunctionParameterString("MEMORY LEAK DETECTED, DEVICE SHUTTING DOWN")
                    PopScaleformMovieFunctionVoid()
                    
                    Wait(3500)
                    SetScaleformMovieAsNoLongerNeeded(scaleform)
                    PopScaleformMovieFunctionVoid()
                end
            end
        else
            FreezeEntityPosition(PlayerPedId(), false)
            Citizen.Wait(500)
        end
    end
end)

function StartHackConnect(numLives)
    local p = promise.new()
    
    lives = numLives or 5
    inMinigame = true
    minigameResult = nil
    local uiSequenceComplete = false
    
    gamePassword = passwords[math.random(#passwords)]
    
    scaleform = Initialize("HACKING_PC")
    
    PushScaleformMovieFunction(scaleform, "SET_LIVES")
    PushScaleformMovieFunctionParameterInt(lives)
    PushScaleformMovieFunctionParameterInt(lives)
    PopScaleformMovieFunctionVoid()
    
    RegisterNetEvent('bruteforce:uiSequenceComplete')
    AddEventHandler('bruteforce:uiSequenceComplete', function()
        uiSequenceComplete = true
    end)
    
    Citizen.CreateThread(function()
        while inMinigame or (not uiSequenceComplete and minigameResult == false) do
            Citizen.Wait(100)
        end
        
        if scaleform then
            SetScaleformMovieAsNoLongerNeeded(scaleform)
            scaleform = nil
        end
        
        p:resolve(minigameResult)
    end)
    
    return Citizen.Await(p)
end

exports('StartHackConnect', StartHackConnect)

if config.DebugCommands then 
    RegisterCommand('testbruteforce', function()
        local success = exports['glitch-minigames']:StartHackConnect(3)
        
        if success then
            print("Hacking successful!")
        else 
            print("Hacking failed!")
        end
    end, false)
end