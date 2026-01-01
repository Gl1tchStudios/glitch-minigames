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

// Pipe Pressure Minigame
var PipePressure = (function() {
    var active = false;
    var grid = [];
    var gridSize = 6;
    var timeLimit = 30000;
    var timeRemaining = 0;
    var timerInterval = null;
    var startPos = { row: 0, col: 0 };
    var endPos = { row: 0, col: 0 };

    // pipe types: [top, right, bottom, left] connections
    var PIPES = {
        'V': [1, 0, 1, 0],  // vertical
        'H': [0, 1, 0, 1],  // horizontal
        'L1': [1, 1, 0, 0], // corner: top + right
        'L2': [0, 1, 1, 0], // corner: right + bottom
        'L3': [0, 0, 1, 1], // corner: bottom + left
        'L4': [1, 0, 0, 1], // corner: top + left
        'T1': [1, 1, 0, 1], // T: no bottom
        'T2': [1, 1, 1, 0], // T: no left
        'T3': [0, 1, 1, 1], // T: no top
        'T4': [1, 0, 1, 1], // T: no right
        'X': [1, 1, 1, 1]   // cross: all directions
    };

    // rotation order
    var ROTATIONS = {
        'V': 'H', 'H': 'V',
        'L1': 'L2', 'L2': 'L3', 'L3': 'L4', 'L4': 'L1',
        'T1': 'T2', 'T2': 'T3', 'T3': 'T4', 'T4': 'T1',
        'X': 'X'
    };

    var PIPE_KEYS = ['V', 'H', 'L1', 'L2', 'L3', 'L4', 'T1', 'T2', 'T3', 'T4', 'X'];

    function createPipeSVG(type, color) {
        var conn = PIPES[type];
        if (!conn) return '';
        
        var svg = '<svg viewBox="0 0 50 50" width="100%" height="100%">';
        var sw = 8;
        
        // top connection
        if (conn[0]) {
            svg += '<line x1="25" y1="0" x2="25" y2="25" stroke="' + color + '" stroke-width="' + sw + '" stroke-linecap="round"/>';
        }
        // right connection
        if (conn[1]) {
            svg += '<line x1="25" y1="25" x2="50" y2="25" stroke="' + color + '" stroke-width="' + sw + '" stroke-linecap="round"/>';
        }
        // bottom connection
        if (conn[2]) {
            svg += '<line x1="25" y1="25" x2="25" y2="50" stroke="' + color + '" stroke-width="' + sw + '" stroke-linecap="round"/>';
        }
        // left connection
        if (conn[3]) {
            svg += '<line x1="0" y1="25" x2="25" y2="25" stroke="' + color + '" stroke-width="' + sw + '" stroke-linecap="round"/>';
        }
        // center node
        svg += '<circle cx="25" cy="25" r="5" fill="' + color + '"/>';
        svg += '</svg>';
        
        return svg;
    }

    function canConnect(r1, c1, r2, c2) {
        if (r1 < 0 || r1 >= gridSize || c1 < 0 || c1 >= gridSize) return false;
        if (r2 < 0 || r2 >= gridSize || c2 < 0 || c2 >= gridSize) return false;
        
        var p1 = PIPES[grid[r1][c1]];
        var p2 = PIPES[grid[r2][c2]];
        if (!p1 || !p2) return false;
        
        if (r2 === r1 - 1) return p1[0] && p2[2]; // above
        if (r2 === r1 + 1) return p1[2] && p2[0]; // below
        if (c2 === c1 + 1) return p1[1] && p2[3]; // right
        if (c2 === c1 - 1) return p1[3] && p2[1]; // left
        return false;
    }

    function findConnectedWithDistance() {
        var visited = {};
        var distances = {};
        var queue = [[startPos.row, startPos.col, 0]];
        var key = startPos.row + ',' + startPos.col;
        visited[key] = true;
        distances[key] = 0;

        while (queue.length > 0) {
            var current = queue.shift();
            var r = current[0];
            var c = current[1];
            var dist = current[2];
            
            var neighbors = [
                [r - 1, c],
                [r + 1, c],
                [r, c - 1],
                [r, c + 1]
            ];
            
            for (var i = 0; i < neighbors.length; i++) {
                var nr = neighbors[i][0];
                var nc = neighbors[i][1];
                var nkey = nr + ',' + nc;
                
                if (!visited[nkey] && canConnect(r, c, nr, nc)) {
                    visited[nkey] = true;
                    distances[nkey] = dist + 1;
                    queue.push([nr, nc, dist + 1]);
                }
            }
        }
        return { visited: visited, distances: distances };
    }

    function findConnected() {
        return findConnectedWithDistance().visited;
    }

    function isWin() {
        var connected = findConnected();
        return connected[endPos.row + ',' + endPos.col] === true;
    }

    var previousConnected = {};
    
    function updateDisplay(animate) {
        var result = findConnectedWithDistance();
        var connected = result.visited;
        var distances = result.distances;
        
        var newlyConnected = {};
        for (var key in connected) {
            if (!previousConnected[key]) {
                newlyConnected[key] = distances[key];
            }
        }
        
        $('#pipe-grid').find('.pipe-cell').each(function() {
            var $cell = $(this);
            var r = parseInt($cell.attr('data-row'));
            var c = parseInt($cell.attr('data-col'));
            var key = r + ',' + c;
            var type = grid[r][c];
            var isConn = connected[key] === true;
            var isStart = (r === startPos.row && c === startPos.col);
            var isEnd = (r === endPos.row && c === endPos.col);
            var isNewlyConn = newlyConnected[key] !== undefined;
            
            var color = window.MinigameColors.textSecondary; // default gray
            if (isConn) color = window.MinigameColors.primary; // cyan when connected
            if (isStart) color = window.MinigameColors.success; // green for start
            if (isEnd && isConn) color = window.MinigameColors.primary; // cyan for end when reached
            
            if (animate && isNewlyConn && !isStart) {
                var delay = newlyConnected[key] * 50; // 50ms per distance step
                (function($c, t, col, conn) {
                    setTimeout(function() {
                        $c.find('.pipe-inner').html(createPipeSVG(t, col));
                        if (conn) {
                            $c.addClass('connected');
                            $c.addClass('pulse-connect');
                            setTimeout(function() {
                                $c.removeClass('pulse-connect');
                            }, 300);
                        }
                    }, delay);
                })($cell, type, color, isConn);
            } else {
                $cell.find('.pipe-inner').html(createPipeSVG(type, color));
                if (isConn) {
                    $cell.addClass('connected');
                } else {
                    $cell.removeClass('connected');
                }
            }
        });
        
        previousConnected = {};
        for (var k in connected) {
            previousConnected[k] = true;
        }
    }

    function generateGrid() {
        grid = [];
        startPos = { row: 0, col: 0 };
        
        do {
            endPos = {
                row: Math.floor(Math.random() * gridSize),
                col: Math.floor(Math.random() * gridSize)
            };
        } while (endPos.row + endPos.col < 3);
        
        for (var r = 0; r < gridSize; r++) {
            grid[r] = [];
            for (var c = 0; c < gridSize; c++) {
                var idx = Math.floor(Math.random() * PIPE_KEYS.length);
                grid[r][c] = PIPE_KEYS[idx];
            }
        }
    }

    function renderGrid() {
        var $grid = $('#pipe-grid');
        $grid.empty();
        
        for (var r = 0; r < gridSize; r++) {
            for (var c = 0; c < gridSize; c++) {
                var isStart = (r === startPos.row && c === startPos.col);
                var isEnd = (r === endPos.row && c === endPos.col);
                
                var $cell = $('<div class="pipe-cell"></div>');
                $cell.attr('data-row', r);
                $cell.attr('data-col', c);
                
                if (isStart) $cell.addClass('start-cell');
                if (isEnd) $cell.addClass('end-cell');
                
                var label = '';
                if (isStart) label = '<span class="pipe-label">START</span>';
                if (isEnd) label = '<span class="pipe-label">END</span>';
                
                $cell.html(label + '<div class="pipe-inner"></div>');
                $grid.append($cell);
            }
        }
        
        $grid.css('grid-template-columns', 'repeat(' + gridSize + ', 50px)');
        previousConnected = {};
        updateDisplay(false);
    }

    function handleClick() {
        if (!active) return;
        
        var $cell = $(this);
        var r = parseInt($cell.attr('data-row'));
        var c = parseInt($cell.attr('data-col'));
        
        if (r === endPos.row && c === endPos.col) return;
        
        grid[r][c] = ROTATIONS[grid[r][c]];
        
        if (typeof playSoundSafe === 'function') {
            playSoundSafe('sound-buttonPress');
        }
        
        updateDisplay(true);
        
        if (isWin()) {
            endGame(true);
        }
    }

    function updateTimer() {
        var pct = (timeRemaining / timeLimit) * 100;
        var sec = (timeRemaining / 1000).toFixed(1);
        
        $('.pipe-pressure-timer-progress').css('width', pct + '%');
        $('#pipe-pressure-timer').text(sec);
        
        if (pct < 25) {
            $('.pipe-pressure-timer-progress').addClass('danger');
        } else {
            $('.pipe-pressure-timer-progress').removeClass('danger');
        }
    }

    function startGame(config) {
        console.log('[PipePressure] Start', config);
        
        gridSize = (config && config.gridSize) ? config.gridSize : 6;
        timeLimit = (config && config.timeLimit) ? config.timeLimit : 30000;
        timeRemaining = timeLimit;
        active = true;
        
        generateGrid();
        renderGrid();
        updateTimer();
        
        $('#pipe-pressure-container').addClass('active').css('display', 'flex');
        
        $('#pipe-grid').off('click', '.pipe-cell').on('click', '.pipe-cell', handleClick);
        
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = setInterval(function() {
            timeRemaining -= 100;
            updateTimer();
            if (timeRemaining <= 0) {
                endGame(false);
            }
        }, 100);
    }

    function endGame(success) {
        if (!active) return;
        console.log('[PipePressure] End:', success);
        
        active = false;
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        
        $('#pipe-grid').off('click', '.pipe-cell');
        
        if (typeof playSoundSafe === 'function') {
            playSoundSafe(success ? 'sound-success' : 'sound-failure');
        }
        
        var cls = success ? 'success' : 'failure';
        var txt = success ? 'CONNECTED!' : 'TIME OUT!';
        var $result = $('<div class="pipe-result ' + cls + '">' + txt + '</div>');
        $('.pipe-pressure-display').append($result);
        
        setTimeout(function() {
            $('#pipe-pressure-container').removeClass('active').fadeOut(300, function() {
                $('.pipe-result').remove();
                $('#pipe-grid').empty();
            });
            $.post('https://' + GetParentResourceName() + '/pipePressureResult', JSON.stringify({ success: success }));
        }, 1500);
    }

    function closeGame() {
        console.log('[PipePressure] Close');
        active = false;
        
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        
        $('#pipe-grid').off('click', '.pipe-cell');
        $('#pipe-pressure-container').removeClass('active').hide();
        $('#pipe-grid').empty();
        $('.pipe-result').remove();
        
        $.post('https://' + GetParentResourceName() + '/pipePressureClose', JSON.stringify({}));
    }

    return {
        start: startGame,
        stop: endGame,
        close: closeGame
    };
})();

window.pipePressureFunctions = PipePressure;
window.closePipePressureGame = PipePressure.close;

console.log('[PipePressure] Loaded');