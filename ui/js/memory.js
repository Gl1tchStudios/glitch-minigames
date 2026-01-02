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

const memoryGameState = {
    config: {
        gridSize: 5,
        squareCount: 8,
        rounds: 3,
        showTime: 3000,
        maxWrongPresses: 3
    },
    currentRound: 0,
    wrongPresses: 0,
    gameStarted: false,
    gameActive: false,
    showingPattern: false,
    selectedSquares: [],
    playerSelected: [],
    timerInterval: null,
    showTimer: null
};

function startMemoryGame(config = {}) {
    console.log('Initializing Memory Game');
    
    if (memoryGameState.timerInterval) {
        clearInterval(memoryGameState.timerInterval);
        memoryGameState.timerInterval = null;
    }
    if (memoryGameState.showTimer) {
        clearTimeout(memoryGameState.showTimer);
        memoryGameState.showTimer = null;
    }
    
    memoryGameState.config = { ...memoryGameState.config, ...config };
    memoryGameState.currentRound = 0;
    memoryGameState.wrongPresses = 0;
    memoryGameState.gameStarted = false;
    memoryGameState.gameActive = false;
    memoryGameState.showingPattern = false;
    memoryGameState.selectedSquares = [];
    memoryGameState.playerSelected = [];
    
    $('#memory-container').show();
    
    $('.memory-grid').hide();
    $('.memory-splash').show();
    
    updateMemoryUI();
    
    console.log('Splash screen shown, waiting 3 seconds...');
    
    setTimeout(() => {
        console.log('Starting memory game...');
        $('.memory-splash').fadeOut(400, () => {
            initializeMemoryGrid();
            $('.memory-grid').fadeIn(400, () => {
                startMemoryRound();
            });
        });
    }, 3000);
}

function updateMemoryUI() {
    $('#memory-round-current').text(memoryGameState.currentRound + 1);
    $('#memory-round-total').text(memoryGameState.config.rounds);
    $('#memory-message').text(`Memorize the pattern (Wrong presses: ${memoryGameState.wrongPresses}/${memoryGameState.config.maxWrongPresses})`);
}

function initializeMemoryGrid() {
    console.log('Initializing memory grid');
    
    const gridContainer = $('.memory-grid');
    gridContainer.empty();
    
    // grid size
    const gridSize = memoryGameState.config.gridSize;
    gridContainer.css({
        'display': 'grid',
        'grid-template-columns': `repeat(${gridSize}, 1fr)`,
        'grid-template-rows': `repeat(${gridSize}, 1fr)`,
        'gap': '8px',
        'width': '400px',
        'height': '400px',
        'margin': '0 auto'
    });
    
    // grid squares
    for (let i = 0; i < gridSize * gridSize; i++) {
        const square = $('<div>')
            .addClass('memory-square')
            .attr('data-index', i)
            .on('click', handleMemorySquareClick);
        
        gridContainer.append(square);
    }
    
    memoryGameState.gameStarted = true;
}

function startMemoryRound() {
    console.log(`Starting round ${memoryGameState.currentRound + 1}`);
    
    memoryGameState.showingPattern = true;
    memoryGameState.gameActive = false;
    memoryGameState.playerSelected = [];
    
    // previous selections
    $('.memory-square').removeClass('lit player-selected correct wrong');
    
    // random squares to light up
    const totalSquares = memoryGameState.config.gridSize * memoryGameState.config.gridSize;
    const squareCount = Math.min(memoryGameState.config.squareCount, totalSquares);
    
    memoryGameState.selectedSquares = [];
    while (memoryGameState.selectedSquares.length < squareCount) {
        const randomIndex = Math.floor(Math.random() * totalSquares);
        if (!memoryGameState.selectedSquares.includes(randomIndex)) {
            memoryGameState.selectedSquares.push(randomIndex);
        }
    }
    
    console.log('Selected squares:', memoryGameState.selectedSquares);
    
    // pattern
    memoryGameState.selectedSquares.forEach(index => {
        $(`.memory-square[data-index="${index}"]`).addClass('lit');
    });
      $('#memory-message').text(`Memorize the pattern (Wrong presses: ${memoryGameState.wrongPresses}/${memoryGameState.config.maxWrongPresses})`);
    
    // show timer
    let remainingTime = memoryGameState.config.showTime;
    updateMemoryTimer(remainingTime);
    
    memoryGameState.showTimer = setTimeout(() => {
        hidePattern();
    }, memoryGameState.config.showTime);
    
    // timer display
    memoryGameState.timerInterval = setInterval(() => {
        remainingTime -= 100;
        updateMemoryTimer(remainingTime);
        
        if (remainingTime <= 0) {
            clearInterval(memoryGameState.timerInterval);
            memoryGameState.timerInterval = null;
        }
    }, 100);
}

function updateMemoryTimer(timeMs) {
    const progress = Math.max(0, timeMs / memoryGameState.config.showTime) * 100;
    $('.memory-timer-progress').css('width', `${progress}%`);
    $('#memory-timer').text((timeMs / 1000).toFixed(1));
}

function hidePattern() {
    console.log('Hiding pattern, waiting for player input');
    
    memoryGameState.showingPattern = false;
    memoryGameState.gameActive = true;
    $('.memory-square').removeClass('lit');
    
    $('#memory-message').text(`Click the squares that were lit up (Wrong presses: ${memoryGameState.wrongPresses}/${memoryGameState.config.maxWrongPresses})`);
    
    // clear timer
    if (memoryGameState.timerInterval) {
        clearInterval(memoryGameState.timerInterval);
        memoryGameState.timerInterval = null;
    }
    
    $('.memory-timer-progress').css('width', '0%');
    $('#memory-timer').text('0.0');
}

function handleMemorySquareClick() {
    if (!memoryGameState.gameActive || memoryGameState.showingPattern) {
        return;
    }
    
    const squareIndex = parseInt($(this).attr('data-index'));
    console.log('Square clicked:', squareIndex);
    
    if (memoryGameState.playerSelected.includes(squareIndex)) {
        return;
    }
    
    memoryGameState.playerSelected.push(squareIndex);
    $(this).addClass('player-selected');
    
    playMemorySound('click');
    if (memoryGameState.selectedSquares.includes(squareIndex)) {
        $(this).addClass('correct');
        console.log('Correct square selected');
    } else {
        $(this).addClass('wrong');
        console.log('Wrong square selected');
        memoryGameState.wrongPresses++;
        
        $('#memory-message').text(`Wrong press! (${memoryGameState.wrongPresses}/${memoryGameState.config.maxWrongPresses})`);
        
        if (memoryGameState.wrongPresses >= memoryGameState.config.maxWrongPresses) {
            endMemoryGame(false);
            return;
        }
        
        setTimeout(() => {
            $(this).removeClass('player-selected wrong');
            memoryGameState.playerSelected.pop();
            $('#memory-message').text(`Click the squares that were lit up (Wrong presses: ${memoryGameState.wrongPresses}/${memoryGameState.config.maxWrongPresses})`);
        }, 1000);
        
        return;
    }
    
    if (memoryGameState.playerSelected.length === memoryGameState.selectedSquares.length) {
        const allCorrect = memoryGameState.selectedSquares.every(square => 
            memoryGameState.playerSelected.includes(square)
        );
        
        if (allCorrect) {
            console.log('Round completed successfully');
            memoryGameState.currentRound++;
            
            if (memoryGameState.currentRound >= memoryGameState.config.rounds) {
                endMemoryGame(true);
            } else {
                setTimeout(() => {
                    updateMemoryUI();
                    startMemoryRound();
                }, 1500);
            }
        } else {
            endMemoryGame(false);
        }
    }
}

function endMemoryGame(success) {
    console.log('Memory game ended. Success:', success);
    
    memoryGameState.gameActive = false;
    memoryGameState.showingPattern = false;
    
    // timers
    if (memoryGameState.timerInterval) {
        clearInterval(memoryGameState.timerInterval);
        memoryGameState.timerInterval = null;
    }
    if (memoryGameState.showTimer) {
        clearTimeout(memoryGameState.showTimer);
        memoryGameState.showTimer = null;
    }
    
    if (success) {
        $('#memory-message').text('Memory test completed successfully!');
        playMemorySound('success');
    } else {
        $('#memory-message').text('Memory test failed!');
        playMemorySound('failure');
    }
    
    setTimeout(() => {
        $('#memory-container').hide();
        if (window.invokeNative) {
            fetch(`https://${GetParentResourceName()}/memoryResult`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json; charset=UTF-8',
                },
                body: JSON.stringify({
                    success: success
                })
            });
        } else {
            console.log('Memory game result:', success);
        }
    }, 2000);
}

function playMemorySound(type) {
    try {
        let audio;
        switch (type) {
            case 'click':
                audio = document.getElementById('sound-click');
                break;
            case 'success':
                audio = document.getElementById('sound-success');
                break;
            case 'failure':
                audio = document.getElementById('sound-failure');
                break;
            default:
                audio = document.getElementById('sound-buttonPress');
        }
        
        if (audio) {
            audio.currentTime = 0;
            audio.play().catch(e => console.log('Audio play failed:', e));
        }
    } catch (e) {
        console.log('Error playing sound:', e);
    }
}

window.addEventListener('message', function(event) {
    if (event.data.action === 'startMemory') {
        startMemoryGame(event.data.config);
    } else if (event.data.action === 'endMemory') {
        endMemoryGame(false);
    }
});
