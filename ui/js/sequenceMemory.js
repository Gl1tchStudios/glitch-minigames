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

const sequenceMemoryGameState = {
    config: {
        gridSize: 4,
        rounds: 5,
        showTime: 1000,
        delayBetween: 300,
        maxWrongPresses: 3
    },
    currentRound: 0,
    wrongPresses: 0,
    gameStarted: false,
    gameActive: false,
    showingPattern: false,
    sequence: [],
    playerSequence: [],
    currentSequenceIndex: 0,
    timerInterval: null,
    showTimer: null
};

function startSequenceMemoryGame(config = {}) {
    console.log('Initializing Sequence Memory Game');
    
    if (sequenceMemoryGameState.timerInterval) {
        clearInterval(sequenceMemoryGameState.timerInterval);
        sequenceMemoryGameState.timerInterval = null;
    }
    if (sequenceMemoryGameState.showTimer) {
        clearTimeout(sequenceMemoryGameState.showTimer);
        sequenceMemoryGameState.showTimer = null;
    }
    
    sequenceMemoryGameState.config = { ...sequenceMemoryGameState.config, ...config };
    
    sequenceMemoryGameState.currentRound = 0;
    sequenceMemoryGameState.wrongPresses = 0;
    sequenceMemoryGameState.gameStarted = false;
    sequenceMemoryGameState.gameActive = false;
    sequenceMemoryGameState.showingPattern = false;
    sequenceMemoryGameState.sequence = [];
    sequenceMemoryGameState.playerSequence = [];
    sequenceMemoryGameState.currentSequenceIndex = 0;
    $('#sequence-memory-container').show();
    
    $('.sequence-memory-grid').hide();
    $('.sequence-memory-splash').show();
    
    updateSequenceMemoryUI();
    
    console.log('Splash screen shown, waiting 3 seconds...');
    
    setTimeout(() => {
        console.log('Starting sequence memory game...');
        $('.sequence-memory-splash').fadeOut(400, () => {
            initializeSequenceMemoryGrid();
            $('.sequence-memory-grid').fadeIn(400, () => {
                startSequenceMemoryRound();
            });
        });
    }, 3000);
}

function updateSequenceMemoryUI() {
    $('#sequence-memory-round-current').text(sequenceMemoryGameState.currentRound + 1);
    $('#sequence-memory-round-total').text(sequenceMemoryGameState.config.rounds);
    $('#sequence-memory-message').text(`Memorize the sequence (Wrong presses: ${sequenceMemoryGameState.wrongPresses}/${sequenceMemoryGameState.config.maxWrongPresses})`);
}

function initializeSequenceMemoryGrid() {
    console.log('Initializing sequence memory grid');
    
    const gridContainer = $('.sequence-memory-grid');
    gridContainer.empty();
    
    // grid size
    const gridSize = sequenceMemoryGameState.config.gridSize;
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
            .addClass('sequence-memory-square')
            .attr('data-index', i)
            .on('click', handleSequenceMemorySquareClick);
        
        gridContainer.append(square);
    }
    
    sequenceMemoryGameState.gameStarted = true;
}

function startSequenceMemoryRound() {
    console.log(`Starting sequence memory round ${sequenceMemoryGameState.currentRound + 1}`);
    
    sequenceMemoryGameState.showingPattern = true;
    sequenceMemoryGameState.gameActive = false;
    sequenceMemoryGameState.playerSequence = [];
    sequenceMemoryGameState.currentSequenceIndex = 0;
    
    // previous selections
    $('.sequence-memory-square').removeClass('lit selected correct wrong');
    
    const totalSquares = sequenceMemoryGameState.config.gridSize * sequenceMemoryGameState.config.gridSize;
    const sequenceLength = sequenceMemoryGameState.currentRound + 1;
    
    if (sequenceMemoryGameState.sequence.length < sequenceLength) {
        const randomIndex = Math.floor(Math.random() * totalSquares);
        sequenceMemoryGameState.sequence.push(randomIndex);
    }
    
    console.log('Current sequence:', sequenceMemoryGameState.sequence);
    
    updateSequenceMemoryUI();
    $('#sequence-memory-message').text('Watch the sequence');
    
    showSequencePattern();
}

function showSequencePattern() {
    console.log('Showing sequence pattern');
    
    let index = 0;
    
    function showNextSquare() {
        if (index >= sequenceMemoryGameState.sequence.length) {
            sequenceMemoryGameState.showingPattern = false;
            sequenceMemoryGameState.gameActive = true;
            $('#sequence-memory-message').text('Repeat the sequence');
            return;
        }
        
        const squareIndex = sequenceMemoryGameState.sequence[index];
        const square = $(`.sequence-memory-square[data-index="${squareIndex}"]`);
        square.addClass('lit');
        
        playSoundSafe('sound-click');
        
        setTimeout(() => {
            square.removeClass('lit');
            index++;
            setTimeout(showNextSquare, sequenceMemoryGameState.config.delayBetween);
        }, sequenceMemoryGameState.config.showTime);
    }
    
    showNextSquare();
}

function handleSequenceMemorySquareClick(event) {
    if (!sequenceMemoryGameState.gameActive || sequenceMemoryGameState.showingPattern) return;
    
    const clickedIndex = parseInt($(event.target).attr('data-index'));
    const expectedIndex = sequenceMemoryGameState.sequence[sequenceMemoryGameState.currentSequenceIndex];
    
    console.log('Player clicked:', clickedIndex, 'Expected:', expectedIndex);
    
    $(event.target).addClass('selected');
    
    if (clickedIndex === expectedIndex) {
        $(event.target).addClass('correct');
        sequenceMemoryGameState.playerSequence.push(clickedIndex);
        sequenceMemoryGameState.currentSequenceIndex++;
        playSoundSafe('sound-buttonPress');
        
        setTimeout(() => {
            $(event.target).removeClass('selected correct');
        }, 400);

        if (sequenceMemoryGameState.currentSequenceIndex >= sequenceMemoryGameState.sequence.length) {
            sequenceMemoryGameState.currentRound++;
            sequenceMemoryGameState.gameActive = false;
            
            playSoundSafe('sound-success');
            
            if (sequenceMemoryGameState.currentRound >= sequenceMemoryGameState.config.rounds) {
                setTimeout(() => {
                    endSequenceMemoryGame(true);
                }, 800);
            } else {
                setTimeout(() => {
                    startSequenceMemoryRound();
                }, 1500);
            }
        }    } else {

        $(event.target).addClass('wrong');
        sequenceMemoryGameState.wrongPresses++;
        playSoundSafe('sound-penalty');
        
        setTimeout(() => {
            $(event.target).removeClass('selected wrong');
        }, 800);
        
        updateSequenceMemoryUI();
        
        if (sequenceMemoryGameState.wrongPresses >= sequenceMemoryGameState.config.maxWrongPresses) {
            sequenceMemoryGameState.gameActive = false;
            setTimeout(() => {
                endSequenceMemoryGame(false);
            }, 1000);
        } else {
            sequenceMemoryGameState.gameActive = false;
            setTimeout(() => {
                startSequenceMemoryRound();
            }, 1500);
        }
    }
}

function endSequenceMemoryGame(success) {
    console.log('Sequence memory game ended:', success ? 'Success' : 'Failure');
      sequenceMemoryGameState.gameActive = false;
    sequenceMemoryGameState.gameStarted = false;
    
    playSoundSafe(success ? 'sound-success' : 'sound-failure');
    
    if (sequenceMemoryGameState.timerInterval) {
        clearInterval(sequenceMemoryGameState.timerInterval);
        sequenceMemoryGameState.timerInterval = null;
    }
    if (sequenceMemoryGameState.showTimer) {
        clearTimeout(sequenceMemoryGameState.showTimer);
        sequenceMemoryGameState.showTimer = null;
    }
    
    $.post(`https://${GetParentResourceName()}/sequenceMemoryResult`, JSON.stringify({ success }));

    $('#sequence-memory-container').hide();
}

window.addEventListener('message', (event) => {
    const data = event.data;
    
    if (data.type === 'startSequenceMemory') {
        startSequenceMemoryGame(data.config || {});
    } else if (data.type === 'closeSequenceMemory') {
        endSequenceMemoryGame(false);
    }
});

window.startSequenceMemoryGame = startSequenceMemoryGame;
