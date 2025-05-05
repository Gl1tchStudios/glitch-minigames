// -- Glitch Minigames
// -- Copyright (C) 2024 Glitch
// -- 
// -- This program is free software: you can redistribute it and/or modify
// -- it under the terms of the GNU General Public License as published by
// -- the Free Software Foundation, either version 3 of the License, or
// -- (at your option) any later version.
// -- 
// -- This program is distributed in the hope that it will be useful,
// -- but WITHOUT ANY WARRANTY; without even the implied warranty of
// -- MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// -- GNU General Public License for more details.
// -- 
// -- You should have received a copy of the GNU General Public License
// -- along with this program. If not, see <https://www.gnu.org/licenses/>.

// Firewall Bypass and Backdoor Sequence are both inside of this file. Ideally I'd like to split them into their own files, but for now this is how it is.

let isActive = false;
let direction = 1; // 1 = right, -1 = left
let position = 0;
let speed = 2;
let pulseWidth;
let trackWidth;
let safeZoneLeft;
let safeZoneRight;
let safeZoneWidth;
let successCount = 0;
let animationFrame;
let canClick = true;
let timeLimit = 10; // in seconds
let timeRemaining = 0;
let timerInterval;
let hackConfig = {
    requiredHacks: 3,
    initialSpeed: 2,
    maxSpeed: 10,
    timeLimit: 10,
    safeZoneMinWidth: 40,
    safeZoneMaxWidth: 120,
    safeZoneShrinkAmount: 10
};

// Backdoor Sequence Game Logic
let sequenceActive = false;
let currentSequence = [];
let currentStage = 0;  // Track the current stage instead of individual keys
let stageKeys = [];    // Will hold arrays of keys for each stage
let pressedKeys = [];  // Track which keys have been pressed in current stage
let sequenceAttempts = 0;
let sequenceSuccesses = 0;
let sequenceConfig = {
    requiredSequences: 3,
    sequenceLength: 5,
    timeLimit: 15,
    maxAttempts: 3,
    possibleKeys: ['W', 'A', 'S', 'D', 'UP', 'DOWN', 'LEFT', 'RIGHT', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    keyHintText: 'W, A, S, D, ←, →, ↑, ↓, 0-9',
    minSimultaneousKeys: 1,
    maxSimultaneousKeys: 3
};
let sequenceTimeRemaining = 0;
let sequenceTimerInterval;

let timePenalty = 1.0; // Default time penalty in seconds

const keyCodeMap = {
    87: 'W',    // W
    65: 'A',    // A
    83: 'S',    // S
    68: 'D',    // D
    38: 'UP',   // Up arrow
    40: 'DOWN', // Down arrow
    37: 'LEFT', // Left arrow
    39: 'RIGHT',// Right arrow
    48: '0',    // 0
    49: '1',    // 1
    50: '2',    // 2
    51: '3',    // 3
    52: '4',    // 4
    53: '5',    // 5
    54: '6',    // 6
    55: '7',    // 7
    56: '8',    // 8
    57: '9'     // 9
};

$(document).ready(function() {
    window.addEventListener('message', function(event) {
        const data = event.data;
        
        if (data.action === 'start') {
            $('.pulse-bar').removeClass('success-bar fail-bar');
            $('body').removeClass('sequence-active');
            
            if (data.config) {
                hackConfig = {
                    requiredHacks: data.config.requiredHacks || 3,
                    initialSpeed: data.config.initialSpeed || 2,
                    maxSpeed: data.config.maxSpeed || 10,
                    timeLimit: data.config.timeLimit || 10,
                    safeZoneMinWidth: data.config.safeZoneMinWidth || 40,
                    safeZoneMaxWidth: data.config.safeZoneMaxWidth || 120,
                    safeZoneShrinkAmount: data.config.safeZoneShrinkAmount || 10
                };
            }
            
            $('body').removeClass('sequence-active');
            $('#hack-container').fadeIn(500);
            startGame();
        } else if (data.action === 'end') {
            $('#hack-container').fadeOut(500);
            stopGame();
        } else if (data.action === 'updateSpeed') {
            speed = Math.min(hackConfig.maxSpeed, speed + 1);
        } else if (data.action === 'startSequence') {
            if (data.hideCursor) {
                $('body').addClass('sequence-active');
            }
            $('#sequence-container').fadeIn(500);
            startSequenceGame(data.config);
        } else if (data.action === 'endSequence') {
            sequenceActive = false;
            clearInterval(sequenceTimerInterval);
            document.removeEventListener('keydown', handleSequenceKeyPress);
            $('body').removeClass('sequence-active');
            $('#sequence-container').fadeOut(500);
        } else if (data.action === 'startRhythm') {
            $('body').removeClass('sequence-active');
            $('#rhythm-container').fadeIn(500);
            
            setupRhythmGame(data.config);
            startRhythmGame();
        } else if (data.action === 'endRhythm') {
            rhythmActive = false;
            clearInterval(spawnInterval);
            clearInterval(moveInterval);
            document.removeEventListener('keydown', handleRhythmKeyPress);
            document.removeEventListener('keyup', handleRhythmKeyRelease);
            $('#rhythm-container').fadeOut(500);
        } else if (data.action === 'startKeymash') {
            window.keymashFunctions.setup(data.config);
            window.keymashFunctions.start();
        } else if (data.action === 'keyPress') {
            window.keymashFunctions.handleKeypress(data.keyCode);
        } else if (data.action === 'stopKeymash') {
            window.keymashFunctions.stop(false);
        }
    });
    
    $('#hack-button').on('click', function() {
        if (!isActive || !canClick) return;
        
        canClick = false;
        setTimeout(() => { canClick = true; }, 100);
        
        checkResult();
    });
    
    preloadSounds();
});

let soundsEnabled = true;

function preloadSounds() {
    const sounds = ['sound-click', 'sound-success', 'sound-failure', 'sound-penalty', 'sound-buttonPress'];
    let failedSounds = 0;
    
    for (const soundId of sounds) {
        const sound = document.getElementById(soundId);
        if (sound) {
            sound.addEventListener('error', function() {
                console.warn(`Failed to load sound: ${soundId}`);
                failedSounds++;
                if (failedSounds >= sounds.length) {
                    console.warn('All sounds failed to load, disabling sound system');
                    soundsEnabled = false;
                }
            });
            
            sound.addEventListener('canplaythrough', function() {
                console.log(`Sound loaded successfully: ${soundId}`);
            });
            
            sound.load();
        } else {
            console.warn(`Sound element with ID "${soundId}" not found for preloading`);
            failedSounds++;
        }
    }
    
    setTimeout(() => {
        if (failedSounds >= sounds.length) {
            console.warn('No sounds loaded after timeout, disabling sound system');
            soundsEnabled = false;
        }
    }, 3000);
}

function playSound(soundId) {
    if (!soundsEnabled) return;
    
    const sound = document.getElementById(soundId);
    if (!sound) {
        console.warn(`Sound element with ID "${soundId}" not found`);
        return;
    }
    
    try {
        sound.currentTime = 0;
        let playPromise = sound.play();
        
        if (playPromise !== undefined) {
            playPromise.catch(e => {
                console.warn(`Sound "${soundId}" failed to play:`, e.message);
            });
        }
    } catch (e) {
        console.warn(`Error playing sound "${soundId}":`, e.message);
    }
}

function playSoundSafe(soundId) {
    if (!soundsEnabled) return;
    
    try {
        playSound(soundId);
    } catch(e) {
        console.warn(`Failed to play ${soundId} safely, continuing anyway`);
    }
}

function startSequenceGame(config) {
    if (config) {
        sequenceConfig = {
            requiredSequences: config.requiredSequences || 3,
            sequenceLength: config.sequenceLength || 5,
            timeLimit: config.timeLimit || 15,
            maxAttempts: config.maxAttempts || 3,
            possibleKeys: config.possibleKeys || ['W', 'A', 'S', 'D', 'UP', 'DOWN', 'LEFT', 'RIGHT', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
            keyHintText: config.keyHintText || 'W, A, S, D, ←, →, ↑, ↓, 0-9',
            minSimultaneousKeys: config.minSimultaneousKeys || 1,
            maxSimultaneousKeys: config.maxSimultaneousKeys || 3,
            timePenalty: config.timePenalty || 1.0
        };
        
        if (sequenceConfig.minSimultaneousKeys > sequenceConfig.maxSimultaneousKeys) {
            sequenceConfig.minSimultaneousKeys = sequenceConfig.maxSimultaneousKeys;
        }
        
        if (sequenceConfig.maxSimultaneousKeys > sequenceConfig.sequenceLength) {
            sequenceConfig.maxSimultaneousKeys = sequenceConfig.sequenceLength;
        }
        
        timePenalty = config.timePenalty || 1.0;
    }

    $('#time-penalty').removeClass('show').text('');
    
    sequenceActive = true;
    currentSequence = [];
    stageKeys = [];
    pressedKeys = [];
    currentStage = 0;
    sequenceAttempts = 0;
    sequenceSuccesses = 0;
    
    $('#seq-counter').text(sequenceSuccesses);
    $('#seq-total').text(sequenceConfig.requiredSequences);
    $('#seq-message').text('Input the sequence to break the encryption');
    
    $('.key-hint').text(sequenceConfig.keyHintText);
    
    $('.attempt-indicator').removeClass('active success failure');
    $('.attempt-indicator').first().addClass('active');
    
    generateNewSequence();
    
    startSequenceTimer();
    
    document.addEventListener('keydown', handleSequenceKeyPress);
}

function generateNewSequence() {
    currentSequence = [];
    stageKeys = [];
    pressedKeys = [];
    currentStage = 0;
    
    const keySet = sequenceConfig.possibleKeys || ['W', 'A', 'S', 'D', 'UP', 'DOWN', 'LEFT', 'RIGHT', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
    
    const minKeys = Math.max(1, sequenceConfig.minSimultaneousKeys);
    const maxKeys = Math.min(sequenceConfig.sequenceLength, sequenceConfig.maxSimultaneousKeys);
    
    console.log("Min keys:", minKeys, "Max keys:", maxKeys);
    console.log("Available keys:", keySet);
    
    let totalKeys = 0;
    while (totalKeys < sequenceConfig.sequenceLength) {
        const keysLeftToAdd = sequenceConfig.sequenceLength - totalKeys;
        const numKeys = Math.min(keysLeftToAdd, 
            (minKeys === maxKeys) ? minKeys : 
            Math.floor(Math.random() * (maxKeys - minKeys + 1)) + minKeys);
            
        console.log("Adding", numKeys, "keys in this stage");
        
        const stageKeySet = [];
        
        for (let i = 0; i < numKeys; i++) {
            const randomIndex = Math.floor(Math.random() * keySet.length);
            const key = keySet[randomIndex];
            
            stageKeySet.push(key);
            currentSequence.push(key);
        }
        
        stageKeys.push(stageKeySet);
        totalKeys += stageKeySet.length;
    }
    
    console.log("Generated stages:", stageKeys);
    console.log("Total keys in sequence:", totalKeys);
    
    resetPressedKeys();
    
    updateSequenceDisplay();
}

let nextExpectedKeyIndex = 0;

function resetPressedKeys() {
    if (currentStage < stageKeys.length) {
        pressedKeys = Array(stageKeys[currentStage].length).fill(false);
        nextExpectedKeyIndex = 0;
    }
}

function updateSequenceDisplay() {
    $('.previous-keys').empty();
    $('.current-key').empty();
    $('.next-keys').empty();
    
    const maxPreviousStages = 1;
    const startPrevious = Math.max(0, currentStage - maxPreviousStages);
    
    for (let i = startPrevious; i < currentStage; i++) {
        const stageGroup = $('<div class="stage-group"></div>');
        for (let j = 0; j < stageKeys[i].length; j++) {
            stageGroup.append(`<div class="key-box correct">${formatKeyDisplay(stageKeys[i][j])}</div>`);
        }
        $('.previous-keys').append(stageGroup);
    }
    
    if (currentStage < stageKeys.length) {
        const currentGroup = $('<div class="stage-group current-stage"></div>');
        const allKeysPressed = pressedKeys.every(pressed => pressed);
        
        for (let i = 0; i < stageKeys[currentStage].length; i++) {
            let keyClass = "current";
            if (allKeysPressed) {
                keyClass = "correct";
            } else if (pressedKeys[i]) {
                keyClass = "pressed";
            }
            
            currentGroup.append(`<div class="key-box ${keyClass}">${formatKeyDisplay(stageKeys[currentStage][i])}</div>`);
        }
        $('.current-key').append(currentGroup);
    }
    
    if (currentStage + 1 < stageKeys.length) {
        const nextGroup = $('<div class="stage-group"></div>');
        for (let j = 0; j < stageKeys[currentStage + 1].length; j++) {
            nextGroup.append(`<div class="key-box next">${formatKeyDisplay(stageKeys[currentStage + 1][j])}</div>`);
        }
        $('.next-keys').append(nextGroup);
    }
}

function formatKeyDisplay(key) {
    switch(key) {
        case 'UP': return '↑';
        case 'DOWN': return '↓';
        case 'LEFT': return '←';
        case 'RIGHT': return '→';
        default: return key;
    }
}

function handleSequenceKeyPress(e) {
    if (!sequenceActive || currentStage >= stageKeys.length) return;
    
    const keyPressed = keyCodeMap[e.keyCode];
    
    if (!keyPressed) return;
    
    let keyIndex = -1;
    for (let i = 0; i < stageKeys[currentStage].length; i++) {
        if (stageKeys[currentStage][i] === keyPressed && !pressedKeys[i]) {
            keyIndex = i;
            break;
        }
    }
    
    if (keyIndex !== -1) {
        if (keyIndex === nextExpectedKeyIndex) {
            playSoundSafe('sound-click');
            
            pressedKeys[keyIndex] = true;
            nextExpectedKeyIndex++;
            
            updateSequenceDisplay();
            
            if (pressedKeys.every(pressed => pressed)) {
                setTimeout(() => {
                    currentStage++;
                    
                    if (currentStage >= stageKeys.length) {
                        handleSequenceSuccess();
                    } else {
                        resetPressedKeys();
                        updateSequenceDisplay();
                    }
                }, 300);
            }
        } else {
            $('#seq-message').text('Press keys from LEFT to RIGHT!');
            applyTimePenalty('Wrong key order!');
        }
    } else {
        applyTimePenalty('Incorrect key!');
    }
}

function handleSequenceSuccess() {
    sequenceSuccesses++;
    $('#seq-counter').text(sequenceSuccesses);
    
    playSoundSafe('sound-success');
    
    $(`.sequence-attempt[data-attempt="${sequenceSuccesses}"] .attempt-indicator`)
        .removeClass('active')
        .addClass('success');
    
    if (sequenceSuccesses >= sequenceConfig.requiredSequences) {
        $('#seq-message').text('ACCESS GRANTED! All firewalls breached.');
        
        stopSequenceGame(true);
    } else {
        $('#seq-message').text('Sequence correct! Initiating next security layer...');
        
        $(`.sequence-attempt[data-attempt="${sequenceSuccesses + 1}"] .attempt-indicator`).addClass('active');
        
        resetSequenceTimer();
        
        setTimeout(() => {
            generateNewSequence();
        }, 1000);
    }
}

function handleSequenceFail(isKeyError) {
    sequenceAttempts++;
    
    $('.current-key .key-box').removeClass('current').addClass('wrong');
    $('#seq-message').text('Incorrect input! Security breach detected.');
    
    playSoundSafe('sound-failure');
    
    if (isKeyError) {
        applyTimePenalty();
    }
    
    if (sequenceAttempts >= sequenceConfig.maxAttempts) {
        $(`.sequence-attempt[data-attempt="${sequenceSuccesses + 1}"] .attempt-indicator`)
            .removeClass('active')
            .addClass('failure');
        
        stopSequenceGame(false);
    } else {
        setTimeout(() => {
            currentKeyIndex = 0;
            updateSequenceDisplay();
            $('#seq-message').text('Attempt failed. Try again.');
        }, 1000);
    }
}

function applyTimePenalty(reason = 'Wrong input!') {
    sequenceTimeRemaining = Math.max(0, sequenceTimeRemaining - timePenalty);
    
    updateSequenceTimerDisplay();
    
    const percentage = (sequenceTimeRemaining / sequenceConfig.timeLimit) * 100;
    $('.seq-timer-progress').css('width', percentage + '%');
    

    $('#time-penalty').removeClass('show');
    
    setTimeout(() => {
        $('#time-penalty').text('-' + timePenalty.toFixed(1) + 's');
        $('#time-penalty').addClass('show');
        
        playSoundSafe('sound-penalty');
    }, 10);
    
    if (sequenceTimeRemaining <= 0) {
        clearInterval(sequenceTimerInterval);
        handleSequenceTimeout();
    }
}

function startSequenceTimer() {
    sequenceTimeRemaining = sequenceConfig.timeLimit;
    updateSequenceTimerDisplay();
    $('.seq-timer-progress').css('width', '100%');
    clearInterval(sequenceTimerInterval);
    sequenceTimerInterval = setInterval(function() {
        sequenceTimeRemaining -= 0.1;
        sequenceTimeRemaining = Math.max(0, parseFloat(sequenceTimeRemaining.toFixed(1)));
        
        updateSequenceTimerDisplay();
        
        const percentage = (sequenceTimeRemaining / sequenceConfig.timeLimit) * 100;
        $('.seq-timer-progress').css('width', percentage + '%');
        
        if (sequenceTimeRemaining <= 0) {
            clearInterval(sequenceTimerInterval);
            handleSequenceTimeout();
        }
    }, 100);
}

function resetSequenceTimer() {
    clearInterval(sequenceTimerInterval);
    startSequenceTimer();
}

function updateSequenceTimerDisplay() {
    $('#seq-timer-count').text(sequenceTimeRemaining.toFixed(1));
}

function handleSequenceTimeout() {
    $('#seq-message').text('Time expired! Security lockdown initiated.');
    $(`.sequence-attempt[data-attempt="${sequenceSuccesses + 1}"] .attempt-indicator`)
        .removeClass('active')
        .addClass('failure');
    stopSequenceGame(false);
}

function stopSequenceGame(success) {
    sequenceActive = false;
    clearInterval(sequenceTimerInterval);
    document.removeEventListener('keydown', handleSequenceKeyPress);
    
    playSoundSafe(success ? 'sound-success' : 'sound-failure');
    
    setTimeout(() => {
        fetch('https://glitch-minigames/sequenceResult', {
            method: 'POST',
            body: JSON.stringify({ success: success })
        });
        $('#sequence-container').fadeOut(300);
    }, 1500);
}

function startGame() {
    isActive = true;
    canClick = true;
    successCount = 0;
    speed = hackConfig.initialSpeed;
    updateCounter();
    
    $('.pulse-bar').removeClass('success-bar fail-bar');
    $('#hack-container').show();
    
    pulseWidth = $('.pulse-bar').width();
    trackWidth = $('.pulse-track').width() - pulseWidth;
    
    const safeZone = $('.safe-zone');
    safeZoneWidth = hackConfig.safeZoneMaxWidth;
    safeZone.width(safeZoneWidth);
    
    repositionSafeZone();
    position = 0;
    $('#message').text('Click to stop the pulse inside the safe zone');
    $('#total-hacks').text(hackConfig.requiredHacks);
    
    $('body').css('cursor', 'pointer');
    
    startTimer();
    startPulse();
}

function stopGame() {
    isActive = false;
    stopTimer();
    if (animationFrame) {
        cancelAnimationFrame(animationFrame);
        animationFrame = null;
    }
    $('.pulse-bar').removeClass('success-bar fail-bar');
    
    setTimeout(() => {
        $('#hack-container').fadeOut(500, function() {
            isActive = false;
            canClick = true;
            successCount = 0;
        });
    }, 1000);
}

function stopPulse() {
    cancelAnimationFrame(animationFrame);
}

function startPulse() {
    if (!isActive) return;
    
    if (animationFrame) {
        cancelAnimationFrame(animationFrame);
    }
    
    animatePulse();
}

function animatePulse() {
    if (!isActive) return;
    
    position += direction * speed;
    
    if (position >= trackWidth || position <= 0) {
        direction *= -1;
    }
    
    position = Math.max(0, Math.min(trackWidth, position));
    $('.pulse-bar').css('left', position + 'px');
    
    animationFrame = requestAnimationFrame(animatePulse);
}

function repositionSafeZone() {
    const trackWidth = $('.pulse-track').width();
    const safeZone = $('.safe-zone');
    const margin = safeZoneWidth * 0.75;
    const maxPosition = trackWidth - safeZoneWidth - margin;
    const minPosition = margin;
    const newPosition = Math.floor(Math.random() * (maxPosition - minPosition + 1)) + minPosition;
    
    safeZone.css('left', newPosition + 'px');
    safeZoneLeft = newPosition;
    safeZoneRight = newPosition + safeZoneWidth;
}

function startTimer() {
    timeRemaining = hackConfig.timeLimit;
    
    updateTimerDisplay();
    
    $('.timer-progress').css('width', '100%');
    
    clearInterval(timerInterval);
    
    timerInterval = setInterval(function() {
        timeRemaining -= 0.1;
        timeRemaining = Math.max(0, parseFloat(timeRemaining.toFixed(1)));
        
        updateTimerDisplay();
        
        const percentage = (timeRemaining / hackConfig.timeLimit) * 100;
        $('.timer-progress').css('width', percentage + '%');
        
        if (timeRemaining <= 0) {
            clearInterval(timerInterval);
            onFailure('Time expired!');
        }
    }, 100);
}

function updateTimerDisplay() {
    $('#timer-count').text(timeRemaining.toFixed(1));
}

function stopTimer() {
    clearInterval(timerInterval);
}

function checkResult() {
    stopPulse();
    
    const currentPosition = $('.pulse-bar').position().left;
    const pulseRight = currentPosition + pulseWidth;
    
    safeZoneLeft = $('.safe-zone').position().left;
    safeZoneRight = safeZoneLeft + $('.safe-zone').width();
    
    if (currentPosition >= safeZoneLeft && pulseRight <= safeZoneRight) {
        playSoundSafe('sound-click');
        onSuccess();
    } else {
        playSoundSafe('sound-failure');
        onFailure('Hack failed - outside safe zone!');
    }
}

function onSuccess() {
    $('.pulse-bar').addClass('success-bar');
    successCount++;
    updateCounter();
    
    if (successCount >= hackConfig.requiredHacks) {
        stopTimer();
        $('#message').text('FIREWALL BYPASSED!');
        playSoundSafe('sound-success');
        
        fetch('https://glitch-minigames/hackSuccess', {
            method: 'POST',
            body: JSON.stringify({})
        });
        
        stopGame();
    } else {
        $('#message').text('SUCCESS! Difficulty increased.');
        setTimeout(() => {
            $('.pulse-bar').removeClass('success-bar');
            safeZoneWidth = Math.max(hackConfig.safeZoneMinWidth, safeZoneWidth - hackConfig.safeZoneShrinkAmount);
            $('.safe-zone').width(safeZoneWidth);
            repositionSafeZone();
            speed = Math.min(hackConfig.maxSpeed, speed + 1);
            startTimer();
            startPulse();
        }, 1000);
    }
}

function onFailure(reason) {
    stopTimer();
    stopPulse();
    $('.pulse-bar').addClass('fail-bar');
    $('#message').text(reason || 'BREACH FAILED! Security alerted.');
    playSoundSafe('sound-failure');
    
    fetch('https://glitch-minigames/hackFail', {
        method: 'POST',
        body: JSON.stringify({})
    });
    
    stopGame();
}

function updateCounter() {
    $('#counter').text(successCount);
}