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

Drilling = {}

Drilling.DisabledControls = {
    30, 31, -- Movement & Cover
    199, -- Pause Menu
    24, 25, 140, 141, 142, 143, -- Attack Controls
    22, -- Space
    36, -- Enter
    157, 158, 160, 161, 162, 163, 164, 165, -- F keys
    37, 38, 169, 170, -- Weapon select
}

DrillPropHandle = nil
local soundId = nil
local soundPlaying = false
local drillSound = nil
local lastDrillPos = 0.0
local controlsNotificationId = 'drilling_controls'
local isDrillingMetal = false
local pinHitTimestamp = 0
local cameraHandle = nil
local animationSequenceComplete = false
local triggeredPinBreaks = {}
local maxDrillDepth = 0.0

local pinBreakPoints = {
    {min = 0.29, max = 0.305},
    {min = 0.50, max = 0.51},
    {min = 0.62, max = 0.63},
    {min = 0.78, max = 0.79}
}

local function requestModel(modelName)
    local modelHash = GetHashKey(modelName)
    RequestModel(modelHash)
    local startTime = GetGameTimer()
    while not HasModelLoaded(modelHash) do
        Citizen.Wait(0)
        if GetGameTimer() - startTime > 5000 then
            print("Failed to load model: " .. modelName)
            break
        end
    end
    return modelHash
end

function loadDrillSound()
    RequestScriptAudioBank("DLC_HEIST_FLEECA_SOUNDSET", false)
    RequestScriptAudioBank("DLC_MPHEIST/HEIST_FLEECA_DRILL", false)
    RequestScriptAudioBank("DLC_MPHEIST/HEIST_FLEECA_DRILL_2", false)
    
    local timeout = 0
    while not HasSoundFinished(-1) and timeout < 100 do
        Citizen.Wait(10)
        timeout = timeout + 1
    end
    
    PrepareAlarm("HEIST_FLEECA_DRILL")
    PrepareAlarm("HEIST_FLEECA_DRILL_2")
end

local function createAndAttachDrill()
    local modelHash = requestModel("hei_prop_heist_drill")
    local playerPed = PlayerPedId()
    
    local prop = CreateObject(modelHash, 1.0, 1.0, 1.0, true, true, false)
    SetCurrentPedWeapon(playerPed, GetHashKey("WEAPON_UNARMED"), true)
    
    local boneIndex = GetPedBoneIndex(playerPed, 28422)
    
    AttachEntityToEntity(prop, playerPed, boneIndex, 
        0.0, 0.0, 0.0,
        0.0, 0.0, 0.0,
        true, true, false, false, 2, true)
    
    SetEntityAsMissionEntity(prop, true, true)
    return prop
end

local function setupDrillingCamera()
    if cameraHandle then
        DestroyCam(cameraHandle, false)
        RenderScriptCams(false, false, 0, true, true)
        cameraHandle = nil
    end
    
    local playerPed = PlayerPedId()
    
    cameraHandle = CreateCam("DEFAULT_SCRIPTED_CAMERA", true)
    AttachCamToEntity(cameraHandle, playerPed, 1, -0.65, 0.4, true)
    
    SetCamRot(cameraHandle, 0.0, 0.0, GetEntityHeading(playerPed) - -35.0, 2)
    SetCamFov(cameraHandle, 50.0)
    
    RenderScriptCams(true, true, 500, true, true)
end

local function playDrillingSequence(callback)
    local playerPed = PlayerPedId()
    
    RequestAnimDict("anim@heists@fleeca_bank@drilling")
    while not HasAnimDictLoaded("anim@heists@fleeca_bank@drilling") do
        Wait(10)
    end
    
    TaskPlayAnim(playerPed, "anim@heists@fleeca_bank@drilling", "drill_straight_start", 
        8.0, -8.0, -1, 0, 0, false, false, false)
    
    Wait(1500)
    
    local prop = createAndAttachDrill()
    DrillPropHandle = prop
    
    TaskPlayAnim(playerPed, "anim@heists@fleeca_bank@drilling", "drill_straight_idle", 
        8.0, -8.0, -1, 1, 0, false, false, false)
    
    setupDrillingCamera()
    
    animationSequenceComplete = true
    
    if callback then
        callback()
    end
end

Drilling.Init = function()
    local prop = createAndAttachDrill()
    if not prop then
        print("Failed to create drill prop")
        return false
    end
    DrillPropHandle = prop
    
    FreezeEntityPosition(PlayerPedId(), true)
    
    if Drilling.Scaleform then
        Scaleforms.UnloadMovie(Drilling.Scaleform)
        Drilling.Scaleform = nil
    end
    
    local attempts = 0
    local maxAttempts = 3
    local scaleform = nil
    
    while attempts < maxAttempts do
        scaleform = RequestScaleformMovie("DRILLING")
        
        local timeout = 0
        while not HasScaleformMovieLoaded(scaleform) and timeout < 50 do
            Wait(10)
            timeout = timeout + 1
        end
        
        if HasScaleformMovieLoaded(scaleform) then
            break
        else
            print(string.format("Attempt %d/%d: Failed to load DRILLING scaleform", attempts + 1, maxAttempts))
            if scaleform then
                SetScaleformMovieAsNoLongerNeeded(scaleform)
            end
            attempts = attempts + 1
            Wait(100)
        end
    end
    
    if not scaleform or not HasScaleformMovieLoaded(scaleform) then
        print("Failed to load DRILLING scaleform after " .. maxAttempts .. " attempts")
        Drilling.ClearDrillProp()
        return false
    end
    
    Drilling.Scaleform = scaleform
    
    Drilling.DrillSpeed = 0.0
    Drilling.DrillPos = 0.0
    Drilling.DrillTemp = 0.0
    Drilling.HoleDepth = 0.1
    Drilling.Result = false
    
    Scaleforms.PopFloat(Drilling.Scaleform, "SET_SPEED", 0.0)
    Scaleforms.PopFloat(Drilling.Scaleform, "SET_DRILL_POSITION", 0.0)
    Scaleforms.PopFloat(Drilling.Scaleform, "SET_TEMPERATURE", 0.0)
    Scaleforms.PopFloat(Drilling.Scaleform, "SET_HOLE_DEPTH", 0.1)
    
    return true
end

Drilling.LoadAnimations = function()
    RequestAnimDict("anim@heists@fleeca_bank@drilling")
    
    local startTime = GetGameTimer()
    while not HasAnimDictLoaded("anim@heists@fleeca_bank@drilling") do
        Wait(10)
        if GetGameTimer() - startTime > 5000 then
            print("Failed to load animation: anim@heists@fleeca_bank@drilling")
            break
        end
    end
end

Drilling.ClearDrillProp = function()
    if DrillPropHandle and DoesEntityExist(DrillPropHandle) then
        DetachEntity(DrillPropHandle, true, true)
        DeleteObject(DrillPropHandle)
        
        if DoesEntityExist(DrillPropHandle) then
            SetEntityAsMissionEntity(DrillPropHandle, true, true)
            DeleteEntity(DrillPropHandle)
        end
        
        DrillPropHandle = nil
    end
    
    ClearPedTasks(PlayerPedId())
    local playerPed = PlayerPedId()
    local attachedObjects = GetGamePool('CObject')
    for _, obj in ipairs(attachedObjects) do
        if IsEntityAttachedToEntity(obj, playerPed) then
            DetachEntity(obj, true, true)
            DeleteObject(obj)
        end
    end
    
    if cameraHandle then
        DestroyCam(cameraHandle, false)
        RenderScriptCams(false, false, 0, true, true)
        cameraHandle = nil
    end
    
    animationSequenceComplete = false
end

Drilling.Start = function(callback)
    if not Drilling.Active then
        Drilling.Active = true
        
        if not Drilling.Init() then
            Drilling.Active = false
            if callback then
                callback(false)
            end
            return
        end
        
        triggeredPinBreaks = {}
        maxDrillDepth = 0.0
        
        loadDrillSound()
        
        if config.usingGlitchNotifications then 
            DrillingControls = exports['glitch-notifications']:ShowNotification(
                'Drilling Controls',
                'W/S - Move Drill Up/Down\nQ - Slow Down\nE - Speed Up\nESC - Cancel',
                0,
                '#ff9f1c',
                false
            )
        end
        
        playDrillingSequence(function()
            Drilling.Update(callback)
        end)
    end
end

Drilling.Draw = function()
    DrawScaleformMovieFullscreen(Drilling.Scaleform, 255, 255, 255, 255, 255)
end

Drilling.Update = function(callback)
    local lastSoundRefresh = GetGameTimer()
    
    while Drilling.Active do
        Drilling.Draw()
        Drilling.DisableControls()
        Drilling.HandleControls()
        
        if IsEntityDead(PlayerPedId()) then
            print("Drilling cancelled - player died")
            Drilling.Active = false
            Drilling.Result = false
            
            if config.usingGlitchNotifications then
                exports['glitch-notifications']:RemoveNotification(DrillingControls)
            end
            
            if soundPlaying then
                StopSound(drillSound)
                ReleaseSoundId(drillSound)
                soundPlaying = false
                isDrillingMetal = false
            end
            
            StopGameplayCamShaking(true)
            FreezeEntityPosition(PlayerPedId(), false)
            Drilling.ClearDrillProp()
            break
        end
        
        if GetGameTimer() - lastSoundRefresh > 10000 and soundPlaying then
            loadDrillSound()
            lastSoundRefresh = GetGameTimer()
        end
        
        if IsControlJustPressed(0, 200) then
            Drilling.Active = false
            Drilling.Result = false
            
            if config.usingGlitchNotifications then
                exports['glitch-notifications']:ShowNotification('Cancelled', 'Drilling cancelled', 3000, '#ffaa00', false)
                exports['glitch-notifications']:RemoveNotification(DrillingControls)
            end
            
            if soundPlaying then
                StopSound(drillSound)
                ReleaseSoundId(drillSound)
                soundPlaying = false
                isDrillingMetal = false
            end
            
            StopGameplayCamShaking(true)
            FreezeEntityPosition(PlayerPedId(), false)
            Drilling.ClearDrillProp()
        end
        
        Citizen.Wait(0)
    end
    
    Drilling.ClearDrillProp()

    if config.usingGlitchNotifications then
        exports['glitch-notifications']:RemoveNotification(DrillingControls)
    end
    
    if soundPlaying then
        StopSound(drillSound)
        ReleaseSoundId(drillSound)
        soundPlaying = false
        isDrillingMetal = false
    end
    
    StopGameplayCamShaking(true)
    FreezeEntityPosition(PlayerPedId(), false)
    
    if cameraHandle then
        DestroyCam(cameraHandle, false)
        RenderScriptCams(false, false, 500, true, true)
        cameraHandle = nil
    end
    
    local playerPed = PlayerPedId()
    TaskPlayAnim(playerPed, "anim@heists@fleeca_bank@drilling", "drill_straight_end", 
        8.0, -8.0, -1, 0, 0, false, false, false)
    
    Wait(1500)
    
    callback(Drilling.Result)
end

Drilling.HandleControls = function()
    local last_pos = Drilling.DrillPos
    local last_speed = Drilling.DrillSpeed
    
    if IsControlJustPressed(0, 32) then
        Drilling.DrillPos = math.min(1.0, Drilling.DrillPos + 0.005)
        if last_pos == 0.0 then
            PlaySoundFromEntity(drillSound, "Drill_Power_Up", PlayerPedId(), "DLC_HEIST_FLEECA_SOUNDSET", true, 0)
        end
    elseif IsControlPressed(0, 32) then
        local speedFactor = 0.06 * GetFrameTime() / (math.max(0.1, Drilling.DrillTemp) * 10)
        Drilling.DrillPos = math.min(1.0, Drilling.DrillPos + speedFactor)
    end
    
    -- S key - Move drill up
    if IsControlJustPressed(0, 33) then
        Drilling.DrillPos = math.max(0.0, Drilling.DrillPos - 0.01)
    elseif IsControlPressed(0, 33) then
        Drilling.DrillPos = math.max(0.0, Drilling.DrillPos - (0.1 * GetFrameTime()))
    end
    
    -- Q key - Slow down
    if IsControlJustPressed(0, 44) then
        Drilling.DrillSpeed = math.max(0.0, Drilling.DrillSpeed - 0.05)
    elseif IsControlPressed(0, 44) then
        Drilling.DrillSpeed = math.max(0.0, Drilling.DrillSpeed - (0.5 * GetFrameTime()))
    end
    
    -- E key - Speed up
    if IsControlJustPressed(0, 46) then
        Drilling.DrillSpeed = math.min(0.6, Drilling.DrillSpeed + 0.05) -- Cap at 0.6 (reduced from 0.8)
    elseif IsControlPressed(0, 46) then
        Drilling.DrillSpeed = math.min(0.6, Drilling.DrillSpeed + (0.2 * GetFrameTime())) -- Reduced acceleration rate
    end
    
    if Drilling.DrillSpeed > 0 and Drilling.Active then
        if not soundPlaying then
            if drillSound and drillSound ~= -1 then
                StopSound(drillSound)
                ReleaseSoundId(drillSound)
            end
            
            drillSound = GetSoundId()
            if drillSound ~= -1 then
                PlaySoundFromEntity(drillSound, "Drill", PlayerPedId(), "DLC_HEIST_FLEECA_SOUNDSET", true, 0)
                ShakeGameplayCam("ROAD_VIBRATION_SHAKE", Drilling.DrillSpeed * 0.5)
                soundPlaying = true
                isDrillingMetal = false
            end
        end
        
        if Drilling.DrillPos > Drilling.HoleDepth and Drilling.DrillSpeed > 0.1 then
            if not isDrillingMetal then
                StopSound(drillSound)
                drillSound = GetSoundId()
                if drillSound ~= -1 then
                    PlaySoundFromEntity(drillSound, "Drill_Off_Sweet_Spot_01", PlayerPedId(), "DLC_MPHEIST/HEIST_FLEECA_DRILL", true, 5)
                    ShakeGameplayCam("ROAD_VIBRATION_SHAKE", math.min(0.8, Drilling.DrillSpeed * 1.0))
                    isDrillingMetal = true
                end
            end
        else
            if isDrillingMetal then
                StopSound(drillSound)
                drillSound = GetSoundId()
                if drillSound ~= -1 then
                    PlaySoundFromEntity(drillSound, "Drill_In_Metal_01", PlayerPedId(), "DLC_MPHEIST/HEIST_FLEECA_DRILL_2", true, 5)
                    ShakeGameplayCam("ROAD_VIBRATION_SHAKE", Drilling.DrillSpeed * 0.5)
                    isDrillingMetal = false
                end
            end
        end
    else
        if soundPlaying then
            StopSound(drillSound)
            ReleaseSoundId(drillSound)
            StopGameplayCamShaking(true)
            soundPlaying = false
            isDrillingMetal = false
        end
    end
    
    if Drilling.DrillPos ~= last_pos then
        Scaleforms.PopFloat(Drilling.Scaleform, "SET_DRILL_POSITION", Drilling.DrillPos)
        Scaleforms.PopFloat(Drilling.Scaleform, "SET_HOLE_DEPTH", Drilling.HoleDepth)
    end
    
    if Drilling.DrillSpeed ~= last_speed then
        Scaleforms.PopFloat(Drilling.Scaleform, "SET_SPEED", Drilling.DrillSpeed)
    end
    
    Scaleforms.PopFloat(Drilling.Scaleform, "SET_TEMPERATURE", Drilling.DrillTemp)
    
    local currentTime = GetGameTimer()
    for i, point in ipairs(pinBreakPoints) do
        if Drilling.DrillPos >= point.min and Drilling.DrillPos <= point.max and lastDrillPos < point.min and not triggeredPinBreaks[i] and Drilling.DrillPos > maxDrillDepth and currentTime - pinHitTimestamp > 1000 then
            if not HasSoundFinished(-1) then
                StopSound(-1)
            end
            
            if i <= 4 then -- 2
                PlaySoundFrontend(-1, "Drill_Pin_Break", "DLC_HEIST_FLEECA_SOUNDSET", true)
            end
            
            ShakeGameplayCam("MEDIUM_EXPLOSION_SHAKE", 0.5)
            pinHitTimestamp = currentTime
            
            triggeredPinBreaks[i] = true
            
            if config.usingGlitchNotifications then
                exports['glitch-notifications']:ShowNotification('Warning', 'Pin break detected!', 2000, '#ffaa00', false)
            end
            
            print("Pin " .. i .. " break triggered at depth: " .. Drilling.DrillPos)
        end
    end
    
    if Drilling.DrillPos > maxDrillDepth then
        maxDrillDepth = Drilling.DrillPos
    end
    
    if Drilling.DrillPos > Drilling.HoleDepth then
        if Drilling.DrillSpeed > 0.1 then
            local heatRate = (1.0 * GetFrameTime()) * Drilling.DrillSpeed
            if Drilling.DrillSpeed > 0.7 then
                heatRate = heatRate * 1.5
            end
            Drilling.DrillTemp = math.min(1.0, Drilling.DrillTemp + heatRate)
            Drilling.HoleDepth = Drilling.DrillPos
        else
            Drilling.DrillPos = Drilling.HoleDepth
        end
    else
        Drilling.DrillTemp = math.max(0.0, Drilling.DrillTemp - (0.8 * GetFrameTime()))
    end
    
    if Drilling.DrillTemp >= 1.0 then
        Drilling.Result = false
        Drilling.Active = false
        
        if soundPlaying then
            StopSound(drillSound)
            ReleaseSoundId(drillSound)
            soundPlaying = false
            isDrillingMetal = false
        end
        
        StopGameplayCamShaking(true)
        FreezeEntityPosition(PlayerPedId(), false)
        Drilling.ClearDrillProp()
        
        if config.usingGlitchNotifications then
            exports['glitch-notifications']:ShowNotification('Failed', 'Drill overheated!', 3000, '#ff0000', false)
            exports['glitch-notifications']:RemoveNotification(DrillingControls)
        end

        PlaySoundFrontend(-1, "Drill_Heat_Failure", "DLC_HEIST_FLEECA_SOUNDSET", true)
        
        Citizen.SetTimeout(2000, function()
            Drilling.ClearDrillProp()
        end)

    elseif Drilling.DrillPos >= 0.975 then
        Drilling.Result = true
        Drilling.Active = false
        
        if soundPlaying then
            StopSound(drillSound)
            ReleaseSoundId(drillSound)
            soundPlaying = false
            isDrillingMetal = false
        end
        
        StopGameplayCamShaking(true)
        FreezeEntityPosition(PlayerPedId(), false)
        Drilling.ClearDrillProp()
        
        if config.usingGlitchNotifications then
            exports['glitch-notifications']:ShowNotification('Success', 'Successfully drilled!', 3000, '#00ff00', false)
            exports['glitch-notifications']:RemoveNotification(DrillingControls)
        end

        PlaySoundFrontend(-1, "Drill_Pin_Break", "DLC_HEIST_FLEECA_SOUNDSET", true)
        
        Citizen.SetTimeout(2000, function()
            Drilling.ClearDrillProp()
        end)
    end
    
    Drilling.DrillSpeed = math.min(0.6, Drilling.DrillSpeed)
    
    lastDrillPos = Drilling.DrillPos
end

Drilling.DisableControls = function()
    for _, control in ipairs(Drilling.DisabledControls) do
        DisableControlAction(0, control, true)
    end
end

exports('StartDrilling', function()
    local p = promise.new()
    
    Drilling.Start(function(success)
        if type(success) ~= "boolean" then
            success = false
        end
        p:resolve(success)
    end)
    
    local result = Citizen.Await(p)
    return result
end)

if config.DebugCommands then 
    RegisterCommand('testdrill', function()
        local success = exports['glitch-minigames']:StartDrilling()
        print("Drilling complete! Result: " .. tostring(success))
    end)
end