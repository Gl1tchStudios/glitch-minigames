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
        86: 'V', 66: 'B', 78: 'N', 77: 'M'
    };

    function startSequenceGame(config) {
        if (config) {
            sequenceConfig = {
                totalStages: config.totalStages || 3,
                keysPerStage: config.keysPerStage || 4,
                timeLimit: config.timeLimit || 10,
                keyPool: config.keyPool || ['W', 'A', 'S', 'D', 'Q', 'E']
            };
        }
        
        sequenceActive = true;
        currentStage = 0;
        pressedKeys = [];
        
        $('.attempt-indicator').removeClass('active success failure');
        $('.sequence-attempt[data-attempt="1"] .attempt-indicator').addClass('active');
        
        $('#sequence-container').fadeIn();
        
        generateNewSequence();
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
                        $('#seq-message').text('Input the sequence to break the encryption');
                        generateNewSequence();
                    }, 1000);
                }
            }
        } else {
            onSequenceFailure('Wrong key! Sequence failed.');
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
