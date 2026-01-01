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

// Centralized Color Theme - All minigames use this
window.MinigameColors = {
    primary: '#2dd4a8',
    primaryRgba: '45, 212, 168',
    secondary: '#1a8c6f',
    secondaryRgba: '26, 140, 111',
    success: '#2dd4a8',
    successRgba: '45, 212, 168',
    failure: '#ff4444',
    failureRgba: '255, 68, 68',
    warning: '#fbbf24',
    warningRgba: '251, 191, 36',
    background: '#1e1e1e',
    backgroundRgba: '30, 30, 30',
    border: '#505050',
    borderRgba: '80, 80, 80',
    text: '#e0e0e0',
    textRgba: '224, 224, 224',
    textSecondary: '#969696',
    textSecondaryRgba: '150, 150, 150',
    danger: '#cc0000',
    dangerRgba: '204, 0, 0',
    safe: '#22c55e',
    safeRgba: '34, 197, 94'
};

$(document).ready(function() {
    window.addEventListener('message', function(event) {
        const data = event.data;
        
        // updatese color theme from Lua config
        if (data.action === 'setColors' && data.colors) {
            window.MinigameColors = data.colors;
            
            // Apply visual theme class to body
            if (data.visualTheme) {
                $('body').removeClass('theme-classic theme-modern').addClass('theme-' + data.visualTheme);
                console.log('[VisualTheme] Applied theme:', data.visualTheme);
            }
            
            const root = document.documentElement;
            
            // Apply background opacity
            if (data.backgroundOpacity !== undefined) {
                root.style.setProperty('--background-opacity', data.backgroundOpacity);
                
                // Convert gradient colors to rgba with opacity
                const opacity = data.backgroundOpacity;
                const grad1Rgba = data.colors.backgroundGradient1Rgba;
                const grad2Rgba = data.colors.backgroundGradient2Rgba;
                const secondaryRgba = data.colors.backgroundSecondaryRgba;
                const tertiaryRgba = data.colors.backgroundTertiaryRgba;
                
                root.style.setProperty('--background-gradient-1-alpha', `rgba(${grad1Rgba}, ${opacity})`);
                root.style.setProperty('--background-gradient-2-alpha', `rgba(${grad2Rgba}, ${opacity})`);
                root.style.setProperty('--background-secondary-alpha', `rgba(${secondaryRgba}, ${opacity})`);
                root.style.setProperty('--background-tertiary-alpha', `rgba(${tertiaryRgba}, ${opacity})`);
            }
            root.style.setProperty('--primary-color', data.colors.primary);
            root.style.setProperty('--secondary-color', data.colors.secondary);
            root.style.setProperty('--success-color', data.colors.success);
            root.style.setProperty('--failure-color', data.colors.failure);
            root.style.setProperty('--warning-color', data.colors.warning);
            root.style.setProperty('--background-color', data.colors.background);
            root.style.setProperty('--background-gradient-1', data.colors.backgroundGradient1);
            root.style.setProperty('--background-gradient-2', data.colors.backgroundGradient2);
            root.style.setProperty('--background-secondary', data.colors.backgroundSecondary);
            root.style.setProperty('--background-tertiary', data.colors.backgroundTertiary);
            root.style.setProperty('--border-color', data.colors.border);
            root.style.setProperty('--text-color', data.colors.text);
            root.style.setProperty('--text-secondary-color', data.colors.textSecondary);
            root.style.setProperty('--danger-color', data.colors.danger);
            root.style.setProperty('--safe-color', data.colors.safe);
            
            // minigame specific colors
            root.style.setProperty('--minigame-color-1', data.colors.minigameColor1);
            root.style.setProperty('--minigame-color-2', data.colors.minigameColor2);
            root.style.setProperty('--minigame-color-3', data.colors.minigameColor3);
            root.style.setProperty('--minigame-color-4', data.colors.minigameColor4);
            root.style.setProperty('--minigame-color-5', data.colors.minigameColor5);
            
            // legacy compatibility
            root.style.setProperty('--neon-blue', data.colors.primary);
            root.style.setProperty('--light-blue', data.colors.primary);
            root.style.setProperty('--safe-zone', data.colors.safe);
            root.style.setProperty('--glow', `rgba(${data.colors.primaryRgba}, 0.7)`);
            
            console.log('[MinigameColors] Theme updated from config', data.colors);
        }
        
        if (data.action === 'start') {
            cleanupAllContainers();
            $('.pulse-bar').removeClass('success-bar fail-bar');
            $('body').removeClass('sequence-active');
            $('#hack-container').fadeIn(500);
            window.firewallPulseFunctions.start(data.config);
        } else if (data.action === 'end') {
            $('#hack-container').fadeOut(500);
            window.firewallPulseFunctions.stop();
        } else if (data.action === 'startSequence') {
            cleanupAllContainers();
            if (data.hideCursor) {
                $('body').addClass('sequence-active');
            }
            $('#sequence-container').fadeIn(500);
            window.backdoorSequenceFunctions.start(data.config);
        } else if (data.action === 'endSequence') {
            $('body').removeClass('sequence-active');
            $('#sequence-container').fadeOut(500);
            window.backdoorSequenceFunctions.stop();
        } else if (data.action === 'startRhythm') {
            cleanupAllContainers();
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
            cleanupAllContainers();
            window.keymashFunctions.setup(data.config);
            window.keymashFunctions.start();
        } else if (data.action === 'startNumberedSequence') {
            cleanupAllContainers();
            
            if (typeof window.startNumberedSequenceGame === 'function') {
                window.startNumberedSequenceGame(data.config);
            } else if (typeof startNumberedSequenceGame !== 'undefined') {
                startNumberedSequenceGame(data.config);
            } else {
                console.error('startNumberedSequenceGame function not found!');
                $('#numbered-sequence-container').addClass('active').show();
            }
        } else if (data.action === 'startSymbolSearch') {
            cleanupAllContainers();
            
            if (typeof window.startSymbolSearchGame === 'function') {
                window.startSymbolSearchGame(data.config);
            } else {
                console.error('startSymbolSearchGame function not found!');
                $('#symbol-search-container').show();
            }
        } else if (data.action === 'endSymbolSearch') {
            if (typeof window.closeSymbolSearchGame === 'function') {
                window.closeSymbolSearchGame();
            } else {
                $('#symbol-search-container').fadeOut(500);
            }
        } else if (data.action === 'startPipePressure') {
            cleanupAllContainers();
            
            if (window.pipePressureFunctions && typeof window.pipePressureFunctions.start === 'function') {
                window.pipePressureFunctions.start(data.config);
            } else {
                console.error('pipePressureFunctions.start not found!');
                $('#pipe-pressure-container').show();
            }
        } else if (data.action === 'endPipePressure') {
            if (window.pipePressureFunctions && typeof window.pipePressureFunctions.close === 'function') {
                window.pipePressureFunctions.close();
            } else {
                $('#pipe-pressure-container').fadeOut(500);
            }
        } else if (data.action === 'startPairs') {
            cleanupAllContainers();
            
            if (window.pairsFunctions && typeof window.pairsFunctions.start === 'function') {
                window.pairsFunctions.start(data.config);
            } else {
                console.error('pairsFunctions.start not found!');
                $('#pairs-container').show();
            }
        } else if (data.action === 'endPairs') {
            if (window.pairsFunctions && typeof window.pairsFunctions.close === 'function') {
                window.pairsFunctions.close();
            } else {
                $('#pairs-container').fadeOut(500);
            }
        } else if (data.action === 'startMemoryColors') {
            cleanupAllContainers();
            
            if (window.memoryColorsFunctions && typeof window.memoryColorsFunctions.start === 'function') {
                window.memoryColorsFunctions.start(data.config);
            } else {
                console.error('memoryColorsFunctions.start not found!');
                $('#memory-colors-container').show();
            }
        } else if (data.action === 'endMemoryColors') {
            if (window.memoryColorsFunctions && typeof window.memoryColorsFunctions.close === 'function') {
                window.memoryColorsFunctions.close();
            } else {
                $('#memory-colors-container').fadeOut(500);
            }
        } else if (data.action === 'startUntangle') {
            cleanupAllContainers();
            
            if (window.untangleFunctions && typeof window.untangleFunctions.start === 'function') {
                window.untangleFunctions.start(data.config);
            } else {
                console.error('untangleFunctions.start not found!');
                $('#untangle-container').show();
            }
        } else if (data.action === 'endUntangle') {
            if (window.untangleFunctions && typeof window.untangleFunctions.close === 'function') {
                window.untangleFunctions.close();
            } else {
                $('#untangle-container').fadeOut(500);
            }
        } else if (data.action === 'startFingerprint') {
            cleanupAllContainers();
            
            if (window.fingerprintFunctions && typeof window.fingerprintFunctions.start === 'function') {
                window.fingerprintFunctions.start(data.config);
            } else {
                console.error('fingerprintFunctions.start not found!');
                $('#fingerprint-container').show();
            }
        } else if (data.action === 'endFingerprint') {
            if (window.fingerprintFunctions && typeof window.fingerprintFunctions.close === 'function') {
                window.fingerprintFunctions.close();
            } else {
                $('#fingerprint-container').fadeOut(500);
            }
        } else if (data.action === 'startCodeCrack') {
            cleanupAllContainers();
            
            if (window.codeCrackFunctions && typeof window.codeCrackFunctions.start === 'function') {
                window.codeCrackFunctions.start(data.config);
            } else {
                console.error('codeCrackFunctions.start not found!');
                $('#code-crack-container').show();
            }
        } else if (data.action === 'endCodeCrack') {
            if (window.codeCrackFunctions && typeof window.codeCrackFunctions.close === 'function') {
                window.codeCrackFunctions.close();
            } else {
                $('#code-crack-container').fadeOut(500);
            }
        } else if (data.action === 'startWordCrack') {
            cleanupAllContainers();
            
            if (window.wordCrackFunctions && typeof window.wordCrackFunctions.start === 'function') {
                window.wordCrackFunctions.start(data.config);
            } else {
                console.error('wordCrackFunctions.start not found!');
                $('#word-crack-container').show();
            }
        } else if (data.action === 'endWordCrack') {
            if (window.wordCrackFunctions && typeof window.wordCrackFunctions.close === 'function') {
                window.wordCrackFunctions.close();
            } else {
                $('#word-crack-container').fadeOut(500);
            }
        } else if (data.action === 'startBalance') {
            cleanupAllContainers();
            console.log('[app.js] startBalance received, balanceGame exists:', !!window.balanceGame);
            if (window.balanceGame && typeof window.balanceGame.start === 'function') {
                window.balanceGame.start(data.config || {});
            } else {
                console.error('[app.js] balanceGame.start not found!');
            }
        } else if (data.action === 'endBalance') {
            if (window.balanceGame && typeof window.balanceGame.close === 'function') {
                window.balanceGame.close();
            } else {
                $('#balance-container').fadeOut(500);
            }
        } else if (data.action === 'startAimTest') {
            cleanupAllContainers();
            if (window.aimTestGame && typeof window.aimTestGame.start === 'function') {
                window.aimTestGame.start(data.config || {});
            } else {
                console.error('[app.js] aimTestGame.start not found!');
            }
        } else if (data.action === 'endAimTest') {
            if (window.aimTestGame && typeof window.aimTestGame.close === 'function') {
                window.aimTestGame.close();
            } else {
                $('#aim-test-container').fadeOut(500);
            }
        } else if (data.action === 'startCircleClick') {
            cleanupAllContainers();
            if (window.circleClickGame && typeof window.circleClickGame.start === 'function') {
                window.circleClickGame.start(data.config || {});
            } else {
                console.error('[app.js] circleClickGame.start not found!');
            }
        } else if (data.action === 'endCircleClick') {
            if (window.circleClickGame && typeof window.circleClickGame.close === 'function') {
                window.circleClickGame.close();
            } else {
                $('#circle-click-container').fadeOut(500);
            }
        } else if (data.action === 'startLockpick') {
            cleanupAllContainers();
            if (window.lockpickGame && typeof window.lockpickGame.start === 'function') {
                window.lockpickGame.start(data.config || {});
            } else {
                console.error('[app.js] lockpickGame.start not found!');
            }
        } else if (data.action === 'endLockpick') {
            if (window.lockpickGame && typeof window.lockpickGame.close === 'function') {
                window.lockpickGame.close();
            } else {
                $('#lockpick-container').fadeOut(500);
            }
        } else if (data.action === 'keyPress') {
            window.keymashFunctions.handleKeypress(data.keyCode);
        } else if (data.action === 'keyRelease') {
            if (window.keymashFunctions && typeof window.keymashFunctions.handleKeyRelease === 'function') {
                window.keymashFunctions.handleKeyRelease(data.keyCode);
            }
        } else if (data.action === 'stopKeymash') {
            window.keymashFunctions.stop(false);
        } else if (data.action === 'forceClose' || data.action === 'closeAll') {
            // Clean up everything and hide all containers
            cleanupAllContainers();
            
            // Reset all game states
            if (window.firewallPulseFunctions && typeof window.firewallPulseFunctions.stop === 'function') {
                window.firewallPulseFunctions.stop();
            }
            
            if (window.backdoorSequenceFunctions && typeof window.backdoorSequenceFunctions.stop === 'function') {
                window.backdoorSequenceFunctions.stop();
            }
            
            $('body').removeClass('sequence-active');
            
            if (window.rhythmFunctions && typeof window.rhythmFunctions.stop === 'function') {
                window.rhythmFunctions.stop();
            }
            
            if (window.keymashFunctions && typeof window.keymashFunctions.stop === 'function') {
                window.keymashFunctions.stop(false);
            }
            
            if (window.verbalMemoryGameState) {
                if (verbalMemoryGameState.wordTimer) {
                    clearTimeout(verbalMemoryGameState.wordTimer);
                }
                if (verbalMemoryGameState.countdownTimer) {
                    clearInterval(verbalMemoryGameState.countdownTimer);
                }
            }
            
            if (typeof window.closeSymbolSearchGame === 'function') {
                window.closeSymbolSearchGame();
            }
            
            if (window.pipePressureFunctions && typeof window.pipePressureFunctions.close === 'function') {
                window.pipePressureFunctions.close();
            }
            
            if (window.untangleFunctions && typeof window.untangleFunctions.close === 'function') {
                window.untangleFunctions.close();
            }
            
            if (window.fingerprintFunctions && typeof window.fingerprintFunctions.close === 'function') {
                window.fingerprintFunctions.close();
            }
            
            console.log("Force closed all minigames:", data.reason || "Unknown reason");
        }
    });
    
    $('#hack-button').on('click', function() {
        window.firewallPulseFunctions.checkResult();
    });
    
    $(document).on('keydown', function(e) {
        if (window.backdoorSequenceFunctions && window.backdoorSequenceFunctions.isActive()) {
            const key = window.backdoorSequenceFunctions.keyCodeMap[e.keyCode];
            if (key) {
                e.preventDefault();
                window.backdoorSequenceFunctions.handleKeyPress(key);
            }
        }
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

function cleanupAllContainers() {
    $('#hack-container, #sequence-container, #rhythm-container, #keymash-container, #var-hack-container, #memory-container, #sequence-memory-container, #verbal-memory-container, #numbered-sequence-container, #symbol-search-container, #pipe-pressure-container, #pairs-container, #memory-colors-container, #untangle-container, #fingerprint-container, #code-crack-container, #word-crack-container, #balance-container, #aim-test-container, #circle-click-container, #lockpick-container')
        .removeClass('active')
        .hide();
    
    $('body, html').css({
        'background-color': 'transparent',
        'background': 'transparent'
    });

    $('body > div.overlay, body > div.backdrop').remove();
}