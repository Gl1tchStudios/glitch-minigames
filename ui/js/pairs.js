// Pairs Memory Minigame
var PairsGame = (function() {
    var active = false;
    var grid = [];
    var gridSize = 4;
    var timeLimit = 0; // 0 = infinite
    var maxAttempts = 0; // 0 = infinite
    var timeRemaining = 0;
    var attempts = 0;
    var matchedPairs = 0;
    var totalPairs = 0;
    var timerInterval = null;
    var firstCard = null;
    var secondCard = null;
    var canClick = true;

    // icons for pairs
    var ICONS = [
        // Lock icons
        '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 1C8.676 1 6 3.676 6 7v2H4v14h16V9h-2V7c0-3.324-2.676-6-6-6zm0 2c2.276 0 4 1.724 4 4v2H8V7c0-2.276 1.724-4 4-4zm0 10c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2z"/></svg>',
        // Key
        '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 14c1.66 0 3-1.34 3-3S8.66 8 7 8s-3 1.34-3 3 1.34 3 3 3zm0-4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm14-2l-4.18 4.18A3.01 3.01 0 0 1 17 14c0 1.66-1.34 3-3 3s-3-1.34-3-3c0-.34.06-.67.17-.97L9 14.83l-1.59-1.59L6 14.83 4.41 13.24l-1.59 1.59L1.24 13.24 7 7.47l1.41 1.41L10 7.29l4.54-4.54c.39-.39 1.02-.39 1.41 0l3.54 3.54c.39.39.39 1.02 0 1.41z"/></svg>',
        // Shield
        '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg>',
        // Star
        '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>',
        // Heart
        '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>',
        // Bolt/Lightning
        '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11 21h-1l1-7H7.5c-.58 0-.57-.32-.38-.66.19-.34.05-.08.07-.12C8.48 10.94 10.42 7.54 13 3h1l-1 7h3.5c.49 0 .56.33.47.51l-.07.15C12.96 17.55 11 21 11 21z"/></svg>',
        // Gear/Cog
        '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>',
        // Wifi
        '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z"/></svg>',
        // Database
        '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3C7.58 3 4 4.79 4 7s3.58 4 8 4 8-1.79 8-4-3.58-4-8-4zM4 9v3c0 2.21 3.58 4 8 4s8-1.79 8-4V9c0 2.21-3.58 4-8 4s-8-1.79-8-4zm0 5v3c0 2.21 3.58 4 8 4s8-1.79 8-4v-3c0 2.21-3.58 4-8 4s-8-1.79-8-4z"/></svg>',
        // CPU/Chip
        '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h12v2h-2v2h2v2h-2v2h2v2h-2v2h2v2H6v-2h2v-2H6v-2h2v-2H6V8h2V6H6V4zm3 4v8h6V8H9zm1 1h4v6h-4V9z"/></svg>',
        // Bug
        '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 12h-4v-2h4v2zm0 4h-4v-2h4v2zm6-3.82c.6-.34 1-.96 1-1.68V9c0-1.1-.9-2-2-2h-1.18C17.14 5.77 15.72 5 14 5h-4c-1.72 0-3.14.77-3.82 2H5c-1.1 0-2 .9-2 2v1.5c0 .72.4 1.34 1 1.68V14c0 1.1.9 2 2 2h1v4h10v-4h1c1.1 0 2-.9 2-2v-1.82zM17 14H7v-4h10v4z"/></svg>',
        // Terminal
        '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V8h16v10zm-10-7l-4 4h3v2h2v-2h3l-4-4z"/></svg>',
        // Code
        '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/></svg>',
        // Cloud
        '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/></svg>',
        // Lock Open
        '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 1C8.676 1 6 3.676 6 7h2c0-2.276 1.724-4 4-4s4 1.724 4 4v2H4v14h16V9h-2V7c0-3.324-2.676-6-6-6zm0 12c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2z"/></svg>',
        // Eye
        '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>'
    ];

    function shuffle(array) {
        var currentIndex = array.length, randomIndex;
        while (currentIndex !== 0) {
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex--;
            var temp = array[currentIndex];
            array[currentIndex] = array[randomIndex];
            array[randomIndex] = temp;
        }
        return array;
    }

    function generateGrid() {
        var totalCells = gridSize * gridSize;
        totalPairs = Math.floor(totalCells / 2);
        
        var selectedIcons = shuffle(ICONS.slice()).slice(0, totalPairs);
        
        var cards = [];
        for (var i = 0; i < totalPairs; i++) {
            cards.push({ id: i, icon: selectedIcons[i] });
            cards.push({ id: i, icon: selectedIcons[i] });
        }
        
        if (totalCells % 2 === 1) {
            cards.push({ id: -1, icon: '', isExtra: true });
        }
        
        cards = shuffle(cards);
        
        grid = [];
        var index = 0;
        for (var r = 0; r < gridSize; r++) {
            grid[r] = [];
            for (var c = 0; c < gridSize; c++) {
                grid[r][c] = {
                    id: cards[index].id,
                    icon: cards[index].icon,
                    revealed: cards[index].isExtra || false,
                    matched: cards[index].isExtra || false,
                    isExtra: cards[index].isExtra || false
                };
                index++;
            }
        }
    }

    function renderGrid() {
        var $grid = $('#pairs-grid');
        $grid.empty();
        
        for (var r = 0; r < gridSize; r++) {
            for (var c = 0; c < gridSize; c++) {
                var card = grid[r][c];
                var $cell = $('<div class="pairs-cell"></div>');
                $cell.attr('data-row', r);
                $cell.attr('data-col', c);
                
                if (card.isExtra) {
                    $cell.addClass('pairs-extra');
                }
                
                var $inner = $('<div class="pairs-card-inner"></div>');
                var $front = $('<div class="pairs-card-front"><span>?</span></div>');
                var $back = $('<div class="pairs-card-back">' + card.icon + '</div>');
                
                $inner.append($front).append($back);
                $cell.append($inner);
                
                if (card.revealed || card.matched) {
                    $cell.addClass('revealed');
                }
                if (card.matched) {
                    $cell.addClass('matched');
                }
                
                $grid.append($cell);
            }
        }
        
        $grid.css('grid-template-columns', 'repeat(' + gridSize + ', 1fr)');
    }

    function handleClick() {
        if (!active || !canClick) return;
        
        var $cell = $(this);
        var r = parseInt($cell.attr('data-row'));
        var c = parseInt($cell.attr('data-col'));
        var card = grid[r][c];
        
        if (card.revealed || card.matched || card.isExtra) return;
        
        card.revealed = true;
        $cell.addClass('revealed');
        
        if (typeof playSoundSafe === 'function') {
            playSoundSafe('sound-click');
        }
        
        if (firstCard === null) {
            firstCard = { row: r, col: c, card: card, $cell: $cell };
        } else {
            secondCard = { row: r, col: c, card: card, $cell: $cell };
            canClick = false;
            attempts++;
            updateAttempts();
            
            if (firstCard.card.id === secondCard.card.id) {
                firstCard.card.matched = true;
                secondCard.card.matched = true;
                firstCard.$cell.addClass('matched');
                secondCard.$cell.addClass('matched');
                
                if (typeof playSoundSafe === 'function') {
                    playSoundSafe('sound-success');
                }
                
                matchedPairs++;
                firstCard = null;
                secondCard = null;
                canClick = true;
                
                if (matchedPairs >= totalPairs) {
                    endGame(true);
                }
            } else {
                if (typeof playSoundSafe === 'function') {
                    playSoundSafe('sound-penalty');
                }
                
                setTimeout(function() {
                    firstCard.card.revealed = false;
                    secondCard.card.revealed = false;
                    firstCard.$cell.removeClass('revealed');
                    secondCard.$cell.removeClass('revealed');
                    firstCard = null;
                    secondCard = null;
                    canClick = true;
                    
                    if (maxAttempts > 0 && attempts >= maxAttempts) {
                        endGame(false);
                    }
                }, 800);
            }
        }
    }

    function updateTimer() {
        if (timeLimit <= 0) return;
        
        var pct = (timeRemaining / timeLimit) * 100;
        var sec = (timeRemaining / 1000).toFixed(1);
        
        $('.pairs-timer-progress').css('width', pct + '%');
        $('#pairs-timer').text(sec);
        
        if (pct < 25) {
            $('.pairs-timer-progress').addClass('danger');
        } else {
            $('.pairs-timer-progress').removeClass('danger');
        }
    }

    function updateAttempts() {
        if (maxAttempts > 0) {
            $('#pairs-attempts').text(attempts + ' / ' + maxAttempts);
        } else {
            $('#pairs-attempts').text(attempts);
        }
        $('#pairs-pairs').text(matchedPairs + ' / ' + totalPairs);
    }

    function startGame(config) {
        console.log('[Pairs] Starting game', config);
        
        gridSize = (config && config.gridSize) ? config.gridSize : 4;
        timeLimit = (config && config.timeLimit) ? config.timeLimit : 0;
        maxAttempts = (config && config.maxAttempts) ? config.maxAttempts : 0;
        
        timeRemaining = timeLimit;
        attempts = 0;
        matchedPairs = 0;
        firstCard = null;
        secondCard = null;
        canClick = true;
        active = true;
        
        generateGrid();
        renderGrid();
        updateAttempts();
        
        if (timeLimit > 0) {
            $('.pairs-timer-container').show();
            updateTimer();
            
            if (timerInterval) clearInterval(timerInterval);
            timerInterval = setInterval(function() {
                timeRemaining -= 100;
                updateTimer();
                if (timeRemaining <= 0) {
                    endGame(false);
                }
            }, 100);
        } else {
            $('.pairs-timer-container').hide();
        }
        
        if (maxAttempts > 0) {
            $('.pairs-attempts-info').show();
        } else {
            $('.pairs-attempts-info').show();
        }
        
        $('#pairs-container').addClass('active').css('display', 'flex');
        $('#pairs-grid').off('click', '.pairs-cell').on('click', '.pairs-cell', handleClick);
    }

    function endGame(success) {
        if (!active) return;
        console.log('[Pairs] End:', success);
        
        active = false;
        canClick = false;
        
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        
        $('#pairs-grid').off('click', '.pairs-cell');
        
        if (typeof playSoundSafe === 'function') {
            playSoundSafe(success ? 'sound-success' : 'sound-failure');
        }
        
        var cls = success ? 'success' : 'failure';
        var txt = success ? 'ALL PAIRS FOUND!' : (timeLimit > 0 && timeRemaining <= 0 ? 'TIME OUT!' : 'OUT OF ATTEMPTS!');
        var $result = $('<div class="pairs-result ' + cls + '">' + txt + '</div>');
        $('.pairs-display').append($result);
        
        setTimeout(function() {
            $('#pairs-container').removeClass('active').fadeOut(300, function() {
                $('.pairs-result').remove();
                $('#pairs-grid').empty();
            });
            $.post('https://' + GetParentResourceName() + '/pairsResult', JSON.stringify({ 
                success: success,
                attempts: attempts,
                matchedPairs: matchedPairs
            }));
        }, 1500);
    }

    function closeGame() {
        console.log('[Pairs] Close');
        active = false;
        canClick = false;
        
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        
        $('#pairs-grid').off('click', '.pairs-cell');
        $('#pairs-container').removeClass('active').hide();
        $('#pairs-grid').empty();
        $('.pairs-result').remove();
        
        $.post('https://' + GetParentResourceName() + '/pairsClose', JSON.stringify({}));
    }

    return {
        start: startGame,
        stop: endGame,
        close: closeGame
    };
})();

window.pairsFunctions = PairsGame;
window.closePairsGame = PairsGame.close;

console.log('[Pairs] Loaded');
