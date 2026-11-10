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

PlasmaDrilling = {}
local setupDrillingCamera, beginnDrilling, stopDrilling -- local, defined below
local extra = 'SET_SPEED' -- scaleform method for the drill speed (laser width on VAULT_LASER)

-- Result popups through glitch-notifications (config.usingGlitchNotifications, optional)
local function notify(title, text, colour)
    if config.usingGlitchNotifications and GetResourceState('glitch-notifications') == 'started' then
        exports['glitch-notifications']:ShowNotification(title, text, 3000, colour, false)
    end
end

PlasmaDrilling.DisabledControls = {30,31,32,33,34,35}
PlasmaDrilling.CameraHandle = nil

PlasmaDrilling.Start = function(callback)
    if not PlasmaDrilling.Active then
        PlasmaDrilling.Active = true
        PlasmaDrilling.Result = false
        if not PlasmaDrilling.Init() then
            -- scaleform did not load: fail instead of drawing nothing
            PlasmaDrilling.Active = false
        end
        PlasmaDrilling.Update(callback)
    end
end

PlasmaDrilling.Init = function()
  if PlasmaDrilling.Scaleform then
    Scaleforms.UnloadMovie(PlasmaDrilling.Scaleform)
  end

  PlasmaDrilling.Scaleform = Scaleforms.LoadMovie(PlasmaDrilling.Type)
  if not PlasmaDrilling.Scaleform then
    print(('^3[glitch-minigames] %s scaleform did not load^7'):format(tostring(PlasmaDrilling.Type)))
    return false
  end
  if PlasmaDrilling.Type == 'VAULT_LASER' then
    extra = "SET_LASER_WIDTH"
  else
    extra = "SET_SPEED"
  end
  
  PlasmaDrilling.DrillSpeed = 0.0
  PlasmaDrilling.DrillPos   = 0.0
  PlasmaDrilling.DrillTemp  = 0.0
  PlasmaDrilling.HoleDepth  = 0.0
  

  Scaleforms.PopVoid(PlasmaDrilling.Scaleform, "REVEAL")
  Scaleforms.PopFloat(PlasmaDrilling.Scaleform, extra,     0.0)
  Scaleforms.PopFloat(PlasmaDrilling.Scaleform,"SET_DRILL_POSITION",  0.0)
  Scaleforms.PopFloat(PlasmaDrilling.Scaleform,"SET_TEMPERATURE",     0.0)
  Scaleforms.PopFloat(PlasmaDrilling.Scaleform,"SET_HOLE_DEPTH",      0.0)
  Scaleforms.PopInt(PlasmaDrilling.Scaleform,"SET_NUM_DISCS",      6)
  return true
end

PlasmaDrilling.Update = function(callback)
  while PlasmaDrilling.Active do
    PlasmaDrilling.Draw()
    PlasmaDrilling.DisableControls()
    
    if IsEntityDead(PlayerPedId()) then
      Minigames.Debug('plasma drilling cancelled: player died')
      PlasmaDrilling.Result = false
      PlasmaDrilling.Active = false
      
      Scaleforms.PopVoid(PlasmaDrilling.Scaleform, "RESET")
      
      break
    end
    
    -- a script error in here would kill the loop and leave the camera, prop and
    -- shake on until the watchdog: end the game as a fail instead
    local ok, err = pcall(PlasmaDrilling.HandleControls)
    if not ok then
      print('^1[glitch-minigames] plasma drilling error: ' .. tostring(err) .. '^7')
      PlasmaDrilling.Result = false
      PlasmaDrilling.Active = false
      break
    end
    Wait(0)
  end
  -- release the VAULT_LASER movie as soon as the run is over
  if PlasmaDrilling.Scaleform then
    Scaleforms.UnloadMovie(PlasmaDrilling.Scaleform)
    PlasmaDrilling.Scaleform = nil
  end
  callback(PlasmaDrilling.Result)
end

PlasmaDrilling.Draw = function()
  DrawScaleformMovieFullscreen(PlasmaDrilling.Scaleform,255,255,255,255,255)
end

PlasmaDrilling.HandleControls = function()
  -- ESC: disabled so the pause menu stays shut, read as the disabled control
  DisableControlAction(0, 200, true)
  if IsDisabledControlJustPressed(0, 200) or IsControlJustPressed(0, 177) then -- ESC key
    PlasmaDrilling.Result = false
    PlasmaDrilling.Active = false
    Scaleforms.PopVoid(PlasmaDrilling.Scaleform, "RESET")
    return
  end
  
  local last_pos = PlasmaDrilling.DrillPos
  -- A tap only nudges through the hole already cut; new depth needs UP held
  -- (which builds heat), so spamming UP can't finish the drill cold.
  if IsControlJustPressed(0,188) and PlasmaDrilling.DrillPos < PlasmaDrilling.HoleDepth then -- (UP)
    PlasmaDrilling.DrillPos = math.min(PlasmaDrilling.HoleDepth,PlasmaDrilling.DrillPos + 0.01)
    Scaleforms.PopVoid(PlasmaDrilling.Scaleform,"burstOutSparks")
  elseif IsControlPressed(0,188) then -- (UP)
    PlasmaDrilling.DrillPos = math.min(1.0,PlasmaDrilling.DrillPos + (0.1 * GetFrameTime() / (math.max(0.1,PlasmaDrilling.DrillTemp) * 10)))
  elseif IsControlJustPressed(0,187) then -- (DOWN)
    PlasmaDrilling.DrillPos = math.max(0.0,PlasmaDrilling.DrillPos - 0.01)
  elseif IsControlPressed(0,187) then -- (DOWN)
    PlasmaDrilling.DrillPos = math.max(0.0,PlasmaDrilling.DrillPos - (0.1 * GetFrameTime()))
  end

  local last_speed = PlasmaDrilling.DrillSpeed
  if IsControlJustPressed(0,190) then -- (RIGHT)
    PlasmaDrilling.DrillSpeed = math.min(1.0,PlasmaDrilling.DrillSpeed + 0.05)
  elseif IsControlPressed(0,190) then -- (RIGHT)
    PlasmaDrilling.DrillSpeed = math.min(1.0,PlasmaDrilling.DrillSpeed + (0.5 * GetFrameTime()))
  elseif IsControlJustPressed(0,189) then -- (LEFT)
    PlasmaDrilling.DrillSpeed = math.max(0.0,PlasmaDrilling.DrillSpeed - 0.05)
  elseif IsControlPressed(0,189) then -- (LEFT)
    PlasmaDrilling.DrillSpeed = math.max(0.0,PlasmaDrilling.DrillSpeed - (0.5 * GetFrameTime()))
  end

  local last_temp = PlasmaDrilling.DrillTemp
  if last_pos < PlasmaDrilling.DrillPos then
    if PlasmaDrilling.DrillSpeed > 0.4 then
      PlasmaDrilling.DrillTemp = math.min(1.0,PlasmaDrilling.DrillTemp + ((0.05 * GetFrameTime()) *  (PlasmaDrilling.DrillSpeed * 10)))
      Scaleforms.PopFloat(PlasmaDrilling.Scaleform,"SET_DRILL_POSITION",PlasmaDrilling.DrillPos)
    else
      if PlasmaDrilling.DrillPos < 0.1 or PlasmaDrilling.DrillPos < PlasmaDrilling.HoleDepth then
        Scaleforms.PopFloat(PlasmaDrilling.Scaleform,"SET_DRILL_POSITION",PlasmaDrilling.DrillPos)
      else
        PlasmaDrilling.DrillPos = last_pos
        PlasmaDrilling.DrillTemp = math.min(1.0,PlasmaDrilling.DrillTemp + (0.01 * GetFrameTime()))
      end
    end
  elseif not IsControlPressed(0, 188) then
    PlasmaDrilling.DrillTemp = math.max(0.0,PlasmaDrilling.DrillTemp - ((0.05 * GetFrameTime()) * math.max(0.005,(PlasmaDrilling.DrillSpeed * 10) /2)))
    
    if PlasmaDrilling.DrillPos ~= PlasmaDrilling.HoleDepth then
      Scaleforms.PopFloat(PlasmaDrilling.Scaleform,"SET_DRILL_POSITION",PlasmaDrilling.DrillPos)
    end
  else
    if PlasmaDrilling.DrillPos < PlasmaDrilling.HoleDepth then
      PlasmaDrilling.DrillTemp = math.max(0.0,PlasmaDrilling.DrillTemp - ((0.05 * GetFrameTime()) * math.max(0.005,(PlasmaDrilling.DrillSpeed * 10) /2)))
    end

    if PlasmaDrilling.DrillPos ~= PlasmaDrilling.HoleDepth then
      Scaleforms.PopFloat(PlasmaDrilling.Scaleform,"SET_DRILL_POSITION",PlasmaDrilling.DrillPos)
    end
  end

  if last_speed ~= PlasmaDrilling.DrillSpeed then
    Scaleforms.PopFloat(PlasmaDrilling.Scaleform,extra,PlasmaDrilling.DrillSpeed)
  end

  if last_temp ~= PlasmaDrilling.DrillTemp then    
    Scaleforms.PopFloat(PlasmaDrilling.Scaleform,"SET_TEMPERATURE",PlasmaDrilling.DrillTemp)
  end

  if PlasmaDrilling.DrillTemp >= 1.0 then
    PlasmaDrilling.Result = false
    PlasmaDrilling.Active = false
    Scaleforms.PopVoid(PlasmaDrilling.Scaleform, "RESET")
  elseif PlasmaDrilling.DrillPos >= 1.0 then
    PlasmaDrilling.Result = true
    PlasmaDrilling.Active = false
    Scaleforms.PopVoid(PlasmaDrilling.Scaleform, "RESET")
  end

  PlasmaDrilling.HoleDepth = (PlasmaDrilling.DrillPos > PlasmaDrilling.HoleDepth and PlasmaDrilling.DrillPos or PlasmaDrilling.HoleDepth)
end

-- Resource stop mid-drill: stop the sound, delete the drill and give control back
PlasmaDrilling.StopNow = function()
  if not PlasmaDrilling.Active then return end
  PlasmaDrilling.Active = false
  PlasmaDrilling.Result = false
  if PlasmaDrilling.SoundId then
    StopSound(PlasmaDrilling.SoundId)
    ReleaseSoundId(PlasmaDrilling.SoundId)
    PlasmaDrilling.SoundId = nil
  end
  if PlasmaDrilling.Prop and DoesEntityExist(PlasmaDrilling.Prop) then
    DeleteEntity(PlasmaDrilling.Prop)
  end
  PlasmaDrilling.Prop = nil
  if PlasmaDrilling.CameraHandle then
    DestroyCam(PlasmaDrilling.CameraHandle, false)
    RenderScriptCams(false, false, 0, true, true)
    PlasmaDrilling.CameraHandle = nil
  end
  StopGameplayCamShaking(true)
  FreezeEntityPosition(PlayerPedId(), false)
  ClearPedTasks(PlayerPedId())
end

PlasmaDrilling.DisableControls = function()
  for _,control in ipairs(PlasmaDrilling.DisabledControls) do
    DisableControlAction(0,control,true)
  end
end

setupDrillingCamera = function()
    if PlasmaDrilling.CameraHandle then
        DestroyCam(PlasmaDrilling.CameraHandle, false)
        RenderScriptCams(false, false, 0, true, true)
        PlasmaDrilling.CameraHandle = nil
    end
    
    local playerPed = PlayerPedId()
    
    PlasmaDrilling.CameraHandle = CreateCam("DEFAULT_SCRIPTED_CAMERA", true)
    AttachCamToEntity(PlasmaDrilling.CameraHandle, playerPed, 1, -0.65, 0.4, true)
    
    SetCamRot(PlasmaDrilling.CameraHandle, 0.0, 0.0, GetEntityHeading(playerPed) - -35.0, 2)
    SetCamFov(PlasmaDrilling.CameraHandle, 50.0)
    
    RenderScriptCams(true, true, 500, true, true)
end

beginnDrilling = function(callback)
  local ped = PlayerPedId()
  local animDict = "anim@heists@fleeca_bank@drilling"
  local animLib = "drill_straight_idle"

  Minigames.LoadAnimDict(animDict)
  
  SetCurrentPedWeapon(ped, GetHashKey("WEAPON_UNARMED"), true)
  Wait(500)

  local drillProp = GetHashKey('hei_prop_heist_drill')
  local boneIndex = GetPedBoneIndex(ped, 28422)

  TaskPlayAnim(ped, animDict, animLib, 1.0, -1.0, -1, 2, 0, 0, 0, 0)
  local attachedDrill = nil
  if Minigames.LoadModel(drillProp) then
    attachedDrill = CreateObject(drillProp, 1.0, 1.0, 1.0, true, true, false)
    SetModelAsNoLongerNeeded(drillProp)
    AttachEntityToEntity(attachedDrill, ped, boneIndex, 0.0, 0, 0.0, 0.0, 0.0, 0.0, true, true, false, false, 2, true)
    SetEntityAsMissionEntity(attachedDrill, true, true)
  end
  PlasmaDrilling.Prop = attachedDrill

  setupDrillingCamera()

  -- controls are shown by the controls HUD (client/core/controls.lua)

  Drilling.LoadSound() -- defined in fleecaDrilling.lua
  Wait(100)
  local soundId = GetSoundId()
  PlasmaDrilling.SoundId = soundId
  if attachedDrill then
    PlaySoundFromEntity(soundId, "Drill", attachedDrill, "DLC_HEIST_FLEECA_SOUNDSET", 1, 0)
  end

  ShakeGameplayCam("SKY_DIVING_SHAKE", 0.6)

  PlasmaDrilling.Type = 'VAULT_LASER'
  PlasmaDrilling.Start(function(status)
      if attachedDrill and DoesEntityExist(attachedDrill) then
        DeleteObject(attachedDrill)
        DeleteEntity(attachedDrill)
      end
      PlasmaDrilling.Prop = nil
      ClearPedTasksImmediately(ped)
      -- StopNow (watchdog / resource stop) already released the sound and cleared
      -- SoundId; releasing it again could free an id another script holds by now
      if PlasmaDrilling.SoundId == soundId then
        StopSound(soundId)
        ReleaseSoundId(soundId)
      end
      PlasmaDrilling.SoundId = nil
      StopGameplayCamShaking(true)

      if PlasmaDrilling.CameraHandle then
          DestroyCam(PlasmaDrilling.CameraHandle, false)
          RenderScriptCams(false, false, 500, true, true)
          PlasmaDrilling.CameraHandle = nil
      end

      stopDrilling(status)
      if callback then
          callback(status)
      end
  end)
end

stopDrilling = function(success)
  local ped = PlayerPedId()
  FreezeEntityPosition(ped, false)
  ClearPedTasks(ped)
  ClearPedSecondaryTask(ped)

  if success then
      notify(Minigames.T('Success'), Minigames.T('Plasma drilling complete!'), '#00ff00')
      TriggerEvent("glitch-minigames:plasmaDrillComplete", true)
  else
      notify(Minigames.T('Failed'), Minigames.T('Plasma drilling failed!'), '#ff0000')
      TriggerEvent("glitch-minigames:plasmaDrillComplete", false)
  end
end

local function clamp(value, min, max)
  if value < min then return min end
  if value > max then return max end
  return value
end

exports('StartPlasmaDrilling', function(difficultyOrCallback, optionalCallback)
    if PlasmaDrilling.Active then return false end
    
    local success = false
    local completed = false
    local difficulty = 5
    local userCallback
    
    if Minigames.IsCallable(difficultyOrCallback) then
        userCallback = difficultyOrCallback
    elseif type(difficultyOrCallback) == 'number' then
        difficulty = difficultyOrCallback
        userCallback = optionalCallback
    end
    
    PlasmaDrilling.Difficulty = clamp(difficulty, 1, 10)
    
    beginnDrilling(function(result)
        success = result
        completed = true
        
        if userCallback then
            userCallback(result)
            return
        end
    end)

    if not userCallback then
        while not completed do
            Wait(100)
        end
        
        return success
    end
end)

-- Lock watchdog (client/core/client.lua): end a stuck drill as a fail
Minigames.OnRelease(PlasmaDrilling.StopNow)

if config.DebugCommands then 
  RegisterCommand('testplasma', function()
      local success = exports[GetCurrentResourceName()]:StartPlasmaDrilling(5)
      if success then
          print("Drilling successful!")
      else
          print("Drilling failed!")
      end
  end, false)
end