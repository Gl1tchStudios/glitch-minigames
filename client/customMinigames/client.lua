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

local isHacking = false
local successCount = 0
local isSequencing = false
local sequenceSuccessCount = 0
local disableMovementControls = false
local callback = nil
-- Distinguishes Firewall Pulse from the newer games, which also set isHacking.
local firewallActive = false

-- Every NUI focus change in this file goes through this wrapper so the key
-- forwarding thread knows when the NUI already has the keyboard (then the game
-- gets no key input and polling the controls every frame would be wasted).
local nuiHasKeyboard = false
local NativeSetNuiFocus = SetNuiFocus
local function SetNuiFocus(hasFocus, hasCursor)
    nuiHasKeyboard = hasFocus == true
    NativeSetNuiFocus(hasFocus, hasCursor)
end

-- Game id: moves on every time a game ends (cleanupMinigame) and is sent to the
-- NUI, which stamps it on every post (ui/js/app.js). A result, close or cancel
-- post stamped with an older id belongs to a game that is already over and is
-- ignored, so it can never resolve the next game. Posts without an id (the NUI
-- before its first update) are accepted.
local gameId = 1

local function IsCurrentGame(data)
    local id = type(data) == 'table' and tonumber(data.gameId) or nil
    return id == nil or id == gameId
end

-- set color configuration to NUI on resource start
Citizen.CreateThread(function()
    Citizen.Wait(500)
    local activeOpacity = config.BackgroundOpacity[config.ActiveVisualTheme] or 0.95
    
    SendNUIMessage({
        action = 'setColors',
        colors = config.Colors,
        visualTheme = config.ActiveVisualTheme,
        backgroundOpacity = activeOpacity,
        hudTheme = config.ActiveKeybindTheme,
        debug = config.DebugPrints,
        cancelKeys = config.CancelKeys,
        soundTheme = config.ActiveSoundTheme or 'gta',
        text = config.Text, -- player text overrides, applied to the game panels (ui/js/app.js)
        gameId = gameId,
    })
end)

-- true while code crack / word crack run: Backspace deletes there instead of cancelling
local backspaceTypes = false

local function cleanupMinigame()
    backspaceTypes = false
    isHacking = false
    isSequencing = false
    firewallActive = false
    disableMovementControls = false
    SetNuiFocus(false, false)
    EnableAllControlActions(0)
    -- this game is over: later posts from it carry the old id and are ignored
    gameId = gameId + 1
    SendNUIMessage({ action = 'setGameId', gameId = gameId })
end

-- Resets the Firewall Pulse, Backdoor Sequence and Circuit Rhythm state and
-- closes their NUI panels (death / cancel). Local only: nothing outside this
-- file can trigger it.
local function resetSequenceGames()
    cleanupMinigame()
    SendNUIMessage({ action = 'end' })
    SendNUIMessage({ action = 'endSequence' })
    SendNUIMessage({ action = 'endRhythm' })
    successCount = 0
    sequenceSuccessCount = 0
end

-- Control IDs per cancel-key name.
-- 200 = INPUT_FRONTEND_PAUSE (ESC). 322 is excluded - it's INPUT_FRONTEND_CANCEL
-- which also fires on right-click, causing games to cancel mid-play.
local CANCEL_KEY_CONTROLS = {
    BACKSPACE = { 177 },
    ESCAPE    = { 200 },
    ENTER     = { 18 },
}

-- Controls to watch/disable, built from config.CancelKeys.
local cancelControls = {}
do
    local seen = {}
    for _, name in ipairs(config.CancelKeys or {}) do
        local controls = CANCEL_KEY_CONTROLS[string.upper(name)]
        if controls then
            for _, ctrl in ipairs(controls) do
                if not seen[ctrl] then
                    seen[ctrl] = true
                    cancelControls[#cancelControls + 1] = ctrl
                end
            end
        end
    end
end

-- Closes the active minigame and reports failure to the caller.
local function cancelActiveMinigame()
    if not (isHacking or isSequencing) then return end
    Minigames.cancelled = true

    SendNUIMessage({ action = 'forceClose', reason = 'playerCancelled' })

    sequenceSuccessCount = 0
    successCount = 0

    if callback then
        callback(false)
        callback = nil
    end

    cleanupMinigame()
end

local function cancelMinigameOnDeath()
    Minigames.cancelled = true

    -- reset firewall / backdoor / rhythm state; forceClose then shuts every
    -- NUI game at once (app.js), same as the cancel key does
    resetSequenceGames()

    SendNUIMessage({
        action = 'forceClose',
        reason = 'playerDied',
        playerId = GetPlayerServerId(PlayerId())
    })

    cleanupMinigame()

    if callback then
        callback(false)
        callback = nil
    end
end

-- Key map for games that read keys without NUI keyboard focus (control id -> JS keyCode)
local keyMap = {
    [38] = 69,  -- E
    [22] = 32,  -- SPACE
    [23] = 70,  -- F
    [44] = 81,  -- Q
    [45] = 82,  -- R
    [245] = 84, -- T
    [246] = 89, -- Y
    [303] = 85, -- U
    [304] = 73, -- I
    [24] = 79,  -- O
    [25] = 80,  -- P
    [34] = 65,  -- A
    [32] = 87,  -- W (INPUT_MOVE_UP_ONLY)
    [33] = 83,  -- S (INPUT_MOVE_DOWN_ONLY)
    [35] = 68,  -- D (INPUT_MOVE_RIGHT_ONLY)
    [47] = 71,  -- G
    [74] = 72,  -- H
    [311] = 74, -- J
    [168] = 75, -- K (using different control code)
    [182] = 76, -- L
    [20] = 90,  -- Z
    [73] = 88,  -- X
    [26] = 67,  -- C
    [0] = 86,   -- V
    [29] = 66,  -- B
    [249] = 78, -- N
    [244] = 77, -- M
    [157] = 49, -- 1
    [158] = 50, -- 2
    [160] = 51, -- 3
    [164] = 52, -- 4
    [165] = 53, -- 5
    [159] = 54, -- 6
    [161] = 55, -- 7
    [162] = 56, -- 8
    [163] = 57, -- 9
    [307] = 48  -- 0 (using different control code)
}

-- Movement, combat and menu controls blocked while a game runs
local BLOCKED_CONTROLS = {
    1, 2,                         -- look left/right, up/down
    30, 31, 32, 33, 34, 35,       -- movement
    24, 25, 257,                  -- attack, aim, attack 2
    140, 141, 142, 143, 263, 264, -- melee
    106,                          -- vehicle mouse control override
    36, 44, 37,                   -- duck, cover, weapon wheel
    288, 289,                     -- phone, inventory
    199, 200,                     -- pause (P, ESC)
    170, 166, 167, 168, 169,      -- F3, F5, F6, F7, F8
}

local function DisableGameControls()
    for i = 1, #BLOCKED_CONTROLS do
        DisableControlAction(0, BLOCKED_CONTROLS[i], true)
    end
    -- cancel keys too, so ESC does not open the pause menu
    for i = 1, #cancelControls do
        DisableControlAction(0, cancelControls[i], true)
    end
end

-- Games without NUI keyboard focus (Bar Hit, Skill Check, Hold Zone) get their keys
-- forwarded from the game controls. Every key is watched for presses, because a
-- wrong key counts as a miss in those games, but only keys that are held down are
-- checked for a release: one native per key per frame instead of two.
local keyList = {}
for fivemCode, jsCode in pairs(keyMap) do
    keyList[#keyList + 1] = { fivemCode, jsCode }
end
local heldKeys = {} -- [control id] = js keyCode, keys pressed and not yet released

local function ForwardKeys()
    for i = 1, #keyList do
        local key = keyList[i]
        if IsDisabledControlJustPressed(0, key[1]) then
            heldKeys[key[1]] = key[2]
            SendNUIMessage({ action = 'keyPress', keyCode = key[2] })
        end
    end
    for fivemCode, jsCode in pairs(heldKeys) do
        if IsDisabledControlJustReleased(0, fivemCode) then
            heldKeys[fivemCode] = nil
            SendNUIMessage({ action = 'keyRelease', keyCode = jsCode })
        end
    end
end

-- One thread per game, started by every export below: blocked controls, cancel
-- keys, key forwarding and the death check. It ends with the game, so nothing in
-- this file polls while no game runs.
local gameLoopRunning = false

local function startGameLoop()
    if gameLoopRunning then return end
    gameLoopRunning = true
    Citizen.CreateThread(function()
        local nextDeathCheck = 0
        while isHacking or isSequencing do
            DisableGameControls()

            -- cancel on a configured key (keyboard games; mouse games use the UI callback)
            for _, ctrl in ipairs(cancelControls) do
                if not (backspaceTypes and ctrl == 177) and IsDisabledControlJustPressed(0, ctrl) then
                    cancelActiveMinigame()
                    break
                end
            end

            -- the NUI reads keys itself while it has keyboard focus: nothing to forward then
            if isHacking and not nuiHasKeyboard then ForwardKeys() end

            local now = GetGameTimer()
            if (isHacking or isSequencing) and now >= nextDeathCheck then
                nextDeathCheck = now + 500
                if IsEntityDead(PlayerPedId()) then cancelMinigameOnDeath() end
            end

            Citizen.Wait(0)
        end
        heldKeys = {}
        gameLoopRunning = false
    end)
end

RegisterNUICallback('hackSuccess', function(data, cb)
    cb('ok')
    if not IsCurrentGame(data) then return Minigames.Debug('hackSuccess from a finished game ignored') end
    cleanupMinigame()
    if callback then
        callback(true)
    end
end)

RegisterNUICallback('hackFail', function(data, cb)
    cb('ok')
    if not IsCurrentGame(data) then return Minigames.Debug('hackFail from a finished game ignored') end
    cleanupMinigame()
    if callback then
        callback(false)
    end
end)

-- UI cancel for mouse (NUI-focused) games; keyboard games use the game loop above.
RegisterNUICallback('minigameCancel', function(data, cb)
    cb('ok')
    if not IsCurrentGame(data) then return end
    cancelActiveMinigame()
end)

-- <name>Result and <name>Close for every NUI game. The result is always a real
-- boolean (data.success == true); the listed extra fields follow it in order.
local RESULT_FIELDS = {
    sequence         = {},
    rhythm           = { 'score', 'maxCombo' },
    keymash          = {},
    varHack          = {},
    memory           = {},
    sequenceMemory   = {},
    verbalMemory     = { 'score', 'strikes' },
    numberedSequence = {},
    symbolSearch     = {},
    pipePressure     = {},
    pairs            = { 'attempts', 'matchedPairs' },
    memoryColors     = { 'score', 'rounds' },
    untangle         = {},
    fingerprint      = {},
    codeCrack        = {},
    wordCrack        = {},
    balance          = {},
    aimTest          = { 'targetsHit', 'targetsMissed' },
    circleClick      = { 'successes', 'failures' },
    lockpick         = { 'successes', 'failures' },
    barHit           = { 'rounds', 'failures' },
    skillCheck       = { 'rounds', 'failures' },
    numberUp         = { 'reached', 'total', 'mistakes' },
    keys             = { 'reached', 'total', 'mistakes' },
    comboInput       = {},
    holdZone         = {},
    wireConnect      = {},
    simonSays        = {},
    shapeRecall      = {},
    memoryDiff       = {},
    traceroute       = {},
    carrierTune      = {},
}

local function CloseHandler(data, cb)
    cb('ok')
    if not IsCurrentGame(data) then return end
    cleanupMinigame()
end

for name, fields in pairs(RESULT_FIELDS) do
    RegisterNUICallback(name .. 'Result', function(data, cb)
        if not IsCurrentGame(data) then
            Minigames.Debug(name .. 'Result from a finished game ignored')
            return cb('ok')
        end
        cleanupMinigame()
        data = type(data) == 'table' and data or {}
        if callback then
            local extra = {}
            for i = 1, #fields do extra[i] = data[fields[i]] end
            callback(data.success == true, table.unpack(extra, 1, #fields))
        else
            Minigames.Debug(name .. 'Result arrived with no game waiting for it')
        end
        cb('ok')
    end)
    RegisterNUICallback(name .. 'Close', CloseHandler)
end
RegisterNUICallback('surgeClose', CloseHandler)   -- Surge Override (keymash) close

exports('StartFirewallPulse', function(requiredHacks, initialSpeed, maxSpeed, timeLimit, safeZoneMinWidth, safeZoneMaxWidth, safeZoneShrinkAmount)
    local p = promise.new()
    
    if isHacking then return false end
    
    local hackConfig = {
        requiredHacks = requiredHacks or 3,
        initialSpeed = initialSpeed or 2,
        maxSpeed = maxSpeed or 10,
        timeLimit = timeLimit or 10,
        safeZoneMinWidth = safeZoneMinWidth or 40,
        safeZoneMaxWidth = safeZoneMaxWidth or 120,
        safeZoneShrinkAmount = safeZoneShrinkAmount or 10
    }
    
    isHacking = true
    firewallActive = true
    disableMovementControls = true
    SetNuiFocus(true, true)

    callback = function(success)
        p:resolve(success)
        callback = nil
    end

    SendNUIMessage({
        action = 'start',
        config = hackConfig
    })

    startGameLoop()
    return Citizen.Await(p)
end)

exports('StartBackdoorSequence', function(requiredSequences, sequenceLength, timeLimit, maxAttempts, timePenalty, minSimultaneousKeys, maxSimultaneousKeys, customKeys, keyHintText)
    local p = promise.new()
    
    if isHacking or isSequencing then return false end
    
    local sequenceConfig = {
        requiredSequences = requiredSequences or 3,
        sequenceLength = sequenceLength or 5,
        timeLimit = timeLimit or 15,
        maxAttempts = maxAttempts or 3,
        timePenalty = timePenalty or 1.0,
        minSimultaneousKeys = minSimultaneousKeys or 1,
        maxSimultaneousKeys = maxSimultaneousKeys or 3,
        possibleKeys = customKeys,
        keyHintText = keyHintText
    }
    
    callback = function(success)
        p:resolve(success)
        callback = nil
    end
    
    isSequencing = true
    disableMovementControls = true
    SetNuiFocus(true, false)
    SendNUIMessage({ 
        action = 'startSequence',
        config = sequenceConfig
    })
    
    startGameLoop()
    return Citizen.Await(p)
end)

exports('StartCircuitRhythm', function(lanes, keys, noteSpeed, noteSpawnRate, requiredNotes, difficulty, maxWrongKeys, maxMissedNotes)
    local p = promise.new()
    
    if isHacking or isSequencing then return false end
    
    local rhythmConfig = {
        lanes = lanes or 4,
        keys = keys,
        noteSpeed = noteSpeed or 150,
        noteSpawnRate = noteSpawnRate or 1000,
        requiredNotes = requiredNotes or 20,
        difficulty = difficulty or "normal",
        maxWrongKeys = maxWrongKeys or 5,
        maxMissedNotes = maxMissedNotes or 3
    }
    
    callback = function(success, score, maxCombo)
        p:resolve(success)
        callback = nil
    end
    
    isHacking = true
    disableMovementControls = true
    SetNuiFocus(true, false)
    SendNUIMessage({ 
        action = 'startRhythm',
        config = rhythmConfig
    })
    
    startGameLoop()
    return Citizen.Await(p)
end)

exports('StartSurgeOverride', function(possibleKeys, requiredPresses, decayRate)
    local p = promise.new()
    
    if isHacking or isSequencing then return false end
    
    if not possibleKeys or #possibleKeys == 0 then
        possibleKeys = {'E'}
    end
    
    local keymashConfig = {
        possibleKeys = possibleKeys,
        keyPressValue = 100 / (requiredPresses or 50),
        decayRate = decayRate or 2
    }
    
    callback = function(success)
        p:resolve(success)
        callback = nil
    end
    
    isHacking = true
    disableMovementControls = true
    SetNuiFocus(true, false)
    SendNUIMessage({
        action = 'startKeymash',
        config = keymashConfig
    })
    
    startGameLoop()
    return Citizen.Await(p)
end)

exports('StartVarHack', function(blocks, speed)
    local p = promise.new()
    
    if isHacking then return false end
    
    local varConfig = {
        blocks = blocks or 5,
        speed = speed or 5
    }
    
    callback = function(success)
        p:resolve(success)
        callback = nil
    end
    
    isHacking = true
    disableMovementControls = true
    SetNuiFocus(true, true)
    SendNUIMessage({ 
        action = 'startVarHack',
        config = varConfig
    })
    
    startGameLoop()
    return Citizen.Await(p)
end)

exports('StartMemoryGame', function(gridSize, squareCount, rounds, showTime, maxWrongPresses)
    local p = promise.new()
    
    if isHacking then return false end
      local memoryConfig = {
        gridSize = gridSize or 5,
        squareCount = squareCount or 8,
        rounds = rounds or 3,
        showTime = showTime or 3000,
        maxWrongPresses = maxWrongPresses or 3
    }
    
    callback = function(success)
        p:resolve(success)
        callback = nil
    end
    
    isHacking = true
    disableMovementControls = true
    SetNuiFocus(true, true)
    SendNUIMessage({ 
        action = 'startMemory',
        config = memoryConfig
    })
    startGameLoop()
    return Citizen.Await(p)
end)

exports('StartSequenceMemoryGame', function(gridSize, maxRounds, maxWrongPresses, showTime, delayBetween)
    local p = promise.new()
    
    if isHacking then return false end
    
    local sequenceConfig = {
        gridSize = gridSize or 4,
        maxRounds = maxRounds or 5,
        rounds = maxRounds or 5, -- sequenceMemory.js reads config.rounds (maxRounds alone was ignored: always 5)
        maxWrongPresses = maxWrongPresses or 3,
        showTime = showTime or 1000,
        delayBetween = delayBetween or 300
    }
    
    callback = function(success)
        p:resolve(success)
        callback = nil
    end
    
    isHacking = true
    disableMovementControls = true
    SetNuiFocus(true, true)    SendNUIMessage({ 
        type = 'startSequenceMemory',
        config = sequenceConfig
    })
    
    startGameLoop()
    return Citizen.Await(p)
end)

exports('StartVerbalMemoryGame', function(maxStrikes, wordsToShow, wordDuration)
    local p = promise.new()
    
    if isHacking then return false end
      local verbalConfig = {
        maxStrikes = maxStrikes or 3,
        wordsToShow = wordsToShow or 50,
        wordDuration = wordDuration or 5000 
    }
    
    callback = function(success, score, strikes)
        p:resolve({success = success, score = score, strikes = strikes})
        callback = nil
    end
    
    isHacking = true
    disableMovementControls = true
    SetNuiFocus(true, true)
    SendNUIMessage({ 
        action = 'startVerbalMemory',
        config = verbalConfig
    })
    
    startGameLoop()
    return Citizen.Await(p)
end)

exports('StartNumberedSequenceGame', function(gridSize, sequenceLength, rounds, showTime, guessTime, maxWrongPresses)
    local p = promise.new()
    
    if isHacking then return false end
    
    local numberedConfig = {
        gridSize = gridSize or 4,
        sequenceLength = sequenceLength or 6,
        rounds = rounds or 3,
        showTime = showTime or 4000,
        guessTime = guessTime or 10000,
        maxWrongPresses = maxWrongPresses or 3
    }
    
    callback = function(success)
        p:resolve(success)
        callback = nil
    end
    
    isHacking = true
    disableMovementControls = true
    SetNuiFocus(true, true)
    SendNUIMessage({ 
        action = 'startNumberedSequence',
        config = numberedConfig
    })
    
    startGameLoop()
    return Citizen.Await(p)
end)

exports('StartSymbolSearchGame', function(gridSize, shiftInterval, timeLimit, minKeyLength, maxKeyLength, symbolType)
    local p = promise.new()
    
    if isHacking then return false end
    
    minKeyLength = math.max(1, math.min(6, minKeyLength or 1))
    maxKeyLength = math.max(1, math.min(6, maxKeyLength or 1))
    
    if minKeyLength > maxKeyLength then
        minKeyLength = maxKeyLength
    end
    
    local symbolSearchConfig = {
        gridSize = gridSize or 8,
        shiftInterval = shiftInterval or 2500,
        timeLimit = timeLimit or 30000,
        minKeyLength = minKeyLength,
        maxKeyLength = maxKeyLength,
    }
    
    if type(symbolType) == "table" then
        symbolSearchConfig.symbols = symbolType
    elseif type(symbolType) == "string" then
        symbolSearchConfig.symbolType = symbolType
    else
        symbolSearchConfig.symbolType = "symbols"
    end
    
    callback = function(success)
        p:resolve(success)
        callback = nil
    end
    
    isHacking = true
    disableMovementControls = true
    SetNuiFocus(true, true)
    SendNUIMessage({ 
        action = 'startSymbolSearch',
        config = symbolSearchConfig
    })
    
    startGameLoop()
    return Citizen.Await(p)
end)

exports('StartPipePressureGame', function(gridSize, timeLimit)
    local p = promise.new()
    
    if isHacking then return false end
    
    local pipeConfig = {
        gridSize = gridSize or 6,
        timeLimit = timeLimit or 30000
    }
    
    callback = function(success)
        p:resolve(success)
        callback = nil
    end
    
    isHacking = true
    disableMovementControls = true
    SetNuiFocus(true, true)
    SendNUIMessage({ 
        action = 'startPipePressure',
        config = pipeConfig
    })
    
    startGameLoop()
    return Citizen.Await(p)
end)

exports('StartPairsGame', function(gridSize, timeLimit, maxAttempts)
    local p = promise.new()
    
    if isHacking then return false end
    
    local pairsConfig = {
        gridSize = gridSize or 4,
        timeLimit = timeLimit or 120000, -- Time limit (in ms) or 0 for unlimited
        maxAttempts = maxAttempts or 0 -- Max attempts or 0 for unlimited
    }
    
    callback = function(success, attempts, matchedPairs)
        p:resolve(success)
        callback = nil
    end
    
    isHacking = true
    disableMovementControls = true
    SetNuiFocus(true, true)
    SendNUIMessage({ 
        action = 'startPairs',
        config = pairsConfig
    })
    
    startGameLoop()
    return Citizen.Await(p)
end)

exports('StartMemoryColorsGame', function(gridSize, memorizeTime, answerTime, rounds)
    local p = promise.new()
    
    if isHacking then return false end
    
    local mcConfig = {
        gridSize = gridSize or 5,
        memorizeTime = memorizeTime or 5000,
        answerTime = answerTime or 10000,
        rounds = rounds or 3
    }
    
    callback = function(success, score, totalRounds)
        p:resolve(success)
        callback = nil
    end
    
    isHacking = true
    disableMovementControls = true
    SetNuiFocus(true, true)
    SendNUIMessage({ 
        action = 'startMemoryColors',
        config = mcConfig
    })
    
    startGameLoop()
    return Citizen.Await(p)
end)

exports('StartUntangleGame', function(nodeCount, timeLimit)
    local p = promise.new()
    
    if isHacking then return false end
    
    local untangleConfig = {
        nodeCount = nodeCount or 8,
        timeLimit = timeLimit or 60000 -- 60 seconds default
    }
    
    callback = function(success)
        p:resolve(success)
        callback = nil
    end
    
    isHacking = true
    disableMovementControls = true
    SetNuiFocus(true, true)
    SendNUIMessage({ 
        action = 'startUntangle',
        config = untangleConfig
    })
    
    startGameLoop()
    return Citizen.Await(p)
end)

exports('StartFingerprintGame', function(timeLimit, showAlignedCount, showCorrectIndicator)
    local p = promise.new()
    
    if isHacking then return false end
    
    local fingerprintConfig = {
        timeLimit = timeLimit or 30000, -- 30 seconds default
        showAlignedCount = showAlignedCount ~= false, -- default true
        showCorrectIndicator = showCorrectIndicator ~= false -- default true
    }
    
    callback = function(success)
        p:resolve(success)
        callback = nil
    end
    
    isHacking = true
    disableMovementControls = true
    SetNuiFocus(true, true)
    SendNUIMessage({ 
        action = 'startFingerprint',
        config = fingerprintConfig
    })
    
    startGameLoop()
    return Citizen.Await(p)
end)

exports('StartCodeCrackGame', function(timeLimit, digitCount, maxAttempts)
    local p = promise.new()
    
    if isHacking then return false end
    
    local codeCrackConfig = {
        timeLimit = timeLimit or 60000, -- 60 seconds default
        digitCount = digitCount or 4, -- 4 digits default
        maxAttempts = maxAttempts or 6 -- 6 attempts default
    }
    
    callback = function(success)
        p:resolve(success)
        callback = nil
    end
    
    isHacking = true
    backspaceTypes = true
    disableMovementControls = true
    SetNuiFocus(true, true)
    SendNUIMessage({
        action = 'startCodeCrack',
        config = codeCrackConfig
    })
    
    startGameLoop()
    return Citizen.Await(p)
end)

exports('StartWordCrackGame', function(timeLimit, wordLength, maxAttempts)
    local p = promise.new()
    
    if isHacking then return false end
    
    local wordCrackConfig = {
        timeLimit = timeLimit or 120000, -- 120 seconds default
        wordLength = wordLength or 5, -- 5 letters default
        maxAttempts = maxAttempts or 6 -- 6 attempts default
    }
    
    callback = function(success)
        p:resolve(success)
        callback = nil
    end
    
    isHacking = true
    backspaceTypes = true
    disableMovementControls = true
    SetNuiFocus(true, true)
    SendNUIMessage({
        action = 'startWordCrack',
        config = wordCrackConfig
    })
    
    startGameLoop()
    return Citizen.Await(p)
end)

exports('StartBalanceGame', function(timeLimit, driftSpeed, sensitivity, greenZoneWidth, yellowZoneWidth, driftRandomness, maxDangerTime)
    local p = promise.new()
    
    if isHacking then return false end
    
    local balanceConfig = {
        timeLimit = timeLimit or 10000, -- 10 seconds default
        driftSpeed = driftSpeed or 3, -- How fast needle drifts
        sensitivity = sensitivity or 8, -- How much Q/E moves needle
        greenZoneWidth = greenZoneWidth or 30, -- Width of safe green zone
        yellowZoneWidth = yellowZoneWidth or 25, -- Width of warning yellow zone
        driftRandomness = driftRandomness or 2, -- How unpredictable the drift is
        maxDangerTime = maxDangerTime or 1000 -- Time allowed in red before fail (ms)
    }
    
    callback = function(success)
        p:resolve(success)
        callback = nil
    end
    
    isHacking = true
    disableMovementControls = true
    SetNuiFocus(true, false)
    SendNUIMessage({ 
        action = 'startBalance',
        config = balanceConfig
    })
    
    startGameLoop()
    return Citizen.Await(p)
end)

exports('StartAimTestGame', function(timeLimit, targetsToHit, targetLifetime, targetSize, shrinkTarget, maxMisses, timePenalty)
    local p = promise.new()
    
    if isHacking then return false end
    
    local aimTestConfig = {
        timeLimit = timeLimit or 30000, -- 30 seconds default
        targetsToHit = targetsToHit or 10, -- Number of targets to win
        targetLifetime = targetLifetime or 1500, -- How long target stays (ms)
        targetSize = targetSize or 60, -- Target diameter in pixels
        shrinkTarget = shrinkTarget ~= false, -- Whether target shrinks over time
        maxMisses = maxMisses or 5, -- Max missed targets before fail
        timePenalty = timePenalty or 0 -- Time removed on miss (ms), 0 = disabled
    }
    
    callback = function(success, targetsHit, targetsMissed)
        p:resolve(success)
        callback = nil
    end
    
    isHacking = true
    disableMovementControls = true
    SetNuiFocus(true, true)
    SendNUIMessage({ 
        action = 'startAimTest',
        config = aimTestConfig
    })
    
    startGameLoop()
    return Citizen.Await(p)
end)

local function StartCircleClick(rounds, rotationSpeed, targetZoneSize, maxFailures, speedIncrease, randomizeDirection, keys, timeoutRotations)
    local p = promise.new()
    
    if isHacking then return false end
    
    local circleClickConfig = {
        rounds = rounds or 5, -- Number of rounds to complete
        rotationSpeed = rotationSpeed or 2, -- Degrees per frame
        targetZoneSize = targetZoneSize or 45, -- Target zone in degrees
        maxFailures = maxFailures or 3, -- Max failures before game over
        speedIncrease = speedIncrease or 0.15, -- Speed increase per round
        randomizeDirection = randomizeDirection ~= false, -- Randomize rotation direction
        keys = keys or {'W', 'A', 'S', 'D'}, -- Possible keys to display
        timeoutRotations = tonumber(timeoutRotations) or 1 -- Full turns per round without a press = miss (0 = never)
    }
    
    callback = function(success, successes, failures)
        p:resolve(success)
        callback = nil
    end
    
    isHacking = true
    disableMovementControls = true
    SetNuiFocus(true, false)
    SendNUIMessage({ 
        action = 'startCircleClick',
        config = circleClickConfig
    })

    startGameLoop()
    return Citizen.Await(p)
end

exports('StartCircleClickGame', StartCircleClick)

-- ox_lib lib.skillCheck is redirected here (patched ox_lib skillcheck.lua).
-- Own export name so the wrapper gives no hacking XP / perks for everyday skill checks.
-- difficulty: 'easy' | 'medium' | 'hard' | { areaSize, speedMultiplier }, or a list of those (one round each)
local OX_DIFFICULTY = {
    easy = { areaSize = 45, speedMultiplier = 1 },
    medium = { areaSize = 35, speedMultiplier = 1.5 },
    hard = { areaSize = 22, speedMultiplier = 1.75 },
}

exports('OxSkillCheck', function(difficulty, inputs)
    local list = (type(difficulty) == 'table' and difficulty[1] ~= nil) and difficulty or { difficulty }
    local n, area, firstSpeed, lastSpeed = 0, 0, nil, nil
    for _, d in ipairs(list) do
        local cfg = type(d) == 'table' and d or OX_DIFFICULTY[d] or OX_DIFFICULTY.easy
        local speed = (tonumber(cfg.speedMultiplier) or 1) * 2.55 -- degrees per frame (2026-11-07: 1.5 -> 2.55, player feedback: too slow, easy lap ~2.4 s)
        n = n + 1
        area = area + (tonumber(cfg.areaSize) or 50)
        firstSpeed = firstSpeed or speed
        lastSpeed = speed
    end
    if n == 0 then return false end

    local keys = {}
    for _, k in ipairs(type(inputs) == 'table' and inputs or {}) do
        keys[#keys + 1] = tostring(k):upper()
    end
    if #keys == 0 then keys = { 'E' } end

    -- ox rules: every round must be hit, one miss fails the whole check
    local speedIncrease = n > 1 and (lastSpeed - firstSpeed) / (n - 1) or 0
    return StartCircleClick(n, firstSpeed, math.floor(area / n), 1, speedIncrease, true, keys) == true
end)

-- Used by ox_lib lib.cancelSkillCheck (rawExports in core/client.lua)
Minigames.CancelActive = cancelActiveMinigame
-- Lock watchdog (core/client.lua): close a stuck NUI game, its export returns false
Minigames.OnRelease(cancelActiveMinigame)

-- style (optional): 'dial' | 'arc' | 'dots' | 'realistic' | 'padlock', default config.LockpickStyle
exports('StartLockpickGame', function(rounds, sweetSpotSize, maxFailures, shakeRange, lockTime, style)
    local p = promise.new()
    
    if isHacking then return false end
    
    local lockpickConfig = {
        rounds = rounds or 3, -- number of locks to pick
        sweetSpotSize = sweetSpotSize or 30, -- sweet spot size in degrees (smaller = harder)
        maxFailures = maxFailures or 2, -- max failures before game over
        shakeRange = shakeRange or 40, -- how far from sweet spot shake starts (degrees)
        lockTime = lockTime or 350, -- how long to hold to lock (ms); each lock after the first gets harder (ui/js/lockpick.js)
        style = style or config.LockpickStyle or 'dial'
    }
    
    callback = function(success, successes, failures)
        p:resolve(success)
        callback = nil
    end
    
    isHacking = true
    disableMovementControls = true
    SetNuiFocus(true, true) -- cursor on: the pick is turned by dragging around the lock
    SendNUIMessage({ 
        action = 'startLockpick',
        config = lockpickConfig
    })
    
    startGameLoop()
    return Citizen.Await(p)
end)

-- texts (optional): { success = 'ORE CUT', fail = 'MISSED' } replaces ACCESS GRANTED / DENIED
exports('StartBarHitGame', function(key, rounds, speed, zoneSize, zoneStart, maxFailures, timeLimit, texts)
    local p = promise.new()

    if isHacking then return false end

    local barHitConfig = {
        key = key or 'E',             -- key the player must press
        rounds = rounds or 3,         -- rounds to win
        speed = speed or 55,          -- bar speed (% per second, higher = faster)
        zoneSize = zoneSize or 20,    -- target zone width in % (10-40)
        zoneStart = zoneStart,        -- fixed zone position %, nil = random each round
        maxFailures = maxFailures or 3, -- wrong presses before fail
        timeLimit = timeLimit or 30000, -- overall time limit in ms
        successText = type(texts) == 'table' and texts.success or nil,
        failText = type(texts) == 'table' and texts.fail or nil,
    }

    callback = function(success, roundsCompleted, failures)
        p:resolve(success)
        callback = nil
    end

    isHacking = true
    disableMovementControls = true
    SetNuiFocus(false, false)        -- bar hit uses key forwarding (isHacking thread), not NUI focus
    SendNUIMessage({
        action = 'startBarHit',
        config = barHitConfig
    })

    startGameLoop()
    return Citizen.Await(p)
end)

exports('StartSkillCheckGame', function(keys, speed, timeLimit, zoneSize, perfectZoneSize, maxFailures, randomizeZone)
    local p = promise.new()

    if isHacking then return false end

    if not keys or #keys == 0 then
        keys = {'E', 'F', 'R'}
    end

    local skillCheckConfig = {
        keys = keys,                            -- array of keys, one per round (length = number of rounds)
        speed = speed or 65,                    -- bar speed (% per second)
        timeLimit = timeLimit or 15000,         -- total time limit (ms)
        zoneSize = zoneSize or 18,              -- normal zone width % (10-35)
        perfectZoneSize = perfectZoneSize or 5, -- perfect inner zone width % (0 = disabled)
        maxFailures = maxFailures or 1,         -- misses/wrong keys before fail
        randomizeZone = randomizeZone ~= false  -- randomise zone position each round
    }

    callback = function(success, rounds, failures)
        p:resolve(success)
        callback = nil
    end

    isHacking = true
    disableMovementControls = true
    SetNuiFocus(false, false) -- key forwarding via isHacking thread
    SendNUIMessage({
        action = 'startSkillCheck',
        config = skillCheckConfig
    })

    startGameLoop()
    return Citizen.Await(p)
end)

exports('StartNumberUpGame', function(count, timeLimit, gridCols, maxMistakes)
    local p = promise.new()

    if isHacking then return false end

    local numberUpConfig = {
        count = count or 20,            -- highest number (1 to N)
        timeLimit = timeLimit or 30000, -- time limit in ms
        gridCols = gridCols or 4,       -- number of grid columns
        maxMistakes = maxMistakes or 3  -- wrong clicks before fail
    }

    callback = function(success, reached, total, mistakes)
        p:resolve(success)
        callback = nil
    end

    isHacking = true
    disableMovementControls = true
    SetNuiFocus(true, true) -- needs mouse clicks
    SendNUIMessage({
        action = 'startNumberUp',
        config = numberUpConfig
    })

    startGameLoop()
    return Citizen.Await(p)
end)

exports('StartKeysGame', function(count, timeLimit, gridCols, maxMistakes, letters)
    local p = promise.new()

    if isHacking then return false end

    local keysConfig = {
        count = count or 18,            -- how many letters to press
        timeLimit = timeLimit or 15000, -- time limit in ms
        gridCols = gridCols or 6,       -- number of grid columns
        maxMistakes = maxMistakes or 3, -- wrong presses before fail
        letters = letters               -- optional string of letters to draw from (nil = A-Z)
    }

    callback = function(success, reached, total, mistakes)
        p:resolve(success)
        callback = nil
    end

    isHacking = true
    disableMovementControls = true
    SetNuiFocus(true, true) -- full NUI focus so all keydown events reach the browser reliably
    SendNUIMessage({
        action = 'startKeys',
        config = keysConfig
    })

    startGameLoop()
    return Citizen.Await(p)
end)

exports('StartComboInputGame', function(rounds, comboLength, timePerCombo, maxFailures, lengthIncrease)
    local p = promise.new()

    if isHacking then return false end

    local comboConfig = {
        rounds         = rounds or 3,        -- number of combos to complete
        comboLength    = comboLength or 4,   -- arrows in first combo
        timePerCombo   = timePerCombo or 6,  -- seconds per combo
        maxFailures    = maxFailures or 2,   -- failed combos before lose
        lengthIncrease = lengthIncrease or 0 -- extra arrow added per round
    }

    callback = function(success)
        p:resolve(success)
        callback = nil
    end

    isHacking = true
    disableMovementControls = true
    SetNuiFocus(true, true) -- full NUI focus so all keydown events reach the browser reliably
    SendNUIMessage({
        action = 'startComboInput',
        config = comboConfig
    })

    startGameLoop()
    return Citizen.Await(p)
end)

exports('StartHoldZoneGame', function(key, rounds, speed, zoneSize, perfectZoneSize, maxFailures, idleTimeout)
    local p = promise.new()

    if isHacking then return false end

    local holdConfig = {
        key             = key or 'E',           -- key to hold and release
        rounds          = rounds or 3,          -- rounds to win
        speed           = speed or 18,          -- ring shrink speed (% per second when held)
        zoneSize        = zoneSize or 18,       -- success zone width %
        perfectZoneSize = perfectZoneSize or 0, -- inner perfect zone % (0 = disabled)
        maxFailures     = maxFailures or 2,     -- failed releases before lose
        idleTimeout     = idleTimeout or 10     -- seconds before auto-fail if player never presses key (0 = disabled)
    }

    callback = function(success)
        p:resolve(success)
        callback = nil
    end

    isHacking = true
    disableMovementControls = true
    SetNuiFocus(false, false) -- key forwarding via isHacking thread
    SendNUIMessage({
        action = 'startHoldZone',
        config = holdConfig
    })

    startGameLoop()
    return Citizen.Await(p)
end)

exports('StartWireConnectGame', function(wireCount, timeLimit)
    local p = promise.new()

    if isHacking then return false end

    local wireConfig = {
        wireCount = wireCount or 8, -- number of cables (3-8), placed at random spots each game
        timeLimit = timeLimit or 0  -- seconds, 0 = no time limit
    }

    callback = function(success)
        p:resolve(success)
        callback = nil
    end

    isHacking = true
    disableMovementControls = true
    SetNuiFocus(true, true) -- needs mouse for clicking terminals
    SendNUIMessage({
        action = 'startWireConnect',
        config = wireConfig
    })

    startGameLoop()
    return Citizen.Await(p)
end)

exports('StartSimonSaysGame', function(rounds, flashSpeed, timeLimit, maxMistakes)
    local p = promise.new()

    if isHacking then return false end

    local simonConfig = {
        rounds      = rounds or 5,        -- rounds (sequence length) to win
        flashSpeed  = flashSpeed or 550,  -- button flash duration ms (lower = harder)
        flashGap    = 250,                -- gap between flashes ms
        timeLimit   = timeLimit or 20,    -- seconds to input each round, 0 = no limit
        maxMistakes = maxMistakes or 1    -- wrong presses before fail
    }

    callback = function(success)
        p:resolve(success)
        callback = nil
    end

    isHacking = true
    disableMovementControls = true
    SetNuiFocus(true, true) -- needs mouse clicks
    SendNUIMessage({
        action = 'startSimonSays',
        config = simonConfig
    })

    startGameLoop()
    return Citizen.Await(p)
end)

-- ---- Hack games pack: Shape Recall, Memory Diff, Traceroute, Carrier Tune -------
-- Each export takes ONE settings table (and the usual trailing style table), e.g.
--   exports['glitch-minigames']:StartShapeRecallGame({ preset = 'hard', rounds = 5 }, { theme = 'tablet' })
-- `preset` picks the starting values below; any other key overrides them. The NUI
-- clamps every value again (ui/js/shapeRecall.js etc.), so a bad value never breaks a game.
-- Perks from client/core/client.lua arrive as settings._perk[field] = { add, scale }.

local HackPresets = {
    startShapeRecall = {
        normal  = { tiles = 4, rounds = 4, questionsPerRound = 2, answerTime = 7000, numberTime = 1500, shrinkTime = 1500, maxStrikes = 0 },
        nopixel = { tiles = 4, rounds = 4, questionsPerRound = 2, answerTime = 7000, numberTime = 1500, shrinkTime = 1500, maxStrikes = 0, order = 'strict' },
        easy    = { tiles = 3, rounds = 3, questionsPerRound = 1, answerTime = 10000, numberTime = 2000, shrinkTime = 1500, maxStrikes = 1,
                    questionTypes = { 'shape', 'shapeText', 'background' },
                    palette = { 'black', 'white', 'blue', 'red', 'yellow', 'green' } },
        hard    = { tiles = 6, rounds = 6, questionsPerRound = 3, answerTime = 8000, speedUp = 400, numberTime = 1000, shrinkTime = 1000, maxStrikes = 1 },
    },
    startMemoryDiff = {
        normal  = { cols = 6, rows = 6, differences = 4, rounds = 1, mode = 'memory', memoriseTime = 5000, timeLimit = 20000, maxStrikes = 2, peeks = 1, peekTime = 1000 },
        nopixel = { cols = 6, rows = 6, differences = 4, rounds = 1, mode = 'side', timeLimit = 20000, maxStrikes = 2, peeks = 0 },
        easy    = { cols = 5, rows = 5, differences = 3, rounds = 1, mode = 'memory', memoriseTime = 7000, timeLimit = 25000, maxStrikes = 3, peeks = 2, peekTime = 1200 },
        hard    = { cols = 7, rows = 6, differences = 5, rounds = 2, mode = 'memory', memoriseTime = 4000, timeLimit = 15000, maxStrikes = 1, peeks = 0, subtle = true },
    },
    startTraceroute = {
        normal  = { cols = 10, rows = 6, ids = 8, extraLinks = 0.3, traces = 1, maxHops = 25, ttl = 30000, maxStrikes = 0 },
        nopixel = { cols = 10, rows = 6, ids = 8, extraLinks = 0.3, traces = 1, maxHops = 25, ttl = 30000, maxStrikes = 0 },
        easy    = { cols = 8, rows = 5, ids = 5, extraLinks = 0.4, traces = 1, maxHops = 30, ttl = 40000, maxStrikes = 1 },
        hard    = { cols = 12, rows = 7, ids = 14, extraLinks = 0.2, traces = 2, maxHops = 28, ttl = 25000, maxStrikes = 1, hiddenIds = true },
    },
    startCarrierTune = {
        normal  = { locks = 5, timeLimit = 40000, holdTime = 1500, holdDecay = 'drain', freqTolerance = 0.15, ampTolerance = 0.08 },
        nopixel = { locks = 5, timeLimit = 40000, holdTime = 1500, holdDecay = 'drain', freqTolerance = 0.15, ampTolerance = 0.08 },
        easy    = { locks = 3, timeLimit = 45000, holdTime = 1000, holdDecay = 'drain', freqTolerance = 0.25, ampTolerance = 0.12 },
        hard    = { locks = 5, timeLimit = 35000, holdTime = 2000, holdDecay = 'reset', freqTolerance = 0.1, ampTolerance = 0.05, drift = 0.4, noise = true },
    },
}

local function CopyValue(v)
    if type(v) ~= 'table' then return v end
    local out = {}
    for k, x in pairs(v) do out[k] = CopyValue(x) end
    return out
end

local function BuildHackConfig(action, settings)
    settings = type(settings) == 'table' and settings or {}
    local presets = HackPresets[action]
    local cfg = CopyValue(presets[settings.preset] or presets.normal)
    for k, v in pairs(settings) do
        if k ~= 'preset' and k ~= '_perk' then cfg[k] = CopyValue(v) end
    end
    -- Hacking perks / timed buffs (client/core/client.lua PERK_ARGS field slots)
    if type(settings._perk) == 'table' then
        for field, perk in pairs(settings._perk) do
            local base = tonumber(cfg[field]) or 0
            cfg[field] = (base + (tonumber(perk.add) or 0)) * (tonumber(perk.scale) or 1)
        end
    end
    return cfg
end

local function StartHackPack(action, settings, typing)
    if isHacking then return false end
    local p = promise.new()

    callback = function(success)
        p:resolve(success)
        callback = nil
    end

    isHacking = true
    backspaceTypes = typing == true   -- typing games: Backspace deletes, only ESC cancels
    disableMovementControls = true
    SetNuiFocus(true, true)
    SendNUIMessage({ action = action, config = BuildHackConfig(action, settings) })

    startGameLoop()
    return Citizen.Await(p)
end

exports('StartShapeRecallGame', function(settings) return StartHackPack('startShapeRecall', settings, true) end)
exports('StartMemoryDiffGame', function(settings) return StartHackPack('startMemoryDiff', settings) end)
exports('StartTracerouteGame', function(settings) return StartHackPack('startTraceroute', settings) end)
exports('StartCarrierTuneGame', function(settings) return StartHackPack('startCarrierTune', settings) end)

if config.DebugCommands then
    RegisterCommand('testsurge', function()
        local success = exports[GetCurrentResourceName()]:StartSurgeOverride({'E', 'F'}, 30, 2)
        print("Result: ", success)
    end, false)

    RegisterCommand('testfirewall', function()
        local success = exports[GetCurrentResourceName()]:StartFirewallPulse(3, 2, 10, 8, 30, 120, 40)
        print("Result: ", success)
    end, false)

    RegisterCommand('testsequence', function()
        local success = exports[GetCurrentResourceName()]:StartBackdoorSequence(3, 20, 20, 3, 2.0, 3, 6, {'W', 'A', 'S', 'D'}, 'W, A, S, D only')
        print("Result: ", success)
    end, false)

    RegisterCommand('testrhythm', function()
        local result = exports[GetCurrentResourceName()]:StartCircuitRhythm(4, {'A','S','D','F'}, 150, 800, 15, "normal", 5, 3)
        print("Result: ", result)
    end, false)    
    
    RegisterCommand('testvarhack', function()
        local success = exports[GetCurrentResourceName()]:StartVarHack(5, 25) -- 5 blocks, speed 25
        print("Result: ", success)
    end, false)    
    
    RegisterCommand('testmemory', function()
        local success = exports[GetCurrentResourceName()]:StartMemoryGame(5, 8, 3, 3000) -- 5x5 grid, 8 squares, 3 rounds, 3s show time
        print("Memory Game Result: ", success)
    end, false)    
      
    RegisterCommand('testsequencememory', function()
        local success = exports[GetCurrentResourceName()]:StartSequenceMemoryGame(4, 5, 3, 1000, 300) -- 4x4 grid, max 5 rounds, 3 wrong presses, 1s show time, 300ms between
        print("Sequence Memory Game Result: ", success)
    end, false)
    
    RegisterCommand('testverbalmemory', function()
        local result = exports[GetCurrentResourceName()]:StartVerbalMemoryGame(3, 20, 5000) -- 3 strikes, 20 words, 5s per word
        print("Verbal Memory Game Result: Success:", result.success, "Score:", result.score, "Strikes:", result.strikes)
    end, false)

    RegisterCommand('testnumberedsequence', function()
        local success = exports[GetCurrentResourceName()]:StartNumberedSequenceGame(4, 6, 3, 4000, 10000, 2) -- 4x4 grid, 6 numbers, 3 rounds, 4s show time, 10s answer time, 2 wrong presses allowed
        print("Numbered Sequence Game Result: ", success)
    end, false)

    RegisterCommand('testsymbolsearch_letters', function()
        local success = exports[GetCurrentResourceName()]:StartSymbolSearchGame(8, 1000, 30000, 3, 3, "letters") -- 8x8 grid, shift every 1s, 30s time limit, key length 3-3, letters
        print("Symbol Search Game Result: ", success)
    end, false)

    RegisterCommand('testsymbolsearch_symbols', function()
        local success = exports[GetCurrentResourceName()]:StartSymbolSearchGame(8, 1000, 30000, 3, 3, "symbols") -- 8x8 grid, shift every 1s, 30s time limit, key length 3-3, symbols
        print("Symbol Search (Symbols) Result: ", success)
    end, false)

    RegisterCommand('testsymbolsearch_numbers', function()
        local success = exports[GetCurrentResourceName()]:StartSymbolSearchGame(8, 1000, 30000, 4, 4, "numbers") -- 8x8 grid, shift every 1s, 30s time limit, key length 4-4, numbers
        print("Symbol Search (Numbers) Result: ", success)
    end, false)

    RegisterCommand('testsymbolsearch_emojis', function()
        local success = exports[GetCurrentResourceName()]:StartSymbolSearchGame(6, 1200, 25000, 3, 3, "emojis") -- 6x6 grid, shift every 1.2s, 25s time limit, key length 3-3, emojis
        print("Symbol Search (Emojis) Result: ", success)
    end, false)

    RegisterCommand('testsymbolsearch_dots', function()
        local success = exports[GetCurrentResourceName()]:StartSymbolSearchGame(8, 1000, 30000, 3, 3, "dots") -- 8x8 grid, shift every 1s, 30s time limit, key length 3-3, dots
        print("Symbol Search (Dots) Result: ", success)
    end, false)

    RegisterCommand('testpipepressure', function()
        local success = exports[GetCurrentResourceName()]:StartPipePressureGame(6, 30000) -- 6x6 grid, 30 seconds
        print("Pipe Pressure Game Result: ", success)
    end, false)

    RegisterCommand('testpairs', function()
        local success = exports[GetCurrentResourceName()]:StartPairsGame(4, nil, 0) -- 4x4 grid, 2min default time, no attempt limit
        print("Pairs Game Result: ", success)
    end, false)

    RegisterCommand('testmemorycolors', function()
        local success = exports[GetCurrentResourceName()]:StartMemoryColorsGame(5, 5000, 10000, 3) -- 5x5 grid, 5s memorize, 10s answer, 3 rounds
        print("Memory Colors Game Result: ", success)
    end, false)

    RegisterCommand('testuntangle', function()
        local success = exports[GetCurrentResourceName()]:StartUntangleGame(8, 60000) -- 8 nodes, 60 seconds
        print("Untangle Game Result: ", success)
    end, false)

    RegisterCommand('testfingerprint', function()
        local success = exports[GetCurrentResourceName()]:StartFingerprintGame(30000, true, true) -- 30 seconds, show aligned count, show correct indicator
        print("Fingerprint Game Result: ", success)
    end, false)

    RegisterCommand('testfingerprinthard', function()
        local success = exports[GetCurrentResourceName()]:StartFingerprintGame(30000, false, false) -- 30 seconds, no hints
        print("Fingerprint Game Result: ", success)
    end, false)

    RegisterCommand('testcodecrack', function()
        local success = exports[GetCurrentResourceName()]:StartCodeCrackGame(60000, 4, 6) -- 60 seconds, 4 digits, 6 attempts
        print("Code Crack Game Result: ", success)
    end, false)

    RegisterCommand('testwordcrack', function()
        local success = exports[GetCurrentResourceName()]:StartWordCrackGame(120000, 5, 6) -- 120 seconds, 5 letters, 6 attempts
        print("Word Crack Game Result: ", success)
    end, false)

    RegisterCommand('testbalance', function()
        local success = exports[GetCurrentResourceName()]:StartBalanceGame(10000, 3, 8, 30, 25, 2, 1000) -- 10s, driftSpeed 3, sensitivity 8, greenZoneWidth 30, yellowZoneWidth 25, driftRandomness 2, maxDangerTime 1s
        print("Balance Game Result: ", success)
    end, false)

    RegisterCommand('testaimtest', function()
        local success = exports[GetCurrentResourceName()]:StartAimTestGame(30000, 10, 1500, 60, true, 5, 0) -- 30s, 10 targets, 1.5s lifetime, 60px size, shrink, 5 max misses, no time penalty
        print("Aim Test Game Result: ", success)
    end, false)

    RegisterCommand('testcircleclick', function()
        local success = exports[GetCurrentResourceName()]:StartCircleClickGame(5, 1, 45, 3, 0.15, true, {'W', 'A', 'S', 'D'}) -- 5 rounds, speed 1, 45 degree zone, 3 max failures, 0.15 speed increase, randomize direction, keys W,A,S,D
        print("Circle Click Game Result: ", success)
    end, false)

    RegisterCommand('testlockpick', function()
        local success = exports[GetCurrentResourceName()]:StartLockpickGame(3, 30, 2, 40, 500) -- 3 rounds, 30 degree sweet spot, 2 max failures, 40 degree shake range, 500ms hold time
        print("Lockpick Game Result: ", success)
    end, false)

    RegisterCommand('testbarhit', function()
        local success = exports[GetCurrentResourceName()]:StartBarHitGame('E', 3, 55, 20, nil, 3, 30000) -- key E, 3 rounds, speed 55, zone 20%, random zone, 3 max failures, 30s
        print("Bar Hit Game Result: ", success)
    end, false)

    RegisterCommand('testskillcheck', function()
        local success = exports[GetCurrentResourceName()]:StartSkillCheckGame({'E','F','R','D'}, 65, 15000, 18, 5, 1, true) -- 4 rounds, speed 65, 15s, normal zone 18%, perfect 5%, 1 max failure
        print("Skill Check Result: ", success)
    end, false)

    RegisterCommand('testnumberup', function()
        local success = exports[GetCurrentResourceName()]:StartNumberUpGame(20, 30000, 4, 3) -- 20 numbers, 30s, 4 columns, 3 max mistakes
        print("Number Up Result: ", success)
    end, false)

    RegisterCommand('testkeys', function()
        local success = exports[GetCurrentResourceName()]:StartKeysGame(18, 15000, 6, 3) -- 18 letters, 15s, 6 columns, 3 max mistakes
        print("Keys Game Result: ", success)
    end, false)

    RegisterCommand('testcomboinput', function()
        local success = exports[GetCurrentResourceName()]:StartComboInputGame(3, 4, 6, 2, 1) -- 3 rounds, 4 arrows (grows by 1), 6s per combo, 2 failures
        print("Combo Input Result: ", success)
    end, false)

    RegisterCommand('testholdzone', function()
        local success = exports[GetCurrentResourceName()]:StartHoldZoneGame('E', 3, 18, 18, 5, 2) -- key E, 3 rounds, speed 18, zone 18%, perfect 5%, 2 failures
        print("Hold Zone Result: ", success)
    end, false)

    RegisterCommand('testwireconnect', function()
        local success = exports[GetCurrentResourceName()]:StartWireConnectGame(nil, 0) -- default 8 cables, no time limit
        print("Wire Connect Result: ", success)
    end, false)

    RegisterCommand('testsimonsays', function()
        local success = exports[GetCurrentResourceName()]:StartSimonSaysGame(5, 550, 0, 1) -- 5 rounds, 550ms flash, no limit, 1 mistake
        print("Simon Says Result: ", success)
    end, false)

    -- Run every minigame back-to-back. Play or press a cancel key to advance.
    local testGames = {
        { 'surge',            function() return exports[GetCurrentResourceName()]:StartSurgeOverride({'E','F'}, 30, 2) end },
        { 'firewall',         function() return exports[GetCurrentResourceName()]:StartFirewallPulse(3, 2, 10, 8, 30, 120, 40) end },
        { 'sequence',         function() return exports[GetCurrentResourceName()]:StartBackdoorSequence(3, 20, 20, 3, 2.0, 3, 6, {'W','A','S','D'}, 'W, A, S, D only') end },
        { 'rhythm',           function() return exports[GetCurrentResourceName()]:StartCircuitRhythm(4, {'A','S','D','F'}, 150, 800, 15, "normal", 5, 3) end },
        { 'varhack',          function() return exports[GetCurrentResourceName()]:StartVarHack(5, 25) end },
        { 'memory',           function() return exports[GetCurrentResourceName()]:StartMemoryGame(5, 8, 3, 3000) end },
        { 'sequencememory',   function() return exports[GetCurrentResourceName()]:StartSequenceMemoryGame(4, 5, 3, 1000, 300) end },
        { 'verbalmemory',     function() return exports[GetCurrentResourceName()]:StartVerbalMemoryGame(3, 20, 5000) end },
        { 'numberedsequence', function() return exports[GetCurrentResourceName()]:StartNumberedSequenceGame(4, 6, 3, 4000, 10000, 2) end },
        { 'symbolsearch',     function() return exports[GetCurrentResourceName()]:StartSymbolSearchGame(8, 1000, 30000, 3, 3, "letters") end },
        { 'pipepressure',     function() return exports[GetCurrentResourceName()]:StartPipePressureGame(6, 30000) end },
        { 'pairs',            function() return exports[GetCurrentResourceName()]:StartPairsGame(4, nil, 0) end },
        { 'memorycolors',     function() return exports[GetCurrentResourceName()]:StartMemoryColorsGame(5, 5000, 10000, 3) end },
        { 'untangle',         function() return exports[GetCurrentResourceName()]:StartUntangleGame(8, 60000) end },
        { 'fingerprint',      function() return exports[GetCurrentResourceName()]:StartFingerprintGame(30000, true, true) end },
        { 'codecrack',        function() return exports[GetCurrentResourceName()]:StartCodeCrackGame(60000, 4, 6) end },
        { 'wordcrack',        function() return exports[GetCurrentResourceName()]:StartWordCrackGame(120000, 5, 6) end },
        { 'balance',          function() return exports[GetCurrentResourceName()]:StartBalanceGame(10000, 3, 8, 30, 25, 2, 1000) end },
        { 'aimtest',          function() return exports[GetCurrentResourceName()]:StartAimTestGame(30000, 10, 1500, 60, true, 5, 0) end },
        { 'circleclick',      function() return exports[GetCurrentResourceName()]:StartCircleClickGame(5, 1, 45, 3, 0.15, true, {'W','A','S','D'}) end },
        { 'lockpick',         function() return exports[GetCurrentResourceName()]:StartLockpickGame(3, 30, 2, 40, 500) end },
        { 'barhit',           function() return exports[GetCurrentResourceName()]:StartBarHitGame('E', 3, 55, 20, nil, 3, 30000) end },
        { 'skillcheck',       function() return exports[GetCurrentResourceName()]:StartSkillCheckGame({'E','F','R','D'}, 65, 15000, 18, 5, 1, true) end },
        { 'numberup',         function() return exports[GetCurrentResourceName()]:StartNumberUpGame(20, 30000, 4, 3) end },
        { 'keys',             function() return exports[GetCurrentResourceName()]:StartKeysGame(18, 15000, 6, 3) end },
        { 'comboinput',       function() return exports[GetCurrentResourceName()]:StartComboInputGame(3, 4, 6, 2, 1) end },
        { 'holdzone',         function() return exports[GetCurrentResourceName()]:StartHoldZoneGame('E', 3, 18, 18, 5, 2) end },
        { 'wireconnect',      function() return exports[GetCurrentResourceName()]:StartWireConnectGame(nil, 0) end },
        { 'simonsays',        function() return exports[GetCurrentResourceName()]:StartSimonSaysGame(5, 550, 0, 1) end },
        { 'pairs-noskip',     function() return exports[GetCurrentResourceName()]:StartPairsGame(4, 60000, 0, { noSkip = true }) end },
        { 'shaperecall',      function() return exports[GetCurrentResourceName()]:StartShapeRecallGame({ preset = 'normal' }) end },
        { 'memorydiff',       function() return exports[GetCurrentResourceName()]:StartMemoryDiffGame({ preset = 'normal' }) end },
        { 'traceroute',       function() return exports[GetCurrentResourceName()]:StartTracerouteGame({ preset = 'normal' }) end },
        { 'carriertune',      function() return exports[GetCurrentResourceName()]:StartCarrierTuneGame({ preset = 'normal' }) end },
    }

    local testAllRunning = false

    RegisterCommand('testall', function(_, args)
        if testAllRunning then
            print('[testall] already running - use /stoptest to abort')
            return
        end
        local startAt = tonumber(args[1]) or 1
        testAllRunning = true
        Citizen.CreateThread(function()
            for i = startAt, #testGames do
                if not testAllRunning then break end
                local name = testGames[i][1]
                print(('[testall] (%d/%d) %s'):format(i, #testGames, name))
                local ok, result = pcall(testGames[i][2])
                if ok then
                    print(('[testall]   %s -> %s'):format(name, json.encode(result)))
                else
                    print(('[testall]   %s ERRORED: %s'):format(name, tostring(result)))
                end
                Citizen.Wait(600)
            end
            testAllRunning = false
            print('[testall] done')
        end)
    end, false)

    RegisterCommand('stoptest', function()
        testAllRunning = false
        cancelActiveMinigame()
        print('[testall] stopped')
    end, false)
end
