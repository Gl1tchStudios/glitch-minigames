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

// Backdoor Sequence Minigame
(function() {
    let sequenceActive = false;
    let currentSequence = [];
    let currentStage = 0;
    let pressedKeys = [];
    let stageKeys = [];
    let sequenceTimeLimit = 0;
    let sequenceTimer;
    let sequenceTimerInterval;
    let sequenceConfig = {
        totalStages: 3,
        keysPerStage: 4,
        timeLimit: 10,
        keyPool: ['W', 'A', 'S', 'D', 'Q', 'E']
    };

    const keyCodeMap = {
        87: 'W', 65: 'A', 83: 'S', 68: 'D',
        81: 'Q', 69: 'E', 82: 'R', 70: 'F',
        71: 'G', 72: 'H', 74: 'J', 75: 'K',
        76: 'L', 90: 'Z', 88: 'X', 67: 'C',
        86: 'V', 66: 'B', 78: 'N', 77: 'M',
        73: 'I', 79: 'O', 80: 'P', 84: 'T',
        85: 'U', 89: 'Y'
    };

    const DEFAULT_POOL = ['W', 'A', 'S', 'D', 'Q', 'E'];
    const DEFAULT_MESSAGE = 'Input the sequence to break the encryption';
    let attemptsLeft = 1;

    // Accepts both the Lua export names (requiredSequences, sequenceLength,
    // possibleKeys, maxAttempts, timePenalty, keyHintText) and the old ones.
    function startSequenceGame(config) {
        config = config || {};
        const known = Object.values(keyCodeMap);
        const rawPool = Array.isArray(config.keyPool) ? config.keyPool : (Array.isArray(config.possibleKeys) ? config.possibleKeys : []);
        const pool = rawPool.map((k) => String(k).toUpperCase()).filter((k) => known.includes(k));
        sequenceConfig = {
            totalStages: Math.max(1, Math.floor(config.totalStages || config.requiredSequences || 3)),
            keysPerStage: Math.max(1, Math.floor(config.keysPerStage || config.sequenceLength || 4)),
            timeLimit: config.timeLimit || 10,
            keyPool: pool.length ? pool : DEFAULT_POOL,
            maxAttempts: Math.max(1, Math.floor(config.maxAttempts || 1)),
            timePenalty: Math.max(0, Number(config.timePenalty) || 0),
            message: config.keyHintText ? String(config.keyHintText) : DEFAULT_MESSAGE
        };
        attemptsLeft = sequenceConfig.maxAttempts;

        sequenceActive = true;
        currentStage = 0;
        pressedKeys = [];

        buildStageIndicators();
        $('#seq-message').text(sequenceConfig.message);
        $('#time-penalty').text('');

        $('#sequence-container').fadeIn();

        generateNewSequence();
    }

    // One indicator per sequence (the page ships with three)
    function buildStageIndicators() {
        const box = $('.sequence-progress').empty();
        for (let i = 1; i <= sequenceConfig.totalStages; i++) {
            box.append(
                $('<div>').addClass('sequence-attempt').attr('data-attempt', i)
                    .append($('<div>').addClass('attempt-indicator' + (i === 1 ? ' active' : '')))
                    .append($('<div>').addClass('attempt-label').text('SEQ-' + String(i).padStart(2, '0')))
            );
        }
    }

    function generateNewSequence() {
        stageKeys = [];
        for (let i = 0; i < sequenceConfig.keysPerStage; i++) {
            const randomKey = sequenceConfig.keyPool[Math.floor(Math.random() * sequenceConfig.keyPool.length)];
            stageKeys.push(randomKey);
        }
        
        pressedKeys = [];
        updateSequenceDisplay();
        startSequenceTimer();
    }

    function updateSequenceDisplay() {
        const previousContainer = $('.previous-keys');
        const currentContainer = $('.current-key');
        const nextContainer = $('.next-keys');
        
        previousContainer.empty();
        currentContainer.empty();
        nextContainer.empty();
        
        const currentIndex = pressedKeys.length;
        
        for (let i = 0; i < currentIndex && i < stageKeys.length; i++) {
            const key = stageKeys[i];
            const pressedKey = pressedKeys[i];
            const isCorrect = key === pressedKey;
            const keyBox = $('<div>')
                .addClass('key-box')
                .addClass(isCorrect ? 'correct' : 'wrong')
                .text(key);
            previousContainer.append(keyBox);
        }
        
        if (currentIndex < stageKeys.length) {
            const currentKey = stageKeys[currentIndex];
            const keyBox = $('<div>')
                .addClass('key-box current')
                .text(currentKey);
            currentContainer.append(keyBox);
        }
        
        for (let i = currentIndex + 1; i < stageKeys.length; i++) {
            const key = stageKeys[i];
            const keyBox = $('<div>')
                .addClass('key-box next')
                .text(key);
            nextContainer.append(keyBox);
        }
        
        $('#seq-counter').text(currentStage + 1);
        $('#seq-total').text(sequenceConfig.totalStages);
        
        updateSequenceProgress();
    }
    
    function updateSequenceProgress() {
        $('.attempt-indicator').removeClass('active success failure');
        
        for (let i = 0; i < sequenceConfig.totalStages; i++) {
            const indicator = $('.sequence-attempt[data-attempt="' + (i + 1) + '"] .attempt-indicator');
            if (i < currentStage) {
                indicator.addClass('success');
            } else if (i === currentStage) {
                indicator.addClass('active');
            }
        }
    }

    function handleSequenceKeyPress(key) {
        if (!sequenceActive) return;
        
        const expectedKey = stageKeys[pressedKeys.length];
        
        if (key === expectedKey) {
            playSoundSafe('sound-click');
            pressedKeys.push(key);
            updateSequenceDisplay();
            
            if (pressedKeys.length === stageKeys.length) {
                stopSequenceTimer();
                currentStage++;
                
                if (currentStage >= sequenceConfig.totalStages) {
                    onSequenceSuccess();
                } else {
                    $('#seq-message').text('Stage Complete! Next sequence starting...');
                    setTimeout(() => {
                        if (!sequenceActive) return;
                        $('#seq-message').text(sequenceConfig.message);
                        generateNewSequence();
                    }, 1000);
                }
            }
        } else {
            attemptsLeft--;
            if (attemptsLeft <= 0) return onSequenceFailure('Wrong key! Sequence failed.');
            // retry the same sequence from its first key, minus the time penalty
            playSoundSafe('sound-failure');
            pressedKeys = [];
            if (sequenceConfig.timePenalty > 0) {
                sequenceTimeLimit = Math.max(0, sequenceTimeLimit - sequenceConfig.timePenalty);
                $('#time-penalty').text('-' + sequenceConfig.timePenalty + 's');
                setTimeout(() => $('#time-penalty').text(''), 800);
            }
            $('#seq-message').text('Wrong key! ' + attemptsLeft + (attemptsLeft === 1 ? ' attempt' : ' attempts') + ' left');
            updateSequenceDisplay();
        }
    }

    function startSequenceTimer() {
        sequenceTimeLimit = sequenceConfig.timeLimit;
        updateSequenceTimerDisplay();
        
        $('.seq-timer-progress').css('width', '100%');
        
        clearInterval(sequenceTimerInterval);
        
        sequenceTimerInterval = setInterval(function() {
            sequenceTimeLimit -= 0.1;
            sequenceTimeLimit = Math.max(0, parseFloat(sequenceTimeLimit.toFixed(1)));
            
            updateSequenceTimerDisplay();
            
            const percentage = (sequenceTimeLimit / sequenceConfig.timeLimit) * 100;
            $('.seq-timer-progress').css('width', percentage + '%');
            
            if (sequenceTimeLimit <= 0) {
                clearInterval(sequenceTimerInterval);
                onSequenceFailure('Time expired!');
            }
        }, 100);
    }

    function updateSequenceTimerDisplay() {
        $('#seq-timer-count').text(sequenceTimeLimit.toFixed(1));
    }

    function stopSequenceTimer() {
        clearInterval(sequenceTimerInterval);
    }

    function onSequenceSuccess() {
        sequenceActive = false;
        stopSequenceTimer();
        $('#seq-message').text('SEQUENCE COMPLETE! Backdoor opened.');
        playSoundSafe('sound-success');
        
        updateSequenceProgress();
        
        fetch('https://glitch-minigames/sequenceResult', {
            method: 'POST',
            body: JSON.stringify({ success: true })
        });
        
        setTimeout(() => {
            $('#sequence-container').fadeOut();
        }, 2000);
    }

    function onSequenceFailure(reason) {
        sequenceActive = false;
        stopSequenceTimer();
        $('#seq-message').text(reason || 'SEQUENCE FAILED!');
        playSoundSafe('sound-failure');
        
        $('.sequence-attempt[data-attempt="' + (currentStage + 1) + '"] .attempt-indicator').addClass('failure');
        
        fetch('https://glitch-minigames/sequenceResult', {
            method: 'POST',
            body: JSON.stringify({ success: false })
        });
        
        setTimeout(() => {
            $('#sequence-container').fadeOut();
        }, 2000);
    }

    function stopSequenceGame() {
        sequenceActive = false;
        stopSequenceTimer();
        $('#sequence-container').fadeOut();
    }

    window.backdoorSequenceFunctions = {
        start: startSequenceGame,
        stop: stopSequenceGame,
        handleKeyPress: handleSequenceKeyPress,
        isActive: () => sequenceActive,
        keyCodeMap: keyCodeMap
    };

    console.log('[BackdoorSequence] Loaded');
})();
