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

// Keymash game variables
let keymashActive = false;
let progress = 0;
let maxProgress = 100;
let decayRate = 2; // Progress lost per second when not pressing
let keyPressValue = 2; // Progress gained per key press
let lastPressTime = 0;
let decayInterval;
let targetKey = 'E'; // Default key
let keyCode = 69; // E key by default
let startTime = 0; // Track when the game started
let gracePeriod = 2000; // 2 seconds grace period before failure is possible
let keyPressedOnce = false; // Track if player has pressed the key at least once

function setupKeymash(config) {
    let possibleKeys = ['E'];
    
    if (config?.possibleKeys && Array.isArray(config.possibleKeys) && config.possibleKeys.length > 0) {
        possibleKeys = config.possibleKeys;
    }
    
    targetKey = possibleKeys[Math.floor(Math.random() * possibleKeys.length)];
    
    const keyCodeMap = {
        'E': 69,
        'SPACE': 32,
        'F': 70,
        'Q': 81,
        'W': 87,
        'R': 82,
        'T': 84,
        'Y': 89,
        'U': 85,
        'I': 73,
        'O': 79,
        'P': 80,
        'A': 65,
        'S': 83,
        'D': 68,
        'G': 71,
        'H': 72,
        'J': 74,
        'K': 75,
        'L': 76,
        'Z': 90,
        'X': 88,
        'C': 67,
        'V': 86,
        'B': 66,
        'N': 78,
        'M': 77,
        '1': 49,
        '2': 50,
        '3': 51,
        '4': 52,
        '5': 53,
        '6': 54,
        '7': 55,
        '8': 56,
        '9': 57,
        '0': 48
    };
    
    keyCode = keyCodeMap[targetKey] || 69;
    
    keyPressValue = config?.keyPressValue || 2;
    decayRate = config?.decayRate || 2;
    
    $('#target-key').text(targetKey === 'SPACE' ? 'SPACE' : targetKey);
    
    resetKeymash();
    
    console.log("Keymash configured with target key:", targetKey, "keyCode:", keyCode);
}

function resetKeymash() {
    progress = 0;
    keyPressedOnce = false;
    updateProgressDisplay();
    $('.progress-bar').removeClass('progress-flash');
}

function startKeymash() {
    keymashActive = true;
    resetKeymash();
    
    startTime = Date.now();
    
    decayInterval = setInterval(decayProgress, 100);
    
    $('#keymash-container').fadeIn(300);
    
    lastPressTime = Date.now();
    
    console.log("Keymash game started with target key:", targetKey);
}

function stopKeymash(success) {
    if (!keymashActive) return;
    
    keymashActive = false;
    clearInterval(decayInterval);
    
    console.log("Keymash game stopped, success:", success);
    
    if (typeof playSoundSafe === 'function') {
        playSoundSafe(success ? 'sound-success' : 'sound-failure');
    }
    
    if (success) {
        $('.progress-bar').addClass('progress-flash').css('stroke', 'var(--safe-zone)');
    } else {
        $('.progress-bar').removeClass('progress-flash');
        $('.progress-bar').addClass('failure-flash').css('stroke', 'var(--danger-color)');
    }
    
    setTimeout(() => {
        $('#keymash-container').fadeOut(300);
        $('.progress-bar').removeClass('progress-flash failure-flash').css('stroke', '');
        
        fetch('https://glitch-minigames/keymashResult', {
            method: 'POST',
            body: JSON.stringify({
                success: success
            })
        });
    }, 1500);
}

function handleKeymashKeypress(keyCodeInput) {
    if (!keymashActive) return;
    
    console.log("Key pressed:", keyCodeInput, "Target key:", keyCode);
    
    if (parseInt(keyCodeInput) === keyCode) {
        keyPressedOnce = true;
        
        lastPressTime = Date.now();
        
        progress = Math.min(maxProgress, progress + keyPressValue);
        
        if (typeof playSoundSafe === 'function') {
            playSoundSafe('sound-buttonPress');
        }
        
        $('.key-display').addClass('active');
        setTimeout(() => $('.key-display').removeClass('active'), 100);
        
        updateProgressDisplay();
        
        if (progress >= 85 && progress < 100) {
            $('.progress-bar').addClass('progress-flash');
        }
        
        if (progress >= maxProgress) {
            stopKeymash(true);
        }
    }
}

function decayProgress() {
    if (!keymashActive) return;
    
    const now = Date.now();
    
    if (!keyPressedOnce) {
        return;
    }
    
    if (now - lastPressTime > 500) {
        progress = Math.max(0, progress - (decayRate / 10));
        
        updateProgressDisplay();
        
        if (progress < 20) {
            $('.progress-bar').removeClass('progress-flash');
            $('.progress-bar').css('stroke', 'var(--danger-color)');
        } else if (progress < 85) {
            $('.progress-bar').removeClass('progress-flash');
            $('.progress-bar').css('stroke', '');
        }
        
        if (progress <= 0) {
            stopKeymash(false);
        }
    }
}

function updateProgressDisplay() {
    const circumference = 2 * Math.PI * 45;
    const offset = circumference - (progress / 100) * circumference;
    $('.progress-bar').css('stroke-dashoffset', offset);
}

$(document).on('keydown', function(e) {
    if (keymashActive) {
        console.log("Direct keydown detected:", e.keyCode);
        handleKeymashKeypress(e.keyCode);
    }
});

window.keymashFunctions = {
    setup: setupKeymash,
    start: startKeymash,
    stop: stopKeymash,
    handleKeypress: handleKeymashKeypress
};

window.addEventListener('message', (event) => {
    console.log('Received NUI message:', event.data);
    
    if (event.data.action === 'startKeymash') {
        startKeymash(event.data.config);
    } else if (event.data.action === 'endKeymash' || event.data.action === 'forceClose') {
        console.log('Forced close of keymash:', event.data);
        
        if (decayInterval) {
            clearInterval(decayInterval);
            decayInterval = null;
        }
        
        keymashActive = false;
        
        $.post(`https://${GetParentResourceName()}/keymashResult`, JSON.stringify({
            success: false
        }));
        
        $('#keymash-container').hide();
    }
});
