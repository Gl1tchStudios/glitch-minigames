// Dev-only preview harness for the minigame NUI (not listed in fxmanifest, never
// shipped to clients). Load it in a browser on ui/index.html, then call
// mg('symbol', { colour: 'glitch', theme: 'device', keybinds: 'device' }).
//
// COMMENTED OUT: dev-only. To use it, remove the /* and */ lines below.
/*
(function () {
    // Colour themes, copied from shared/config.lua
    var COLOURS = {
        cyan: { primary: '#33b5e5', primaryRgba: '51, 181, 229', secondary: '#0078d7', secondaryRgba: '0, 120, 215', success: '#33b5e5', successRgba: '51, 181, 229', failure: '#ff4444', failureRgba: '255, 68, 68', warning: '#ff7a30', warningRgba: '255, 122, 48', background: '#0f1e2d', backgroundRgba: '15, 30, 45', backgroundGradient1: '#0f1e2d', backgroundGradient1Rgba: '15, 30, 45', backgroundGradient2: '#1e3c5a', backgroundGradient2Rgba: '30, 60, 90', backgroundSecondary: '#001428', backgroundSecondaryRgba: '0, 20, 40', backgroundTertiary: '#002038', backgroundTertiaryRgba: '0, 32, 56', border: '#33b5e5', borderRgba: '51, 181, 229', text: '#ffffff', textRgba: '255, 255, 255', textSecondary: '#969696', textSecondaryRgba: '150, 150, 150', danger: '#ff3030', dangerRgba: '255, 48, 48', safe: '#36ff00', safeRgba: '54, 255, 0', minigameColor1: '#273cfcff', minigameColor2: '#2add57ff', minigameColor3: '#28e757ff', minigameColor4: '#edeb64ff', minigameColor5: '#eb87deff' },
        glitch: { primary: '#c04cff', primaryRgba: '192, 76, 255', secondary: '#7a2bd6', secondaryRgba: '122, 43, 214', success: '#36f1a0', successRgba: '54, 241, 160', failure: '#ff4d6d', failureRgba: '255, 77, 109', warning: '#ff9f43', warningRgba: '255, 159, 67', background: '#120a1c', backgroundRgba: '18, 10, 28', backgroundGradient1: '#120a1c', backgroundGradient1Rgba: '18, 10, 28', backgroundGradient2: '#2a1240', backgroundGradient2Rgba: '42, 18, 64', backgroundSecondary: '#0c0614', backgroundSecondaryRgba: '12, 6, 20', backgroundTertiary: '#1c0d2c', backgroundTertiaryRgba: '28, 13, 44', border: '#c04cff', borderRgba: '192, 76, 255', text: '#ffffff', textRgba: '255, 255, 255', textSecondary: '#a59bb3', textSecondaryRgba: '165, 155, 179', danger: '#ff3b5c', dangerRgba: '255, 59, 92', safe: '#36f1a0', safeRgba: '54, 241, 160', minigameColor1: '#6f5bffff', minigameColor2: '#ff4d6dff', minigameColor3: '#36f1a0ff', minigameColor4: '#ffd166ff', minigameColor5: '#e86bffff' }
    };

    var GAMES = {
        firewall: { action: 'start', config: { maxHacks: 3, hackSpeed: 2, timeLimit: 10, safeZoneMinWidth: 30, safeZoneMaxWidth: 120, safeZoneShrinkAmount: 10 } },
        backdoor: { action: 'startSequence', config: { requiredSequences: 3, sequenceLength: 5, timeLimit: 15, maxAttempts: 3, timePenalty: 1, minSimultaneousKeys: 1, maxSimultaneousKeys: 3 } },
        rhythm: { action: 'startRhythm', config: { lanes: 4, noteSpeed: 150, noteSpawnRate: 1000, requiredNotes: 20, difficulty: 'normal', maxWrongKeys: 5, maxMissedNotes: 3 } },
        surge: { action: 'startKeymash', config: { possibleKeys: ['E'], keyPressValue: 2, decayRate: 2 } },
        varhack: { action: 'startVarHack', config: { blocks: 5, speed: 5 } },
        memory: { action: 'startMemory', config: { gridSize: 5, squareCount: 8, rounds: 3, showTime: 3000, maxWrongPresses: 3 } },
        seqmemory: { type: 'startSequenceMemory', config: { gridSize: 4, maxRounds: 5, maxWrongPresses: 3, showTime: 1000, delayBetween: 300 } },
        verbal: { action: 'startVerbalMemory', config: { maxStrikes: 3, wordsToShow: 50, wordDuration: 5000 } },
        numbered: { action: 'startNumberedSequence', config: { gridSize: 4, sequenceLength: 6, rounds: 3, showTime: 4000, guessTime: 10000, maxWrongPresses: 3 } },
        symbol: { action: 'startSymbolSearch', config: { gridSize: 8, shiftInterval: 2500, timeLimit: 30000, minKeyLength: 2, maxKeyLength: 2, symbolType: 'symbols' } },
        pipe: { action: 'startPipePressure', config: { gridSize: 6, timeLimit: 30000 } },
        pairs: { action: 'startPairs', config: { gridSize: 4, timeLimit: 120000, maxAttempts: 0 } },
        colors: { action: 'startMemoryColors', config: { gridSize: 5, memorizeTime: 5000, answerTime: 10000, rounds: 3 } },
        untangle: { action: 'startUntangle', config: { nodeCount: 8, timeLimit: 60000 } },
        fingerprint: { action: 'startFingerprint', config: { timeLimit: 30000, showAlignedCount: true, showCorrectIndicator: true } },
        codecrack: { action: 'startCodeCrack', config: { timeLimit: 60000, digitCount: 4, maxAttempts: 6 } },
        wordcrack: { action: 'startWordCrack', config: { timeLimit: 120000, wordLength: 5, maxAttempts: 6 } },
        balance: { action: 'startBalance', config: { timeLimit: 10000, driftSpeed: 3, sensitivity: 8, greenZoneWidth: 30, yellowZoneWidth: 25, driftRandomness: 2, maxDangerTime: 1000 } },
        aim: { action: 'startAimTest', config: { timeLimit: 30000, targetsToHit: 10, targetLifetime: 1500, targetSize: 60, shrinkTarget: true, maxMisses: 5, timePenalty: 0 } },
        circle: { action: 'startCircleClick', config: { rounds: 5, rotationSpeed: 2, targetZoneSize: 45, maxFailures: 3, speedIncrease: 0.15, randomizeDirection: true, keys: ['W', 'A', 'S', 'D'] } },
        lockpick: { action: 'startLockpick', config: { rounds: 3, sweetSpotSize: 30, maxFailures: 2, shakeRange: 40, lockTime: 500 } },
        barhit: { action: 'startBarHit', config: { key: 'E', rounds: 3, speed: 55, zoneSize: 20, maxFailures: 3, timeLimit: 30000 } },
        skill: { action: 'startSkillCheck', config: { keys: ['E', 'F', 'R'], speed: 65, timeLimit: 15000, zoneSize: 18, perfectZoneSize: 5, maxFailures: 1, randomizeZone: true } },
        numberup: { action: 'startNumberUp', config: { count: 20, timeLimit: 30000, gridCols: 4, maxMistakes: 3 } },
        keys: { action: 'startKeys', config: { count: 18, timeLimit: 15000, gridCols: 6, maxMistakes: 3 } },
        combo: { action: 'startComboInput', config: { rounds: 3, comboLength: 4, timePerCombo: 6, maxFailures: 2, lengthIncrease: 0 } },
        hold: { action: 'startHoldZone', config: { key: 'E', rounds: 3, speed: 18, zoneSize: 18, perfectZoneSize: 0, maxFailures: 2, idleTimeout: 0 } },
        wire: { action: 'startWireConnect', config: { wireCount: 4, timeLimit: 0 } },
        simon: { action: 'startSimonSays', config: { rounds: 5, flashSpeed: 550, flashGap: 250, timeLimit: 20, maxMistakes: 1 } }
    };

    var HUD = [
        { keys: ['W', 'A', 'S', 'D'], label: 'Move the marker' },
        { keys: ['ENTER', 'SPACE'], label: 'Select' },
        { keys: ['BKSP', 'ESC'], label: 'Cancel', cancel: true }
    ];

    // keep fetch() to the FiveM callback host from throwing in a browser
    var realFetch = window.fetch;
    window.fetch = function (url) {
        if (String(url).indexOf('https://glitch-minigames/') === 0) return Promise.resolve(new Response('{}'));
        return realFetch.apply(this, arguments);
    };
    $.post = function () { return $.Deferred().resolve('{}'); };

    // stand-in game world behind the UI (body / html are forced transparent)
    var bg = document.createElement('div');
    bg.id = 'harness-bg';
    bg.style.cssText = 'position:fixed;inset:0;z-index:-1;background:radial-gradient(ellipse at 70% 30%, rgba(120,95,70,.55), transparent 60%),radial-gradient(ellipse at 20% 80%, rgba(40,60,70,.6), transparent 55%),linear-gradient(160deg,#3b3226 0%,#2a2620 40%,#1b1c1e 100%)';
    document.body.appendChild(bg);

    window.mg = function (name, style) {
        style = style || {};
        if (!document.getElementById('harness-bg')) document.body.appendChild(bg);
        var colours = COLOURS[style.colour || 'glitch'];
        window.postMessage({ action: 'setColors', colors: colours, visualTheme: style.theme || 'device', backgroundOpacity: 0.95 }, '*');
        window.postMessage({ action: 'forceClose' }, '*');
        setTimeout(function () {
            window.postMessage({ action: 'controlsShow', title: name, rows: HUD, hudTheme: style.keybinds || 'default' }, '*');
            var g = GAMES[name];
            var msg = { config: JSON.parse(JSON.stringify(g.config)) };
            if (g.type) msg.type = g.type; else msg.action = g.action;
            window.postMessage(msg, '*');
        }, 50);
        return name;
    };
    window.mgList = Object.keys(GAMES);
})();
*/
