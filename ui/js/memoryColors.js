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

// Memory Colors Minigame
var MemoryColors = (function() {
    var active = false;
    var gridSize = 6;
    var colorCount = 0;
    var timeLimit = 5000; // Time to memorize
    var answerTime = 10000; // Time to answer
    var rounds = 3;
    var currentRound = 0;
    var timerInterval = null;
    var timeRemaining = 0;
    var phase = 'memorize'; // 'memorize' or 'answer'
    var grid = [];
    var colorCounts = {};
    var askColor = '';
    var correctAnswer = 0;
    var score = 0;

    // Use custom minigame colors from theme config
    function getColors() {
        return {
            'blue': window.MinigameColors?.minigameColor1 || '#3b82f6',
            'red': window.MinigameColors?.minigameColor2 || '#ef4444',
            'green': window.MinigameColors?.minigameColor3 || '#22c55e',
            'yellow': window.MinigameColors?.minigameColor4 || '#eab308'
        };
    }
    
    var COLORS = getColors();
    var COLOR_NAMES = ['blue', 'red', 'green', 'yellow'];

    function generateGrid() {
        grid = [];
        colorCounts = { blue: 0, red: 0, green: 0, yellow: 0 };
        
        var totalCells = gridSize * gridSize;
        var coloredCells = Math.floor(totalCells * 0.3) + Math.floor(Math.random() * (totalCells * 0.2));
        
        for (var r = 0; r < gridSize; r++) {
            grid[r] = [];
            for (var c = 0; c < gridSize; c++) {
                grid[r][c] = null;
            }
        }
        
        var placed = 0;
        while (placed < coloredCells) {
            var r = Math.floor(Math.random() * gridSize);
            var c = Math.floor(Math.random() * gridSize);
            if (grid[r][c] === null) {
                var color = COLOR_NAMES[Math.floor(Math.random() * COLOR_NAMES.length)];
                grid[r][c] = color;
                colorCounts[color]++;
                placed++;
            }
        }
        
        var availableColors = COLOR_NAMES.filter(function(c) { return colorCounts[c] > 0; });
        if (availableColors.length === 0) {
            grid[0][0] = 'blue';
            colorCounts.blue = 1;
            availableColors = ['blue'];
        }
        askColor = availableColors[Math.floor(Math.random() * availableColors.length)];
        correctAnswer = colorCounts[askColor];
    }

    function renderGrid(showColors) {
        var $grid = $('#memory-colors-grid');
        $grid.empty();
        
        for (var r = 0; r < gridSize; r++) {
            for (var c = 0; c < gridSize; c++) {
                var color = grid[r][c];
                var $cell = $('<div class="mc-cell"></div>');
                
                if (showColors && color) {
                    $cell.css('background-color', COLORS[color]);
                    $cell.addClass('mc-colored');
                }
                
                $grid.append($cell);
            }
        }
        
        $grid.css('grid-template-columns', 'repeat(' + gridSize + ', 1fr)');
    }

    function showMemorizePhase() {
        phase = 'memorize';
        generateGrid();
        renderGrid(true);
        
        $('#mc-question').hide().empty();
        $('#mc-answer-section').hide();
        $('#mc-answer-input').val('').removeClass('correct incorrect');
        $('#mc-instruction').text('Memorize the colored boxes!').show();
        $('#mc-round').text(currentRound + ' / ' + rounds);
        $('#mc-score').text(score);
        
        timeRemaining = timeLimit;
        updateTimer();
        
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = setInterval(function() {
            timeRemaining -= 100;
            updateTimer();
            if (timeRemaining <= 0) {
                showAnswerPhase();
            }
        }, 100);
    }

    function showAnswerPhase() {
        phase = 'answer';
        renderGrid(false);
        
        $('#mc-instruction').hide();
        $('#mc-question').html('How many <span class="mc-color-word" style="color: ' + COLORS[askColor] + ';">' + askColor.toUpperCase() + '</span> boxes were there?').show();
        
        $('#mc-answer-input').val('').removeClass('correct incorrect');
        $('#mc-answer-section').show();
        $('#mc-answer-input').focus();
        
        timeRemaining = answerTime;
        updateTimer();
        
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = setInterval(function() {
            timeRemaining -= 100;
            updateTimer();
            if (timeRemaining <= 0) {
                handleAnswer(-1);
            }
        }, 100);
    }

    function submitAnswer() {
        var value = $('#mc-answer-input').val();
        if (value === '' || value === null) {
            value = -1;
        }
        handleAnswer(parseInt(value));
    }

    function handleAnswer(value) {
        if (phase !== 'answer') return;
        
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        
        $('#mc-answer-input').prop('disabled', true);
        $('#mc-submit-btn').prop('disabled', true);
        
        var isCorrect = (parseInt(value) === correctAnswer);
        
        if (isCorrect) {
            $('#mc-answer-input').addClass('correct');
            score++;
            if (typeof playSoundSafe === 'function') {
                playSoundSafe('sound-success');
            }
        } else {
            $('#mc-answer-input').addClass('incorrect');
            if (typeof playSoundSafe === 'function') {
                playSoundSafe('sound-failure');
            }
        }
        
        $('#mc-question').html('The answer was <span style="color: ' + COLORS[askColor] + ';">' + correctAnswer + '</span> ' + askColor.toUpperCase() + ' boxes');
        $('#mc-score').text(score);
        
        setTimeout(function() {
            $('#mc-answer-input').prop('disabled', false);
            $('#mc-submit-btn').prop('disabled', false);
            
            if (currentRound < rounds) {
                nextRound();
            } else {
                endGame(score >= Math.ceil(rounds / 2));
            }
        }, 1500);
    }

    function nextRound() {
        currentRound++;
        showMemorizePhase();
    }

    function updateTimer() {
        var maxTime = phase === 'memorize' ? timeLimit : answerTime;
        var pct = (timeRemaining / maxTime) * 100;
        var sec = (timeRemaining / 1000).toFixed(1);
        
        $('.mc-timer-progress').css('width', pct + '%');
        $('#mc-timer').text(sec);
        
        if (pct < 25) {
            $('.mc-timer-progress').addClass('danger');
        } else {
            $('.mc-timer-progress').removeClass('danger');
        }
    }

    function startGame(config) {
        console.log('[MemoryColors] Starting', config);
        
        // Refresh colors based on current config
        COLORS = getColors();
        
        gridSize = (config && config.gridSize) ? config.gridSize : 6;
        timeLimit = (config && config.memorizeTime) ? config.memorizeTime : 5000;
        answerTime = (config && config.answerTime) ? config.answerTime : 10000;
        rounds = (config && config.rounds) ? config.rounds : 3;
        
        currentRound = 0;
        score = 0;
        active = true;
        
        // Reset UI state
        $('#mc-score').text('0');
        $('#mc-round').text('1 / ' + rounds);
        $('#mc-question').hide().empty();
        $('#mc-answer-section').hide();
        $('#mc-answer-input').val('').removeClass('correct incorrect').prop('disabled', false);
        $('#mc-submit-btn').prop('disabled', false);
        $('#mc-instruction').show();
        $('.mc-result').remove();
        
        $('#memory-colors-container').addClass('active').css('display', 'flex');
        
        // Bind submit button click
        $('#mc-submit-btn').off('click').on('click', function() {
            submitAnswer();
        });
        
        // Bind enter key on input
        $('#mc-answer-input').off('keypress').on('keypress', function(e) {
            if (e.which === 13) { // Enter key
                submitAnswer();
            }
        });
        
        nextRound();
    }

    function endGame(success) {
        if (!active) return;
        console.log('[MemoryColors] End:', success, 'Score:', score);
        
        active = false;
        
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        
        if (typeof playSoundSafe === 'function') {
            playSoundSafe(success ? 'sound-success' : 'sound-failure');
        }
        
        var cls = success ? 'success' : 'failure';
        var txt = success ? 'PASSED! ' + score + '/' + rounds : 'FAILED! ' + score + '/' + rounds;
        var $result = $('<div class="mc-result ' + cls + '">' + txt + '</div>');
        $('.memory-colors-display').append($result);
        
        setTimeout(function() {
            $('#memory-colors-container').removeClass('active').fadeOut(300, function() {
                $('.mc-result').remove();
                $('#memory-colors-grid').empty();
                $('#mc-answer-input').val('');
            });
            $.post('https://' + GetParentResourceName() + '/memoryColorsResult', JSON.stringify({
                success: success,
                score: score,
                rounds: rounds
            }));
        }, 1500);
    }

    function closeGame() {
        console.log('[MemoryColors] Close');
        active = false;
        
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        
        $('#mc-submit-btn').off('click');
        $('#mc-answer-input').off('keypress');
        $('#memory-colors-container').removeClass('active').hide();
        $('#memory-colors-grid').empty();
        $('#mc-answer-input').val('').removeClass('correct incorrect');
        $('.mc-result').remove();
        
        $.post('https://' + GetParentResourceName() + '/memoryColorsClose', JSON.stringify({}));
    }

    return {
        start: startGame,
        stop: endGame,
        close: closeGame
    };
})();

window.memoryColorsFunctions = MemoryColors;
window.closeMemoryColorsGame = MemoryColors.close;

console.log('[MemoryColors] Loaded');
