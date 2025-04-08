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

// Core variables
let rhythmActive = false;
let rhythmLanes = [];
let rhythmKeys = [];
let rhythmNotes = [];
let currentCombo = 0;
let maxCombo = 0;
let totalScore = 0;
let noteSpeed = 300; // pixels per second
let noteSpawnRate = 1000; // ms between notes
let spawnInterval;
let moveInterval;
let totalNotes = 0;
let notesHit = 0;
let wrongKeyCount = 0;
let maxWrongKeys = 5;
let activeLane = -1;
let gameProgress = 0;
let requiredNotes = 20;
let lastHitTime = 0;
let missedNotes = 0;
let maxMissedNotes = 3; // Default value

// Timing windows in milliseconds
const timingWindows = {
    perfect: 10,  // +50ms
    great: 15,   // +100ms
    okay: 20     // +200ms
};

const scoreValues = {
    perfect: 100,
    great: 50,
    okay: 20,
    miss: 0
};

let rhythmConfig = {
    lanes: 4,
    keys: ['A', 'S', 'D', 'F'],
    noteSpeed: 300,
    noteSpawnRate: 1000,
    requiredNotes: 20,
    maxWrongKeys: 5,
    maxMissedNotes: 3,
    difficulty: 'normal'
};

function setupRhythmGame(config) {
    rhythmConfig = {
        lanes: config?.lanes || 4,
        keys: config?.keys || ['A', 'S', 'D', 'F'],
        noteSpeed: config?.noteSpeed || 300,
        noteSpawnRate: config?.noteSpawnRate || 1000,
        requiredNotes: config?.requiredNotes || 20,
        maxWrongKeys: config?.maxWrongKeys || 5,
        maxMissedNotes: config?.maxMissedNotes || 3,
        difficulty: config?.difficulty || 'normal'
    };

    if (rhythmConfig.difficulty === 'easy') {
        Object.keys(timingWindows).forEach(key => timingWindows[key] *= 1.5);
    } else if (rhythmConfig.difficulty === 'hard') {
        Object.keys(timingWindows).forEach(key => timingWindows[key] *= 0.7);
    }

    if (rhythmConfig.keys.length > rhythmConfig.lanes) {
        rhythmConfig.keys = rhythmConfig.keys.slice(0, rhythmConfig.lanes);
    }

    while (rhythmConfig.keys.length < rhythmConfig.lanes) {
        rhythmConfig.keys.push(String.fromCharCode(65 + rhythmConfig.keys.length));
    }

    noteSpeed = rhythmConfig.noteSpeed;
    noteSpawnRate = rhythmConfig.noteSpawnRate;
    requiredNotes = rhythmConfig.requiredNotes;
    maxWrongKeys = rhythmConfig.maxWrongKeys;
    maxMissedNotes = rhythmConfig.maxMissedNotes;
    rhythmLanes = Array(rhythmConfig.lanes).fill(0);
    rhythmKeys = rhythmConfig.keys;
    
    $('#rhythm-key-hint').text('Press ' + rhythmKeys.join(', ') + ' to hit the notes');
    
    resetRhythmGame();
}

function buildRhythmUI() {
    const highway = $('.rhythm-highway');
    const keyIndicators = $('.key-indicators');
    
    highway.empty();
    keyIndicators.empty();
    
    for (let i = 0; i < rhythmConfig.lanes; i++) {
        const lane = $('<div class="rhythm-lane"></div>');
        highway.append(lane);
        
        const keyIndicator = $('<div class="key-indicator"></div>');
        keyIndicator.text(rhythmKeys[i]);
        keyIndicator.attr('data-lane', i);
        keyIndicators.append(keyIndicator);
        
        const feedback = $('<div class="rhythm-feedback" data-lane="' + i + '"></div>');
        lane.append(feedback);
    }
}

function spawnNote() {
    if (!rhythmActive) return;
    
    const lane = Math.floor(Math.random() * rhythmConfig.lanes);
    
    const highway = $('.rhythm-highway');
    const laneEl = highway.find('.rhythm-lane').eq(lane);
    
    const note = $('<div class="rhythm-note"></div>');
    note.css('top', '-20px');
    laneEl.append(note);
    
    rhythmNotes.push({
        element: note,
        lane: lane,
        position: -20,
        startTime: Date.now(),
        hit: false
    });
    
    totalNotes++;
    updateProgressBar();
}

function moveNotes() {
    if (!rhythmActive) return;
    
    const now = Date.now();
    const hitZonePos = $('.hit-zone').position().top;
    const moveAmount = noteSpeed / 60; // this may cause issues down the line due to FPS differences
    
    for (let i = rhythmNotes.length - 1; i >= 0; i--) {
        const note = rhythmNotes[i];
        
        if (note.hit) continue;
        
        note.position += moveAmount;
        note.element.css('top', note.position + 'px');
        
        if (note.position > hitZonePos + 50) {
            showFeedback(note.lane, 'miss');
            breakCombo();
            
            missedNotes++;
            
            $('#rhythm-message').text(`Missed ${missedNotes}/${maxMissedNotes} notes allowed`);
            
            if (missedNotes >= maxMissedNotes) {
                stopRhythmGame(false);
            }
            
            note.element.remove();
            rhythmNotes.splice(i, 1);
        }
    }
}

function handleRhythmKeyPress(e) {
    if (!rhythmActive) return;
    
    const keyPressed = String.fromCharCode(e.keyCode);
    const laneIndex = rhythmKeys.indexOf(keyPressed);
    
    if (laneIndex === -1) return;
    
    $('.key-indicator').eq(laneIndex).addClass('active');
    
    const hitZonePos = $('.hit-zone').position().top;
    let noteHit = false;
    let hitTiming = 'miss';
    let hitNoteIndex = -1;
    
    let closestNote = null;
    let closestDistance = Infinity;
    
    rhythmNotes.forEach((note, index) => {
        if (note.lane === laneIndex && !note.hit) {
            const distance = Math.abs(note.position - hitZonePos);
            if (distance < closestDistance) {
                closestDistance = distance;
                closestNote = note;
                hitNoteIndex = index;
            }
        }
    });
    
    if (closestNote) {
        if (closestDistance <= timingWindows.perfect) {
            hitTiming = 'perfect';
            noteHit = true;
        } else if (closestDistance <= timingWindows.great) {
            hitTiming = 'great';
            noteHit = true;
        } else if (closestDistance <= timingWindows.okay) {
            hitTiming = 'okay';
            noteHit = true;
        }
        
        if (noteHit) {
            closestNote.hit = true;
            closestNote.element.remove();
            rhythmNotes.splice(hitNoteIndex, 1);
            
            updateScore(hitTiming);
            increaseCombo();
            showFeedback(laneIndex, hitTiming);
            notesHit++;
            updateProgressBar();
            
            if (hitTiming === 'perfect') {
                playSoundSafe('sound-click');
            } else if (hitTiming === 'great') {
                playSoundSafe('sound-click');
            } else {
                playSoundSafe('sound-click');
            }
            
            lastHitTime = Date.now();
        }
    } else {
        wrongKeyCount++;
        playSoundSafe('sound-penalty');
        breakCombo();
        showFeedback(laneIndex, 'miss');
        
        if (wrongKeyCount >= maxWrongKeys) {
            stopRhythmGame(false);
        }
    }
}

function handleRhythmKeyRelease(e) {
    if (!rhythmActive) return;
    
    const keyReleased = String.fromCharCode(e.keyCode);
    const laneIndex = rhythmKeys.indexOf(keyReleased);
    
    if (laneIndex === -1) return;
    
    $('.key-indicator').eq(laneIndex).removeClass('active');
}

function updateScore(timing) {
    const multiplier = Math.floor(currentCombo / 10) + 1;
    const points = scoreValues[timing] * multiplier;
    
    totalScore += points;
    $('#rhythm-score').text(totalScore);
}

function increaseCombo() {
    currentCombo++;
    
    if (currentCombo > maxCombo) {
        maxCombo = currentCombo;
    }
    
    $('#combo-number').text(currentCombo);
    
    if (currentCombo > 0 && currentCombo % 10 === 0) {
        $('#combo-number').addClass('combo-highlight');
        playSoundSafe('sound-success');
        setTimeout(() => {
            $('#combo-number').removeClass('combo-highlight');
        }, 500);
    }
}

function breakCombo() {
    currentCombo = 0;
    $('#combo-number').text('0');
}

function showFeedback(lane, timing) {
    const feedback = $(`.rhythm-feedback[data-lane="${lane}"]`);
    
    feedback.text(timing.toUpperCase());
    feedback.removeClass('feedback-perfect feedback-great feedback-okay feedback-miss');
    feedback.addClass(`feedback-${timing}`);
    
    feedback.addClass('feedback-show');
    
    setTimeout(() => {
        feedback.removeClass('feedback-show');
    }, 500);
}

function updateProgressBar() {
    gameProgress = Math.min(100, Math.round((notesHit / requiredNotes) * 100));
    $('.rhythm-progress').css('width', gameProgress + '%');
    $('#rhythm-progress').text(gameProgress);
    
    if (notesHit >= requiredNotes) {
        stopRhythmGame(true);
    }
}

function resetRhythmGame() {
    currentCombo = 0;
    maxCombo = 0;
    totalScore = 0;
    totalNotes = 0;
    notesHit = 0;
    wrongKeyCount = 0;
    missedNotes = 0;
    rhythmNotes = [];
    gameProgress = 0;
    
    $('#rhythm-score').text('0');
    $('#combo-number').text('0');
    $('#rhythm-progress').text('0');
    $('.rhythm-progress').css('width', '0%');
    $('#rhythm-message').text('Hit the notes in sync with the beat');
}

function startRhythmGame() {
    rhythmActive = true;
    
    buildRhythmUI();
    
    resetRhythmGame();
    
    $('.rhythm-note').remove();
    
    spawnInterval = setInterval(spawnNote, noteSpawnRate);
    moveInterval = setInterval(moveNotes, 1000 / 60); // this may cause issues down the line due to FPS differences
    
    document.addEventListener('keydown', handleRhythmKeyPress);
    document.addEventListener('keyup', handleRhythmKeyRelease);
}

function stopRhythmGame(success) {
    rhythmActive = false;
    
    clearInterval(spawnInterval);
    clearInterval(moveInterval);
    
    document.removeEventListener('keydown', handleRhythmKeyPress);
    document.removeEventListener('keyup', handleRhythmKeyRelease);
    
    if (success) {
        $('#rhythm-message').text('SYNCHRONIZATION COMPLETE! Circuit stabilized.');
        playSoundSafe('sound-success');
    } else {
        if (missedNotes >= maxMissedNotes) {
            $('#rhythm-message').text('SYNCHRONIZATION FAILED! Too many missed notes.');
        } else if (wrongKeyCount >= maxWrongKeys) {
            $('#rhythm-message').text('SYNCHRONIZATION FAILED! Too many wrong inputs.');
        } else {
            $('#rhythm-message').text('SYNCHRONIZATION FAILED! Circuit overloaded.');
        }
        playSoundSafe('sound-failure');
    }
    
    setTimeout(() => {
        const result = {
            success: success,
            score: totalScore,
            maxCombo: maxCombo,
            notesHit: notesHit,
            totalNotes: totalNotes,
            accuracy: notesHit > 0 ? Math.round((notesHit / totalNotes) * 100) : 0
        };
        
        fetch('https://glitch-minigames/rhythmResult', {
            method: 'POST',
            body: JSON.stringify(result)
        });
        $('#rhythm-container').fadeOut(500);
    }, 2000);
}

$(document).ready(function() {

});