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

local scaleform = nil
local ClickReturn 
local lives = 5 --In the original scaleform minigame which you can play online, there are 7 lives given to the player.
-- Words the player cracks (config.BruteForcePasswords). The HACKING_PC roulette
-- has 8 columns, so only 8 character words are used; the defaults fill in when
-- the config list is missing or has none.
local DEFAULT_PASSWORDS = {"HACKME01", "SECUREIT", "PASSWORD", "CYBERNET", "ENCRYPTD", "INTRUDER", "BRUTE123", "HACKING8"}
local passwords = {}
for _, word in ipairs(type(config.BruteForcePasswords) == 'table' and config.BruteForcePasswords or {}) do
    if type(word) == 'string' and #word == 8 then passwords[#passwords + 1] = word:upper() end
end
if #passwords == 0 then passwords = DEFAULT_PASSWORDS end
local gamePassword

local inMinigame = false
local minigameResult = nil

local PlayerFreezed = false
-- Set by the scaleform thread when the result screen is done (one flag, no event)
local uiSequenceComplete = false
local Initialize, StartHackConnect -- local, defined below
local runGen = 0 -- bumped per game: a draw / logic thread from an older game stops

local function cleanupControls()
    FreezeEntityPosition(PlayerPedId(), false)
    EnableControlAction(0, 24, true) -- LEFT CLICK
    EnableControlAction(0, 25, true) -- RIGHT CLICK
end

Initialize = function(movieName)
    local scaleform = RequestScaleformMovieInteractive(movieName)
    local deadline = GetGameTimer() + 5000
    while not HasScaleformMovieLoaded(scaleform) do
        if GetGameTimer() > deadline then
            print('^3[glitch-minigames] HACKING_PC scaleform did not load^7')
            SetScaleformMovieAsNoLongerNeeded(scaleform)
            return nil
        end
        Citizen.Wait(0)
    end

    PushScaleformMovieFunction(scaleform, "SET_LABELS") --this allows us to label every item inside My Computer
    PushScaleformMovieFunctionParameterString(Minigames.T("Local Disk (C:)"))
    PushScaleformMovieFunctionParameterString(Minigames.T("Network"))
    PushScaleformMovieFunctionParameterString(Minigames.T("External Device (J:)"))
    PushScaleformMovieFunctionParameterString(Minigames.T("HackConnect.exe"))
    PushScaleformMovieFunctionParameterString(Minigames.T("BruteForce.exe"))
    PopScaleformMovieFunctionVoid()

    PushScaleformMovieFunction(scaleform, "SET_BACKGROUND") --We can set the background of the scaleform, so far 0-6 works.
    PushScaleformMovieFunctionParameterInt(0)
    PopScaleformMovieFunctionVoid()

    PushScaleformMovieFunction(scaleform, "ADD_PROGRAM") --We add My Computer application to the scaleform
    PushScaleformMovieFunctionParameterFloat(1.0) -- Position in the scaleform most left corner
    PushScaleformMovieFunctionParameterFloat(4.0)
    PushScaleformMovieFunctionParameterString(Minigames.T("My Computer"))
    PopScaleformMovieFunctionVoid()

    PushScaleformMovieFunction(scaleform, "ADD_PROGRAM") --Power Off app.
    PushScaleformMovieFunctionParameterFloat(6.0) -- Position in the scaleform most right corner
    PushScaleformMovieFunctionParameterFloat(6.0)
    PushScaleformMovieFunctionParameterString(Minigames.T("Power Off"))
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

-- Draw + cursor loop, one per game (started by StartHackConnect)
local function RunDrawLoop(gen)
    Citizen.CreateThread(function()
        while gen == runGen and inMinigame and scaleform do
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
            Citizen.Wait(0)
        end
    end)
end

-- Game logic loop, one per game (started by StartHackConnect)
local function RunLogicLoop(gen)
    Citizen.CreateThread(function()
        -- frozen once for the whole game; cleanupControls / the end of this thread unfreeze
        if gen == runGen and inMinigame then
            FreezeEntityPosition(PlayerPedId(), true)
            PlayerFreezed = true
        end
        while gen == runGen and inMinigame and scaleform and HasScaleformMovieLoaded(scaleform) do
            DisableControlAction(0, 24, true)
            DisableControlAction(0, 25, true)
            
            if GetScaleformMovieFunctionReturnBool(ClickReturn) then
                local ProgramID = GetScaleformMovieFunctionReturnInt(ClickReturn)

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

                elseif ProgramID == 86 then --IF YOU SUCCESSFULY GET ALL LETTERS RIGHT IN BRUTEFORCE APP
                    PlaySoundFrontend(-1, "HACKING_SUCCESS", "", true)
                    minigameResult = true
                    inMinigame = false
                    
                    cleanupControls()
                    
                    uiSequenceComplete = true -- the export resolves now; the draw loop stops with inMinigame

                elseif ProgramID == 6 then
                    -- Power Off: counts as giving up (the caller gets false instead of waiting forever)
                    Wait(500) -- WE WAIT 0.5 SECONDS TO EXIT SCALEFORM, JUST TO SIMULATE A SHUTDOWN, OTHERWISE IT CLOSES INSTANTLY
                    minigameResult = false
                    inMinigame = false
                    cleanupControls()
                    uiSequenceComplete = true
                end

                if lives == 0 then
                    PlaySoundFrontend(-1, "HACKING_FAILURE", "", true)
                    minigameResult = false
                    inMinigame = false
                    
                    cleanupControls()
                    
                    uiSequenceComplete = true -- the export resolves now; the draw loop stops with inMinigame
                end
            end
            Citizen.Wait(0)
        end
        -- only this game unfreezes: a newer game may have frozen the player again
        if PlayerFreezed and gen == runGen then
            FreezeEntityPosition(PlayerPedId(), false)
            PlayerFreezed = false
        end
    end)
end

StartHackConnect = function(numLives)
    local p = promise.new()
    
    lives = numLives or 5
    inMinigame = true
    minigameResult = nil
    uiSequenceComplete = false
    
    gamePassword = passwords[math.random(#passwords)]
    
    scaleform = Initialize("HACKING_PC")
    if not scaleform then
        inMinigame = false
        uiSequenceComplete = true
        cleanupControls()
        return false
    end
    
    PushScaleformMovieFunction(scaleform, "SET_LIVES")
    PushScaleformMovieFunctionParameterInt(lives)
    PushScaleformMovieFunctionParameterInt(lives)
    PopScaleformMovieFunctionVoid()

    runGen = runGen + 1
    RunDrawLoop(runGen)
    RunLogicLoop(runGen)
    
    Citizen.CreateThread(function()
        while inMinigame do
            if IsEntityDead(PlayerPedId()) then
                PlaySoundFrontend(-1, "HACKING_FAILURE", "", true)
                minigameResult = false
                inMinigame = false
                
                cleanupControls()
                
                if scaleform then
                    SetScaleformMovieAsNoLongerNeeded(scaleform)
                    scaleform = nil
                end
                
                uiSequenceComplete = true

                Minigames.Debug('brute force cancelled: player died')

                p:resolve(minigameResult)
            end
            Citizen.Wait(500)
        end
    end)
    
    Citizen.CreateThread(function()
        while inMinigame or (not uiSequenceComplete) do
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

exports('StartBruteForce', StartHackConnect)

-- Lock watchdog (client/core/client.lua): end a stuck game as a fail
Minigames.OnRelease(function()
    if not inMinigame then return end
    minigameResult = false
    inMinigame = false
    uiSequenceComplete = true
    cleanupControls()
end)

if config.DebugCommands then 
    RegisterCommand('testbruteforce', function()
        local success = exports[GetCurrentResourceName()]:StartBruteForce(3)
        
        if success then
            print("Hacking successful!")
        else 
            print("Hacking failed!")
        end
    end, false)
end
