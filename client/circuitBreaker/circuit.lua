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

--#region Static Variables

CircuitBreaker.HasCircuitFailed = false
local hasCircuitCompleted = false
local gameBounds = {
    vec2(0.159, 0.153), -- Top Left
    vec2(0.159, 0.848), -- Bottom Left
    vec2(0.841, 0.848), -- Bottom Right
    vec2(0.841, 0.153) -- Top Right
}
local textureDictionaries = {'MPCircuitHack', 'MPCircuitHack2', 'MPCircuitHack3'}
local gameEndTime
local gameStartTime
local delayedStartTime
local initCursorSpeed
local _cursorSpeed
local illegalAreas
local genericPorts
local _cursor
local _scaleform
local _currentDifficulty
local _currentLevelNumber
local _isEndScreenActive
local hackingKitVersionNumber
local isHackingKitDisconnected
local isDisconnectedScreenActive
local lastDisconnectCheckTime
local reconnectingTime
local backgroundSoundId
local trailSoundId
local startingHealth
local running = false        -- a circuit breaker game is on screen
local stopRequested = false  -- set by CircuitBreaker.StopNow (lock watchdog / resource stop)

--#endregion Static Variables

--#region Changeable Variables

local defaultDelayStartTimeMs <const> = 1000
local minDelayEndGameTimeMs <const> = 5000
local maxDelayEndGameTimeMs <const> = 5000
local defaultMinReconnectTimeMs <const> = 3000
local defaultMaxReconnectTimeMs <const> = 30000
local maxDisconnectChance <const> = 0.9
local minDisconnectCheckRateMs <const> = 500
local minCursorSpeed <const> = 0.00085
local maxCursorSpeed <const> = 0.01

local winOrLoss = false

---Returns the version number of the hacking kit item, number ranging from 1 to 3
---@return integer
local function getHackingKitVersionNumber()
    --local versionNumber = string.match(itemName, '%d+')
    return math.random(1, 3)
end

--#endregion Changeable Variables

---Gets the cursor maximum points.
---@param cursorCoords vector2
---@param cursorHeadSize number
---@return vector2[]
local function getCursorMaxPoints(cursorCoords, cursorHeadSize)
    local headPoint1 = vec2(cursorCoords.x - cursorHeadSize / 2, cursorCoords.y)
    local headPoint2 = vec2(cursorCoords.x - cursorHeadSize / 2, cursorCoords.y)
    local headPoint3 = vec2(cursorCoords.x, cursorCoords.y - cursorHeadSize / 2)
    local headPoint4 = vec2(cursorCoords.x, cursorCoords.y + cursorHeadSize / 2)

    return {headPoint1, headPoint2, headPoint3, headPoint4, cursorCoords}
end

---Determines whether the cursor is out of the specified poly bounds
---@param polyBounds vector2[][]
---@param mapBounds vector2[]
---@return boolean
local function isCursorOutOfBounds(polyBounds, mapBounds)
    local headPts = getCursorMaxPoints(_cursor.position, _cursor.cursorHeadSize + -0.375 * _cursor.cursorHeadSize)

    for i = 1, #headPts do
        for i2 = 1, #polyBounds do
            if CircuitBreaker.IsInPoly(polyBounds[i2], headPts[i]) then
                return true
            end
        end

        if not CircuitBreaker.IsInPoly(mapBounds, headPts[i]) then
            return true
        end
    end

    return false
end

local function disposeScaleform()
    if not _scaleform then return end

    SetScaleformMovieAsNoLongerNeeded(_scaleform)
    _scaleform = nil

    Wait(50)
end

local function disposeTextureDictionaries()
    for i = 1, #textureDictionaries do
        SetStreamedTextureDictAsNoLongerNeeded(textureDictionaries[i])
    end
end

-- Safe to call more than once: each sound id is stopped and released once and
-- then cleared, so a second call never touches an id another script owns by now
local function disposeSounds()
    if trailSoundId then
        StopSound(trailSoundId)
        ReleaseSoundId(trailSoundId)
        trailSoundId = nil
    end

    if backgroundSoundId then
        StopSound(backgroundSoundId)
        ReleaseSoundId(backgroundSoundId)
        backgroundSoundId = nil
    end

    ReleaseScriptAudioBank('DLC_MPHEIST/HEIST_HACK_SNAKE')
end

local function dispose()
    running = false
    disposeSounds()
    disposeTextureDictionaries()
    disposeScaleform()
end

local function endGame()
    dispose()
end

---Shows the display scaleform.
---@param title string
---@param msg string
---@param r integer
---@param g integer
---@param b integer
---@param stagePassed boolean
local function showDisplayScaleform(title, msg, r, g, b, stagePassed)
    if not _scaleform then return end

    BeginScaleformMovieMethod(_scaleform, 'SET_DISPLAY')

    ScaleformMovieMethodAddParamInt(0)
    ScaleformMovieMethodAddParamTextureNameString(title)
    ScaleformMovieMethodAddParamTextureNameString(msg)
    ScaleformMovieMethodAddParamInt(r)
    ScaleformMovieMethodAddParamInt(g)
    ScaleformMovieMethodAddParamInt(b)
    ScaleformMovieMethodAddParamBool(stagePassed)

    EndScaleformMovieMethod()
end

local function setScaleform()
    disposeScaleform()
    _scaleform = RequestScaleformMovie('HACKING_MESSAGE')

    local loadAttempt = 0
    while not HasScaleformMovieLoaded(_scaleform) do
        Wait(5)
        loadAttempt += 1
        if loadAttempt > 50 then
            break
        end
    end
end

local function initializeResources()
    for i = 1, #textureDictionaries do
        RequestStreamedTextureDict(textureDictionaries[i], false)
    end

    RequestScriptAudioBank('DLC_MPHEIST/HEIST_HACK_SNAKE', false)

    local timeout = GetGameTimer() + 5000
    while GetGameTimer() - timeout < 0 do
        local allLoaded = true
        for i = 1, #textureDictionaries do
            if not HasStreamedTextureDictLoaded(textureDictionaries[i]) then
                allLoaded = false
            end
        end
        if allLoaded then
            break
        end

        Wait(100)
    end

    for i = 1, #textureDictionaries do
        if not HasStreamedTextureDictLoaded(textureDictionaries[i]) then
            error(('Failed to load texture dictionary %s'):format(textureDictionaries[i]))
            break
        end
    end

    setScaleform()
    backgroundSoundId = GetSoundId()
    trailSoundId = GetSoundId()
end

---@param delayMs integer
local function playStartSound(delayMs)
    CreateThread(function()
        Wait(delayMs)
        -- the game may have ended (and released its sound ids) during the delay
        if not running or not trailSoundId then return end
        PlaySoundFrontend(-1, 'Start', 'DLC_HEIST_HACKING_SNAKE_SOUNDS', true)
        PlaySoundFrontend(trailSoundId, 'Trail_Custom', 'DLC_HEIST_HACKING_SNAKE_SOUNDS', true)
    end)
end

local function drawCursorAndPortSprites()
    _cursor:DrawCursor()
    _cursor:DrawTailHistory()

    genericPorts:DrawPorts()
end

---@param currentMap integer
local function drawMapSprite(currentMap)
    local levelTextureDict = currentMap > 3 and 'MPCircuitHack3' or 'MPCircuitHack2'
    DrawSprite(levelTextureDict, ('CBLevel%s'):format(_currentLevelNumber), 0.5, 0.5, 1, 1, 0, 255, 255, 255, 255)
end

---@param currentDifficulty Difficulty
---@return integer
local function getDisconnectCheckRateMsFromDifficulty(currentDifficulty)
    if currentDifficulty == CircuitBreaker.Difficulty.Beginner then
        return 10000
    elseif currentDifficulty == CircuitBreaker.Difficulty.Easy then
        return 2000
    elseif currentDifficulty == CircuitBreaker.Difficulty.Medium then
        return 1000
    elseif currentDifficulty == CircuitBreaker.Difficulty.Hard then
        return 500
    end

    return 10000
end

---@param currentDifficulty Difficulty
---@return integer
local function getDisconnectChanceFromDifficulty(currentDifficulty)
    if currentDifficulty == CircuitBreaker.Difficulty.Beginner then
        return 0
    elseif currentDifficulty == CircuitBreaker.Difficulty.Easy then
        return 0.15
    elseif currentDifficulty == CircuitBreaker.Difficulty.Medium then
        return 0.30
    elseif currentDifficulty == CircuitBreaker.Difficulty.Hard then
        return 0.45
    end

    return 0
end

---@param currentDifficulty Difficulty
---@return number
local function getCursorSpeedFromDifficulty(currentDifficulty)
    if currentDifficulty == CircuitBreaker.Difficulty.Beginner then
        return 0.00085
    elseif currentDifficulty == CircuitBreaker.Difficulty.Easy then
        return 0.002
    elseif currentDifficulty == CircuitBreaker.Difficulty.Medium then
        return 0.004
    elseif currentDifficulty == CircuitBreaker.Difficulty.Hard then
        return 0.006
    end

    return 0.00085
end

---@param currentDifficulty Difficulty
---@return number
local function getMaxSpeedIncreaseOnReconnect(currentDifficulty)
    if currentDifficulty == CircuitBreaker.Difficulty.Beginner then
        return 0.002
    elseif currentDifficulty == CircuitBreaker.Difficulty.Easy then
        return 0.004
    elseif currentDifficulty == CircuitBreaker.Difficulty.Medium then
        return 0.006
    elseif currentDifficulty == CircuitBreaker.Difficulty.Hard then
        return 0.01
    end

    return 0.002
end

---@param currentDifficulty Difficulty
---@return number
local function getCursorSpeedOnReconnect(currentDifficulty)
    if hackingKitVersionNumber == 3 then return _cursorSpeed end

    local maxSpeed = getMaxSpeedIncreaseOnReconnect(currentDifficulty) * 100000
    local speedDelta = math.random(0, CircuitBreaker.round(maxSpeed * 0.25, -1)) / 100000
    if math.random() > 0.75 then
        speedDelta *= -1
    end

    return CircuitBreaker.clamp(_cursorSpeed + speedDelta, initCursorSpeed, maxSpeed)
end

local function finishReconnection()
    PlaySoundFrontend(-1, 'Start', 'DLC_HEIST_HACKING_SNAKE_SOUNDS', true)
    setScaleform()
    isHackingKitDisconnected = false
    lastDisconnectCheckTime = GetGameTimer()
    _cursorSpeed = getCursorSpeedOnReconnect(_currentDifficulty)
end

---@return number
local function applyHackingKitBonusToCursorSpeed()
    return hackingKitVersionNumber == 3 and math.random(0, 2000) / 100000 or  0
end

---@return number
local function applyHackingKitBonusToReconnectTime()
    return hackingKitVersionNumber == 2 and -2000 or 0
end

---@return number
local function applyHackingKitBonusToDisconnectChance()
    return hackingKitVersionNumber == 2 and -0.15 or hackingKitVersionNumber == 3 and -0.2 or 0
end

---@return number
local function applyHackingKitBonusToDisconnectCheckRate()
    return hackingKitVersionNumber == 3 and 3000 or 0
end

---@param minReconnectTimeMs integer
---@param maxReconnectTimeMs integer
local function startReconnection(minReconnectTimeMs, maxReconnectTimeMs)
    minReconnectTimeMs = minReconnectTimeMs or defaultMinReconnectTimeMs
    maxReconnectTimeMs = maxReconnectTimeMs or defaultMaxReconnectTimeMs
    minReconnectTimeMs = CircuitBreaker.clamp(minReconnectTimeMs, defaultMinReconnectTimeMs, maxReconnectTimeMs)
    maxReconnectTimeMs = CircuitBreaker.clamp(maxReconnectTimeMs, minReconnectTimeMs + 1, defaultMaxReconnectTimeMs)

    PlaySoundFrontend(-1, 'Power_Down', 'DLC_HEIST_HACKING_SNAKE_SOUNDS', true)

    showDisplayScaleform('CONNECTION LOST', 'Reconnecting...', 188, 49, 43, false)

    local reconnectTime = math.random(minReconnectTimeMs, maxReconnectTimeMs) + applyHackingKitBonusToReconnectTime()
    reconnectingTime = GetGameTimer() + CircuitBreaker.clamp(reconnectTime, 0, reconnectTime)
end

---@param disconnectChance number
---@param disconnectCheckRateMs integer
local function checkIfHackingDisconnected(disconnectChance, disconnectCheckRateMs)
    disconnectCheckRateMs = disconnectCheckRateMs or minDisconnectCheckRateMs
    local maxDisconnectCheckRateMs = 10000
    disconnectCheckRateMs = CircuitBreaker.clamp(disconnectCheckRateMs, minDisconnectCheckRateMs, maxDisconnectCheckRateMs)

    if GetGameTimer() - (lastDisconnectCheckTime + disconnectCheckRateMs + applyHackingKitBonusToDisconnectCheckRate()) < 0 then return end

    disconnectChance += applyHackingKitBonusToDisconnectChance()
    isHackingKitDisconnected = math.random() < disconnectChance
    lastDisconnectCheckTime = GetGameTimer()
end

local function showFailureScreenAndPlaySound()
    PlaySoundFrontend(-1, 'Crash', 'DLC_HEIST_HACKING_SNAKE_SOUNDS', true)
    if trailSoundId then StopSound(trailSoundId) end
    showDisplayScaleform('CIRCUIT FAILED', 'Security Tunnel Detected', 188, 49, 43, false)
end

local function showSuccessScreenAndPlaySound()
    PlaySoundFrontend(-1, 'Goal', 'DLC_HEIST_HACKING_SNAKE_SOUNDS', true)
    if trailSoundId then StopSound(trailSoundId) end
    showDisplayScaleform('CIRCUIT COMPLETE', 'Decryption Execution x86 Tunneling', 45, 203, 134, true)
end

---@param cursorSpeed number
local function initializeCursorSpeed(cursorSpeed)
    cursorSpeed = CircuitBreaker.clamp(cursorSpeed - applyHackingKitBonusToCursorSpeed(), 0.001, cursorSpeed)
    initCursorSpeed = cursorSpeed
    _cursorSpeed = cursorSpeed
end

---@param levelNumber integer
---@param difficultyLevel Difficulty
---@param cursorSpeed number
---@param delayStartMs integer
local function initializeLevelVariables(levelNumber, difficultyLevel, cursorSpeed, delayStartMs)
    CircuitBreaker.HasCircuitFailed = false
    hasCircuitCompleted = false
    _isEndScreenActive = false
    isHackingKitDisconnected = false
    isDisconnectedScreenActive = false
    hackingKitVersionNumber = getHackingKitVersionNumber()
    _currentLevelNumber = levelNumber
    illegalAreas = CircuitBreaker.GetBoxBounds(levelNumber)
    genericPorts = CircuitBreaker.newGeneric(levelNumber)
    _cursor = CircuitBreaker.newCursor(genericPorts)
    initializeCursorSpeed(cursorSpeed)
    _currentDifficulty = difficultyLevel
    gameStartTime = GetGameTimer()
    delayedStartTime = gameStartTime + delayStartMs
    lastDisconnectCheckTime = gameStartTime + delayStartMs
    startingHealth = GetEntityHealth(PlayerPedId())
end

---@return boolean
local function isPlayerTakingDamage()
    local health = GetEntityHealth(PlayerPedId())
    if health < startingHealth then
        return true
    end

    if health > startingHealth then
        startingHealth = health
    end

    return false
end

---@param levelNumber integer
---@param difficultyLevel Difficulty
---@param cursorSpeed number
---@param delayStartMs integer
---@param minFailureDelayTimeMs integer
---@param maxFailureDelayTimeMs integer
---@param disconnectChance number
---@param disconnectCheckRateMs integer
---@param minReconnectTimeMs integer
---@param maxReconnectTimeMs integer
---@return GameStatus
local function runMinigameTask(levelNumber, difficultyLevel, cursorSpeed, delayStartMs, minFailureDelayTimeMs, maxFailureDelayTimeMs, disconnectChance, disconnectCheckRateMs, minReconnectTimeMs, maxReconnectTimeMs)
    if not NetworkIsSessionStarted() then
        Wait(1000)
        endGame()
        return CircuitBreaker.GameStatus.FailedToStart
    end

    stopRequested = false
    running = true
    initializeResources()

    PlaySoundFrontend(backgroundSoundId, 'Background', 'DLC_HEIST_HACKING_SNAKE_SOUNDS', true)
    playStartSound(delayStartMs)

    initializeLevelVariables(levelNumber, difficultyLevel, cursorSpeed, delayStartMs)

    while true do
        DisableAllControlActions(0)

        -- lock watchdog or resource stop (CircuitBreaker.StopNow): end as a quit
        if stopRequested then
            endGame()
            return CircuitBreaker.GameStatus.PlayerQuit
        end

        if IsEntityDead(PlayerPedId()) then
            -- endGame stops and releases both looping sounds
            PlaySoundFrontend(-1, 'Crash', 'DLC_HEIST_HACKING_SNAKE_SOUNDS', false)
            endGame()
            return CircuitBreaker.GameStatus.PlayerDied
        end

        -- shot or hurt mid-hack: the game fails and everything it loaded is released
        if isPlayerTakingDamage() then
            PlaySoundFrontend(-1, 'Crash', 'DLC_HEIST_HACKING_SNAKE_SOUNDS', false)
            endGame()
            return CircuitBreaker.GameStatus.TakingDamage
        end

        if IsDisabledControlPressed(0, 44) and not CircuitBreaker.HasCircuitFailed then -- INPUT_COVER (Q)
            endGame()
            return CircuitBreaker.GameStatus.PlayerQuit
        end

        drawMapSprite(_currentLevelNumber)

        drawCursorAndPortSprites()
        DrawScaleformMovieFullscreen(_scaleform, 255, 255, 255, 255, 0)

        if not _isEndScreenActive and genericPorts:IsCursorInGameWinningPosition(_cursor.position) then
            hasCircuitCompleted = true
            gameEndTime = GetGameTimer() + minDelayEndGameTimeMs

            showSuccessScreenAndPlaySound()
            _isEndScreenActive = true

            winOrLoss = true
        elseif not _isEndScreenActive and isCursorOutOfBounds(illegalAreas, gameBounds) or genericPorts:IsCollisionWithPort(_cursor.position) or _cursor:CheckTailCollision() then
            CircuitBreaker.HasCircuitFailed = true
            if _cursor.isAlive then
                _cursor.isAlive = false
                _cursor:StartCursorDeathAnimation()
            end

            if not _isEndScreenActive and not _cursor.isVisible then
                showFailureScreenAndPlaySound()
                gameEndTime = GetGameTimer() + math.random(minFailureDelayTimeMs, maxFailureDelayTimeMs)
                _isEndScreenActive = true

                winOrLoss = false
            end
        elseif not _isEndScreenActive and isHackingKitDisconnected then
            if not isDisconnectedScreenActive then
                startReconnection(minReconnectTimeMs, maxReconnectTimeMs)
                isDisconnectedScreenActive = true
            end

            if isDisconnectedScreenActive and GetGameTimer() - reconnectingTime >= 0 then
                finishReconnection()
                isDisconnectedScreenActive = false
            end
        end

        if not isHackingKitDisconnected and disconnectChance > 0 then
            checkIfHackingDisconnected(disconnectChance, disconnectCheckRateMs)
        end

        if GetGameTimer() - delayedStartTime >= 0 and not _isEndScreenActive and _cursor.isAlive and not isHackingKitDisconnected then
            _cursor:GetCursorInputFromPlayer()
            _cursor:MoveCursor(_cursorSpeed)
        end

        if _isEndScreenActive and (CircuitBreaker.HasCircuitFailed or hasCircuitCompleted) then
            if GetGameTimer() - gameEndTime >= 0 then
                if backgroundSoundId then StopSound(backgroundSoundId) end

                if hasCircuitCompleted then
                    PlaySoundFrontend(-1, 'Success', 'DLC_HEIST_HACKING_SNAKE_SOUNDS', true)
                end

                endGame()
                return hasCircuitCompleted and CircuitBreaker.GameStatus.Success or CircuitBreaker.GameStatus.Failure
            end
        end


        Wait(0)
    end
end

---@param levelNumber integer 1 - 6
---@param difficultyLevel Difficulty 0 - 3, take a look at globals.lua
---@param cursorSpeed number 0.0085 - 0.01, the limits of this can be redefined at the top of circuit.lua
---@param delayStartMs integer How long to delay the start in milliseconds
---@param minFailureDelayTimeMs integer How long to delay the failure screen at minimal in milliseconds
---@param maxFailureDelayTimeMs integer How long to delay the failure screen at the max in milliseconds
---@param disconnectChance number A decimal number between 0 and 1, the chance that it disconnects
---@param disconnectCheckRateMs integer The amount of time in milliseconds to check if it should disconnect using the disconnectChance
---@param minReconnectTimeMs integer The time in milliseconds it takes at minimal to reconnect after disconnecting by chance
---@param maxReconnectTimeMs integer The time in milliseconds it takes at the max to reconnect after disconnecting by chance
---@return boolean
local function runMiniGame(levelNumber, difficultyLevel, delayStartMs, minFailureDelayTimeMs, maxFailureDelayTimeMs, disconnectChance, disconnectCheckRateMs, minReconnectTimeMs, maxReconnectTimeMs)
    levelNumber = CircuitBreaker.clamp(levelNumber, 1, 6)
    difficultyLevel = CircuitBreaker.clamp(difficultyLevel, 0, 3)
    local cursorSpeed = getCursorSpeedFromDifficulty(difficultyLevel)
    delayStartMs = CircuitBreaker.clamp(delayStartMs, 1000, 60000)
    minFailureDelayTimeMs = CircuitBreaker.clamp(minFailureDelayTimeMs, minDelayEndGameTimeMs, maxFailureDelayTimeMs)
    maxFailureDelayTimeMs = CircuitBreaker.clamp(maxFailureDelayTimeMs, minDelayEndGameTimeMs, maxFailureDelayTimeMs > minFailureDelayTimeMs and maxFailureDelayTimeMs or minFailureDelayTimeMs + 1)
    disconnectChance = CircuitBreaker.clamp(disconnectChance, 0, maxDisconnectChance)
    local maxDisconnectCheckRateMs = 10000
    disconnectCheckRateMs = disconnectCheckRateMs or minDisconnectCheckRateMs
    disconnectCheckRateMs = CircuitBreaker.clamp(disconnectCheckRateMs, minDisconnectCheckRateMs, maxDisconnectCheckRateMs)
    minReconnectTimeMs = CircuitBreaker.clamp(minReconnectTimeMs, defaultMinReconnectTimeMs, maxReconnectTimeMs)
    maxReconnectTimeMs = CircuitBreaker.clamp(maxReconnectTimeMs, minReconnectTimeMs + 1, defaultMaxReconnectTimeMs)
    local ok, gameStatus = pcall(runMinigameTask, levelNumber, difficultyLevel, cursorSpeed, delayStartMs, minFailureDelayTimeMs, maxFailureDelayTimeMs, disconnectChance, disconnectCheckRateMs, minReconnectTimeMs, maxReconnectTimeMs)
    -- Every exit path, a script error included, ends here. dispose() is safe to
    -- repeat, so no early return can leave the looping sounds, scaleform or
    -- texture dictionaries behind.
    dispose()
    if not ok then
        print(('^1[glitch-minigames] circuit breaker error: %s^7'):format(tostring(gameStatus)))
        return false
    end
    return gameStatus == CircuitBreaker.GameStatus.Success
end

---@param levelNumber integer 1 - 6
---@param difficultyLevel Difficulty 0 - 3, take a look at globals.lua
---@return boolean
local function runDefaultMiniGameFromDifficulty(levelNumber, difficultyLevel)
    levelNumber = CircuitBreaker.clamp(levelNumber, 1, 6)
    difficultyLevel = CircuitBreaker.clamp(difficultyLevel, 0, 3)
    -- runMiniGame derives the cursor speed from difficultyLevel itself
    return runMiniGame(levelNumber, difficultyLevel, defaultDelayStartTimeMs, minDelayEndGameTimeMs, maxDelayEndGameTimeMs, getDisconnectChanceFromDifficulty(difficultyLevel), getDisconnectCheckRateMsFromDifficulty(difficultyLevel), defaultMinReconnectTimeMs, defaultMaxReconnectTimeMs)
end

---@return boolean
local function runDefaultMiniGame()
    local levelNumber = math.random(1, 3) -- < 3 is hard
    local difficultyLevel = 0
    return runMiniGame(levelNumber, difficultyLevel, defaultDelayStartTimeMs, minDelayEndGameTimeMs, maxDelayEndGameTimeMs, getDisconnectChanceFromDifficulty(difficultyLevel), getDisconnectCheckRateMsFromDifficulty(difficultyLevel), defaultMinReconnectTimeMs, defaultMaxReconnectTimeMs)
end

-- Ends a running game early as a quit. The lock watchdog calls it through
-- Minigames.OnRelease: the game loop sees the flag on its next frame and cleans
-- up. On resource stop (client/core/cleanup.lua) the loop never runs again, so
-- immediate = true stops the sounds and frees the assets right here.
function CircuitBreaker.StopNow(immediate)
    if not running then return end
    stopRequested = true
    if immediate then
        running = false
        disposeSounds()
        disposeTextureDictionaries()
        if _scaleform then
            SetScaleformMovieAsNoLongerNeeded(_scaleform)
            _scaleform = nil
        end
    end
end

Minigames.OnRelease(function() CircuitBreaker.StopNow(false) end)

-- Exports

exports('runMiniGame', runMiniGame)
exports('runDefaultMiniGameFromDifficulty', runDefaultMiniGameFromDifficulty)
exports('runDefaultRandom', runDefaultMiniGame)

exports('StartCircuitBreaker', function(levelNumber, difficultyLevel, delayStartMs, minFailureDelayTimeMs, maxFailureDelayTimeMs, disconnectChance, disconnectCheckRateMs, minReconnectTimeMs, maxReconnectTimeMs)
    levelNumber = levelNumber or math.random(1, 6)
    difficultyLevel = difficultyLevel or 0
    delayStartMs = delayStartMs or defaultDelayStartTimeMs
    minFailureDelayTimeMs = minFailureDelayTimeMs or minDelayEndGameTimeMs
    maxFailureDelayTimeMs = maxFailureDelayTimeMs or maxDelayEndGameTimeMs
    disconnectChance = disconnectChance or getDisconnectChanceFromDifficulty(difficultyLevel)
    disconnectCheckRateMs = disconnectCheckRateMs or getDisconnectCheckRateMsFromDifficulty(difficultyLevel)
    minReconnectTimeMs = minReconnectTimeMs or defaultMinReconnectTimeMs
    maxReconnectTimeMs = maxReconnectTimeMs or defaultMaxReconnectTimeMs
    
    return runMiniGame(levelNumber, difficultyLevel, delayStartMs, minFailureDelayTimeMs, maxFailureDelayTimeMs, disconnectChance, disconnectCheckRateMs, minReconnectTimeMs, maxReconnectTimeMs)
end)

if config.DebugCommands then
    RegisterCommand('testcircuit', function(source, args, rawCommand)
        local levelNumber = tonumber(args[1]) or 1
        local difficultyLevel = tonumber(args[2]) or 0

        local success = runDefaultMiniGameFromDifficulty(levelNumber, difficultyLevel)
        if success then
            Minigames.Debug('[testcircuit] completed')
        else
            Minigames.Debug('[testcircuit] failed')
        end
    end, false)
end