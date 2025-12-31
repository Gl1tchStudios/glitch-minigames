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

// Fingerprint Minigame
var Fingerprint = (function() {
    var active = false;
    var rowCount = 5;
    var optionsPerRow = 8;
    var timeLimit = 30000;
    var timeRemaining = 0;
    var timerInterval = null;
    var canvas = null;
    var ctx = null;
    var correctPattern = [];
    var currentSelections = [];
    var showAlignedCount = true;
    var showCorrectIndicator = true;
    var pulsePhase = 0;
    var pulseAnimationFrame = null;

    var ARC_COLOR = '#00d4ff';
    var ARC_GLOW = 'rgba(0, 212, 255, 0.5)';
    var ARC_CORRECT_COLOR = '#00ff88';
    var ARC_CORRECT_GLOW = 'rgba(0, 255, 136, 0.6)';
    var CANVAS_WIDTH = 500;
    var CANVAS_HEIGHT = 400;
    var CENTER_X = CANVAS_WIDTH / 2;
    var CENTER_Y = CANVAS_HEIGHT / 2;
    var ROW_HEIGHT = CANVAS_HEIGHT / rowCount;

    // how big each ring is from the middle out
    var ringRadii = [30, 48, 66, 84, 102, 120, 138, 156, 174];
    
    // which rings show up in which row mate
    // top row is 0 bottom is 4
    var rowRingAssignments = [
        [8, 7, 6],      // top row gets the big outer rings
        [6, 5, 4],      // second row
        [4, 3, 2],      // middle bit
        [2, 1, 0],      // fourth row
        [1, 0]          // bottom row has the tiny inner ones
    ];

    // all the curvy bits for each ring
    var baseArcPatterns = [
        [[0.15, 0.7], [1.0, 0.8], [2.0, 0.7]],
        [[0.1, 0.65], [0.9, 0.75], [1.85, 0.8]],
        [[0.05, 0.6], [0.8, 0.7], [1.7, 0.85]],
        [[0.0, 0.55], [0.7, 0.65], [1.55, 0.75], [2.5, 0.4]],
        [[-0.05, 0.5], [0.6, 0.6], [1.4, 0.7], [2.3, 0.55]],
        [[-0.1, 0.45], [0.5, 0.55], [1.25, 0.65], [2.1, 0.6]],
        [[-0.15, 0.4], [0.4, 0.5], [1.1, 0.6], [1.9, 0.55], [2.65, 0.35]],
        [[-0.2, 0.35], [0.3, 0.45], [0.95, 0.55], [1.7, 0.5], [2.4, 0.45]],
        [[-0.25, 0.3], [0.2, 0.4], [0.8, 0.5], [1.5, 0.45], [2.15, 0.4], [2.75, 0.25]]
    ];

    // how much it spins when you click the arrows
    var rotationStep = (Math.PI * 2) / optionsPerRow;

    function init() {
        canvas = document.getElementById('fingerprint-canvas');
        if (!canvas) return;
        
        ctx = canvas.getContext('2d');
        canvas.width = CANVAS_WIDTH;
        canvas.height = CANVAS_HEIGHT;
        
        setupEventListeners();
    }

    function setupEventListeners() {
        $(document).off('click.fingerprint').on('click.fingerprint', '.fp-arrow-left', function() {
            if (!active) return;
            var rowIndex = parseInt($(this).data('row'));
            rotateRow(rowIndex, -1);
        });
        
        $(document).off('click.fpright').on('click.fpright', '.fp-arrow-right', function() {
            if (!active) return;
            var rowIndex = parseInt($(this).data('row'));
            rotateRow(rowIndex, 1);
        });
    }

    function rotateRow(rowIndex, direction) {
        if (rowIndex < 0 || rowIndex >= rowCount) return;
        
        currentSelections[rowIndex] = (currentSelections[rowIndex] + direction + optionsPerRow) % optionsPerRow;
        
        playSound('sound-click');
        render();
        checkWin();
    }

    function start(config) {
        if (active) return;
        
        config = config || {};
        timeLimit = config.timeLimit || 30000;
        showAlignedCount = config.showAlignedCount !== false;
        showCorrectIndicator = config.showCorrectIndicator !== false;
        
        active = true;
        timeRemaining = timeLimit;
        pulsePhase = 0;
        
        // winning position is all zeros basically everything lined up
        correctPattern = [0, 0, 0, 0, 0];
        
        // random at the start
        currentSelections = [];
        var hasWrong = false;
        for (var i = 0; i < rowCount; i++) {
            var sel = Math.floor(Math.random() * optionsPerRow);
            if (sel !== 0) hasWrong = true;
            currentSelections.push(sel);
        }
        
        // make sure at least 3 rows are wrong so its not too easy
        var wrongCount = 0;
        for (var i = 0; i < rowCount; i++) {
            if (currentSelections[i] !== 0) wrongCount++;
        }
        while (wrongCount < 3) {
            var idx = Math.floor(Math.random() * rowCount);
            if (currentSelections[idx] === 0) {
                currentSelections[idx] = 1 + Math.floor(Math.random() * (optionsPerRow - 1));
                wrongCount++;
            }
        }
        
        init();
        createRowControls();
        
        if (showAlignedCount) {
            $('.fingerprint-stats').show();
        } else {
            $('.fingerprint-stats').hide();
        }
        
        render();
        startTimer();
        
        if (showCorrectIndicator) {
            startPulseAnimation();
        }
        
        $('#fingerprint-container').addClass('active').show();
    }

    function createRowControls() {
        var $controls = $('#fingerprint-row-controls');
        $controls.empty();
        
        for (var i = 0; i < rowCount; i++) {
            var $row = $('<div class="fp-row-control" data-row="' + i + '"></div>');
            $row.append('<button class="fp-arrow fp-arrow-left" data-row="' + i + '"><span>&lt;</span></button>');
            $row.append('<button class="fp-arrow fp-arrow-right" data-row="' + i + '"><span>&gt;</span></button>');
            $controls.append($row);
        }
    }

    function render() {
        if (!ctx || !canvas) return;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        ctx.strokeStyle = 'rgba(0, 212, 255, 0.25)';
        ctx.lineWidth = 1;
        for (var i = 1; i < rowCount; i++) {
            var y = i * ROW_HEIGHT;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }
        
        ctx.strokeStyle = 'rgba(0, 212, 255, 0.12)';
        for (var i = 0; i < rowCount; i++) {
            ctx.strokeRect(8, i * ROW_HEIGHT + 4, canvas.width - 16, ROW_HEIGHT - 8);
        }

        for (var row = 0; row < rowCount; row++) {
            var rotation = currentSelections[row] * rotationStep;
            var rowTop = row * ROW_HEIGHT;
            var isCorrect = currentSelections[row] === correctPattern[row];
            
            ctx.save();
            ctx.beginPath();
            ctx.rect(0, rowTop, canvas.width, ROW_HEIGHT);
            ctx.clip();
            
            var pulseIntensity = 0;
            if (isCorrect && showCorrectIndicator) {
                pulseIntensity = (Math.sin(pulsePhase) + 1) / 2;
            }
            
            if (isCorrect && showCorrectIndicator) {
                var baseGlow = 15 + pulseIntensity * 20;
                ctx.shadowColor = ARC_CORRECT_GLOW;
                ctx.shadowBlur = baseGlow;
                ctx.strokeStyle = ARC_CORRECT_COLOR;
                ctx.lineWidth = 5 + pulseIntensity * 2;
            } else {
                ctx.shadowColor = ARC_GLOW;
                ctx.shadowBlur = 15;
                ctx.strokeStyle = ARC_COLOR;
                ctx.lineWidth = 5;
            }
            ctx.lineCap = 'round';
            
            for (var ringIdx = 0; ringIdx < ringRadii.length; ringIdx++) {
                var radius = ringRadii[ringIdx];
                var arcs = baseArcPatterns[ringIdx];
                
                for (var a = 0; a < arcs.length; a++) {
                    var startAngle = arcs[a][0] * Math.PI + rotation;
                    var sweepAngle = arcs[a][1] * Math.PI;
                    var endAngle = startAngle + sweepAngle;
                    
                    ctx.beginPath();
                    ctx.arc(CENTER_X, CENTER_Y, radius, startAngle, endAngle);
                    ctx.stroke();
                }
            }
            
            ctx.restore();
        }
        
        if (showAlignedCount) {
            var matched = 0;
            for (var i = 0; i < rowCount; i++) {
                if (currentSelections[i] === correctPattern[i]) matched++;
            }
            $('#fingerprint-matched').text(matched + '/' + rowCount);
        }
    }

    function startPulseAnimation() {
        if (pulseAnimationFrame) {
            cancelAnimationFrame(pulseAnimationFrame);
        }
        
        function animate() {
            if (!active) return;
            
            pulsePhase += 0.08;
            render();
            pulseAnimationFrame = requestAnimationFrame(animate);
        }
        
        pulseAnimationFrame = requestAnimationFrame(animate);
    }

    function stopPulseAnimation() {
        if (pulseAnimationFrame) {
            cancelAnimationFrame(pulseAnimationFrame);
            pulseAnimationFrame = null;
        }
    }

    function checkWin() {
        for (var i = 0; i < rowCount; i++) {
            if (currentSelections[i] !== correctPattern[i]) return;
        }
        endGame(true);
    }

    function startTimer() {
        if (timerInterval) clearInterval(timerInterval);
        
        var startTime = Date.now();
        var $progress = $('.fingerprint-timer-progress');
        var $timerText = $('#fingerprint-timer');
        
        timerInterval = setInterval(function() {
            if (!active) {
                clearInterval(timerInterval);
                return;
            }
            
            var elapsed = Date.now() - startTime;
            timeRemaining = Math.max(0, timeLimit - elapsed);
            
            var percent = (timeRemaining / timeLimit) * 100;
            $progress.css('width', percent + '%');
            
            if (percent <= 20) {
                $progress.addClass('danger');
            } else {
                $progress.removeClass('danger');
            }
            
            $timerText.text((timeRemaining / 1000).toFixed(1));
            
            if (timeRemaining <= 0) {
                clearInterval(timerInterval);
                endGame(false);
            }
        }, 50);
    }

    function endGame(success) {
        if (!active) return;
        active = false;
        
        stopPulseAnimation();
        
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        
        var $result = $('<div class="fingerprint-result ' + (success ? 'success' : 'failure') + '">' + 
            (success ? 'ACCESS GRANTED' : 'ACCESS DENIED') + '</div>');
        $('.fingerprint-display').append($result);
        
        playSound(success ? 'sound-success' : 'sound-failure');
        
        setTimeout(function() {
            $.post('https://glitch-minigames/fingerprintResult', JSON.stringify({ success: success }));
            close();
        }, 1500);
    }

    function close() {
        active = false;
        
        stopPulseAnimation();
        
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        
        $('.fingerprint-result').remove();
        $('#fingerprint-row-controls').empty();
        
        $('#fingerprint-container').removeClass('active').fadeOut(300, function() {
            $.post('https://glitch-minigames/fingerprintClose', JSON.stringify({}));
        });
    }

    function playSound(soundId) {
        var sound = document.getElementById(soundId);
        if (sound) {
            sound.currentTime = 0;
            sound.play().catch(function() {});
        }
    }

    window.fingerprintFunctions = {
        start: start,
        close: close
    };

    return {
        start: start,
        close: close
    };
})();
