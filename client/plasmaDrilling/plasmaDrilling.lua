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

PlasmaDrilling = {}

PlasmaDrilling.DisabledControls = {30,31,32,33,34,35}
PlasmaDrilling.CameraHandle = nil
PlasmaDrilling.ControlsNotificationId = nil

PlasmaDrilling.Start = function(callback)
    if not PlasmaDrilling.Active then
        PlasmaDrilling.Active = true
        PlasmaDrilling.Init()
        PlasmaDrilling.Update(callback)
    end
end

PlasmaDrilling.Init = function()
  if PlasmaDrilling.Scaleform then
    Scaleforms.UnloadMovie(PlasmaDrilling.Scaleform)
  end

  PlasmaDrilling.Scaleform = Scaleforms.LoadMovie(PlasmaDrilling.Type)
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
end

PlasmaDrilling.Update = function(callback)
  while PlasmaDrilling.Active do
    PlasmaDrilling.Draw()
    PlasmaDrilling.DisableControls()
    
    if IsEntityDead(PlayerPedId()) then
      print("Plasma drilling cancelled - player died")
      PlasmaDrilling.Result = false
      PlasmaDrilling.Active = false
      
      Scaleforms.PopVoid(PlasmaDrilling.Scaleform, "RESET")
      
      break
    end
    
    PlasmaDrilling.HandleControls()
    Wait(0)
  end
  callback(PlasmaDrilling.Result)
end

PlasmaDrilling.Draw = function()
  DrawScaleformMovieFullscreen(PlasmaDrilling.Scaleform,255,255,255,255,255)
end

PlasmaDrilling.HandleControls = function()
  local last_pos = PlasmaDrilling.DrillPos
  if IsControlJustPressed(0,188) then -- (UP)
    PlasmaDrilling.DrillPos = math.min(1.0,PlasmaDrilling.DrillPos + 0.01)
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
  else
    if PlasmaDrilling.DrillPos < PlasmaDrilling.HoleDepth then
      PlasmaDrilling.DrillTemp = math.max(0.0,PlasmaDrilling.DrillTemp - ( (0.05 * GetFrameTime()) *  math.max(0.005,(PlasmaDrilling.DrillSpeed * 10) /2)) )
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

PlasmaDrilling.DisableControls = function()
  for _,control in ipairs(PlasmaDrilling.DisabledControls) do
    DisableControlAction(0,control,true)
  end
end

PlasmaDrilling.EnableControls = function()
  for _,control in ipairs(PlasmaDrilling.DisabledControls) do
    DisableControlAction(0,control,true)
  end
end

function setupDrillingCamera()
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

function beginnDrilling(callback)
  local ped = PlayerPedId()
  local animDict = "anim@heists@fleeca_bank@drilling"
  local animLib = "drill_straight_idle"

  RequestAnimDict(animDict)
  while not HasAnimDictLoaded(animDict) do
      Wait(50)
  end
  
  SetCurrentPedWeapon(ped, GetHashKey("WEAPON_UNARMED"), true)
  Wait(500)

  local drillProp = GetHashKey('hei_prop_heist_drill')
  local boneIndex = GetPedBoneIndex(ped, 28422)

  RequestModel(drillProp)
  while not HasModelLoaded(drillProp) do
      Wait(100)
  end

  TaskPlayAnim(ped, animDict, animLib, 1.0, -1.0, -1, 2, 0, 0, 0, 0)
  local attachedDrill = CreateObject(drillProp, 1.0, 1.0, 1.0, true, true, false)
  AttachEntityToEntity(attachedDrill, ped, boneIndex, 0.0, 0, 0.0, 0.0, 0.0, 0.0, true, true, false, false, 2, true)
  SetEntityAsMissionEntity(attachedDrill, true, true)

  setupDrillingCamera()

  if config.usingGlitchNotifications then
    PlasmaDrilling.ControlsNotificationId = exports['glitch-notifications']:ShowNotification(
        'Plasma Drilling Controls',
        'Up/Down Arrow - Move Drill\n‎ ‎ ‎ ‎ ‎ Left/Right Arrow - Speed Up\nESC - Cancel',
        0,
        '#ff9f1c',
        false
    )
  end

  loadDrillSound()
  Wait(100)
  local soundId = GetSoundId()
  PlaySoundFromEntity(soundId, "Drill", attachedDrill, "DLC_HEIST_FLEECA_SOUNDSET", 1, 0)

  ShakeGameplayCam("SKY_DIVING_SHAKE", 0.6)

  PlasmaDrilling.Type = 'VAULT_LASER'
  PlasmaDrilling.Start(function(status)
      DeleteObject(attachedDrill)
      DeleteEntity(attachedDrill)
      ClearPedTasksImmediately(ped)
      StopSound(soundId)
      StopGameplayCamShaking(true)

      if PlasmaDrilling.CameraHandle then
          DestroyCam(PlasmaDrilling.CameraHandle, false)
          RenderScriptCams(false, false, 500, true, true)
          PlasmaDrilling.CameraHandle = nil
      end

      if PlasmaDrilling.ControlsNotificationId then
          exports['glitch-notifications']:RemoveNotification(PlasmaDrilling.ControlsNotificationId)
      end

      stopDrilling(status)
      if callback then
          callback(status)
      end
  end)
end

function robTimer()
	robTime = Config.RobberyTime * 60

	Citizen.CreateThread(function()
		repeat
			Citizen.Wait(1000)
			robTime = robTime - 1
		until robTime == 0
	end)
end

function stopDrilling(success)
  local ped = PlayerPedId()
  FreezeEntityPosition(ped, false)
  ClearPedTasks(ped)
  ClearPedSecondaryTask(ped)
  robTime = 0
  RobbingATM = false    

  if success then
      if config.usingGlitchNotifications then
        exports['glitch-notifications']:ShowNotification('Success', 'Plasma drilling complete!', 3000, '#00ff00', false)
      end
      TriggerEvent("glitch-minigames:plasmaDrillComplete", true)
  else
      if config.usingGlitchNotifications then
        exports['glitch-notifications']:ShowNotification('Failed', 'Plasma drilling failed!', 3000, '#ff0000', false)
      end
      TriggerEvent("glitch-minigames:plasmaDrillComplete", false)
  end
end

exports('StartPlasmaDrilling', function(difficulty)
    if PlasmaDrilling.Active then return false end
    
    local success = false
    local completed = false
    
    difficulty = difficulty or 5
    PlasmaDrilling.Difficulty = math.clamp(difficulty, 1, 10)
    
    beginnDrilling(function(result)
        success = result
        completed = true
    end)

    while not completed do
        Wait(100)
    end

    return success
end)

if config.DebugCommands then 
  RegisterCommand('testplasma', function()
      local success = exports['glitch-minigames']:StartPlasmaDrilling(5)
      if success then
          print("Drilling successful!")
      else
          print("Drilling failed!")
      end
  end, false)
end