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

const numberedSequenceGameState = {
    config: {
        gridSize: 4,
        sequenceLength: 6,
        rounds: 3,
        showTime: 4000,
        guessTime: 10000,
        maxWrongPresses: 3
    },
    currentRound: 0,
    wrongPresses: 0,
    gameStarted: false,
    gameActive: false,
    showingPattern: false,
    numberedSquares: [],
    playerSequence: [],
    currentExpectedNumber: 1,
    timerInterval: null,
    showTimer: null,
    guessTimer: null
};

function startNumberedSequenceGame(config = {}) {
    if (typeof $ === 'undefined') {
        console.error('jQuery is not available!');
        return;
    }
    
    if ($('#numbered-sequence-container').length === 0) {
        console.error('Numbered sequence container not found!');
        return;
    }
    
    if (numberedSequenceGameState.timerInterval) {
        clearInterval(numberedSequenceGameState.timerInterval);
        numberedSequenceGameState.timerInterval = null;
    }
    if (numberedSequenceGameState.showTimer) {
        clearTimeout(numberedSequenceGameState.showTimer);
        numberedSequenceGameState.showTimer = null;
    }
    if (numberedSequenceGameState.guessTimer) {
        clearTimeout(numberedSequenceGameState.guessTimer);
        numberedSequenceGameState.guessTimer = null;
    }
    
    numberedSequenceGameState.config = { ...numberedSequenceGameState.config, ...config };
    numberedSequenceGameState.currentRound = 0;
    numberedSequenceGameState.wrongPresses = 0;
    numberedSequenceGameState.gameStarted = false;
    numberedSequenceGameState.gameActive = false;
    numberedSequenceGameState.showingPattern = false;
    numberedSequenceGameState.numberedSquares = [];
    numberedSequenceGameState.playerSequence = [];
    numberedSequenceGameState.currentExpectedNumber = 1;
    
    const container = $('#numbered-sequence-container');
    container.removeClass('active').addClass('active');
    container.css('display', 'flex');
    container.show();
    
    $('.numbered-sequence-grid').hide();
    $('.numbered-sequence-splash').show();
    
    updateNumberedSequenceUI();
    
    setTimeout(() => {
        $('.numbered-sequence-splash').fadeOut(400, () => {
            initializeNumberedSequenceGrid();
            $('.numbered-sequence-grid').fadeIn(400, () => {
                startNumberedSequenceRound();
            });
        });
    }, 3000);
}

function updateNumberedSequenceUI() {
    $('#numbered-sequence-round-current').text(numberedSequenceGameState.currentRound + 1);
    $('#numbered-sequence-round-total').text(numberedSequenceGameState.config.rounds);
    $('#numbered-sequence-message').text(`Round ${numberedSequenceGameState.currentRound + 1} - Wrong presses this round: ${numberedSequenceGameState.wrongPresses}/${numberedSequenceGameState.config.maxWrongPresses}`);
}

function initializeNumberedSequenceGrid() {
    const gridContainer = $('.numbered-sequence-grid');
    gridContainer.empty();
    
    const gridSize = numberedSequenceGameState.config.gridSize;
    gridContainer.css({
        'display': 'grid',
        'grid-template-columns': `repeat(${gridSize}, 1fr)`,
        'grid-template-rows': `repeat(${gridSize}, 1fr)`,
        'gap': '8px',
        'width': '400px',
        'height': '400px',
        'margin': '0 auto'
    });
    
    for (let i = 0; i < gridSize * gridSize; i++) {
        const square = $('<div>')
            .addClass('numbered-sequence-square')
            .attr('data-index', i)
            .on('click', handleNumberedSequenceSquareClick);
        
        gridContainer.append(square);
    }
    
    numberedSequenceGameState.gameStarted = true;
}

function startNumberedSequenceRound() {
    if (!numberedSequenceGameState.gameStarted) {
        return;
    }
    
    numberedSequenceGameState.showingPattern = true;
    numberedSequenceGameState.gameActive = false;
    numberedSequenceGameState.playerSequence = [];
    numberedSequenceGameState.currentExpectedNumber = 1;
    numberedSequenceGameState.wrongPresses = 0;
    
    $('.numbered-sequence-square').removeClass('lit selected correct wrong').text('');
    
    generateNumberedSequence();
    
    displayNumberedPattern();
    
    updateNumberedSequenceUI();
    $('#numbered-sequence-message').text('Memorize the numbered sequence');
    
    let remainingTime = numberedSequenceGameState.config.showTime;
    updateNumberedSequenceTimer(remainingTime);
    
    numberedSequenceGameState.showTimer = setTimeout(() => {
        hideNumbersStartGame();
    }, numberedSequenceGameState.config.showTime);
    
    numberedSequenceGameState.timerInterval = setInterval(() => {
        remainingTime -= 100;
        
        if (remainingTime < 0) {
            remainingTime = 0;
        }
        
        updateNumberedSequenceTimer(remainingTime);
        
        if (remainingTime <= 0) {
            clearInterval(numberedSequenceGameState.timerInterval);
            numberedSequenceGameState.timerInterval = null;
        }
    }, 100);
}

function restartCurrentRound() {
    if (!numberedSequenceGameState.gameStarted) {
        return;
    }
    
    numberedSequenceGameState.showingPattern = true;
    numberedSequenceGameState.gameActive = false;
    numberedSequenceGameState.playerSequence = [];
    numberedSequenceGameState.currentExpectedNumber = 1;
    
    $('.numbered-sequence-square').removeClass('lit selected correct wrong').text('');
    
    generateNumberedSequence();
    
    displayNumberedPattern();
    
    updateNumberedSequenceUI();
    $('#numbered-sequence-message').text('Memorize the numbered sequence');
    
    let remainingTime = numberedSequenceGameState.config.showTime;
    updateNumberedSequenceTimer(remainingTime);
    
    numberedSequenceGameState.showTimer = setTimeout(() => {
        hideNumbersStartGame();
    }, numberedSequenceGameState.config.showTime);
    
    numberedSequenceGameState.timerInterval = setInterval(() => {
        remainingTime -= 100;
        
        if (remainingTime < 0) {
            remainingTime = 0;
        }
        
        updateNumberedSequenceTimer(remainingTime);
        
        if (remainingTime <= 0) {
            clearInterval(numberedSequenceGameState.timerInterval);
            numberedSequenceGameState.timerInterval = null;
        }
    }, 100);
}

function generateNumberedSequence() {
    const totalSquares = numberedSequenceGameState.config.gridSize * numberedSequenceGameState.config.gridSize;
    const sequenceLength = Math.min(numberedSequenceGameState.config.sequenceLength, totalSquares);
    
    numberedSequenceGameState.numberedSquares = [];
    
    const availableIndices = Array.from({length: totalSquares}, (_, i) => i);
    
    for (let i = 1; i <= sequenceLength; i++) {
        const randomIndex = Math.floor(Math.random() * availableIndices.length);
        const squareIndex = availableIndices.splice(randomIndex, 1)[0];
        
        numberedSequenceGameState.numberedSquares.push({
            index: squareIndex,
            number: i
        });
    }
}

function displayNumberedPattern() {
    numberedSequenceGameState.numberedSquares.forEach(item => {
        const square = $(`.numbered-sequence-square[data-index="${item.index}"]`);
        square.addClass('lit').text(item.number);
    });
}

function updateNumberedSequenceTimer(timeMs) {
    const safeTimeMs = Math.max(0, timeMs);
    const progress = Math.max(0, safeTimeMs / numberedSequenceGameState.config.showTime) * 100;
    $('.numbered-sequence-timer-progress').css('width', `${progress}%`);
    $('#numbered-sequence-timer').text((safeTimeMs / 1000).toFixed(1));
}

function hideNumbersStartGame() {
    numberedSequenceGameState.showingPattern = false;
    numberedSequenceGameState.gameActive = true;
    
    $('.numbered-sequence-square').text('');
    
    $('#numbered-sequence-message').text(`Click the squares in numerical order (1-${numberedSequenceGameState.config.sequenceLength})`);
    
    if (numberedSequenceGameState.timerInterval) {
        clearInterval(numberedSequenceGameState.timerInterval);
        numberedSequenceGameState.timerInterval = null;
    }
    
    $('.numbered-sequence-timer-progress').css('width', '0%');
    $('#numbered-sequence-timer').text('0.0');
    
    startGuessTimer();
}

function startGuessTimer() {
    let remainingTime = numberedSequenceGameState.config.guessTime;
    updateNumberedSequenceTimer(remainingTime);
    
    numberedSequenceGameState.guessTimer = setTimeout(() => {
        if (numberedSequenceGameState.gameActive) {
            if (numberedSequenceGameState.timerInterval) {
                clearInterval(numberedSequenceGameState.timerInterval);
                numberedSequenceGameState.timerInterval = null;
            }
            
            numberedSequenceGameState.gameActive = false;
            numberedSequenceGameState.showingPattern = false;
            $('#numbered-sequence-message').text('Time\'s up! Game failed.');
            playNumberedSequenceSound('failure');
            setTimeout(() => {
                endNumberedSequenceGame(false);
            }, 1500);
        }
    }, numberedSequenceGameState.config.guessTime);
    
    numberedSequenceGameState.timerInterval = setInterval(() => {
        remainingTime -= 100;
        
        if (remainingTime < 0) {
            remainingTime = 0;
        }
        
        updateGuessTimer(remainingTime);
        
        if (remainingTime <= 0) {
            clearInterval(numberedSequenceGameState.timerInterval);
            numberedSequenceGameState.timerInterval = null;
        }
    }, 100);
}

function updateGuessTimer(timeMs) {
    const safeTimeMs = Math.max(0, timeMs);
    const progress = Math.max(0, safeTimeMs / numberedSequenceGameState.config.guessTime) * 100;
    $('.numbered-sequence-timer-progress').css('width', `${progress}%`);
    $('#numbered-sequence-timer').text((safeTimeMs / 1000).toFixed(1));
}

function handleNumberedSequenceSquareClick() {
    if (!numberedSequenceGameState.gameActive || numberedSequenceGameState.showingPattern) {
        return;
    }
    
    const squareIndex = parseInt($(this).attr('data-index'));
    
    const expectedSquare = numberedSequenceGameState.numberedSquares.find(
        item => item.number === numberedSequenceGameState.currentExpectedNumber
    );
    
    if (!expectedSquare) {
        console.error('No expected square found for number:', numberedSequenceGameState.currentExpectedNumber);
        return;
    }
    
    $(this).addClass('selected');
    
    if (squareIndex === expectedSquare.index) {
        playNumberedSequenceSound('click');
        $(this).addClass('correct');
        numberedSequenceGameState.playerSequence.push(squareIndex);
        numberedSequenceGameState.currentExpectedNumber++;
        
        if (numberedSequenceGameState.currentExpectedNumber > numberedSequenceGameState.config.sequenceLength) {
            if (numberedSequenceGameState.guessTimer) {
                clearTimeout(numberedSequenceGameState.guessTimer);
                numberedSequenceGameState.guessTimer = null;
            }
            if (numberedSequenceGameState.timerInterval) {
                clearInterval(numberedSequenceGameState.timerInterval);
                numberedSequenceGameState.timerInterval = null;
            }
            
            numberedSequenceGameState.currentRound++;
            numberedSequenceGameState.gameActive = false;
            
            $('#numbered-sequence-message').text('Sequence completed correctly!');
            
            if (numberedSequenceGameState.currentRound >= numberedSequenceGameState.config.rounds) {
                setTimeout(() => {
                    endNumberedSequenceGame(true);
                }, 1500);
            } else {
                setTimeout(() => {
                    startNumberedSequenceRound();
                }, 2000);
            }
        }
    } else {
        $(this).addClass('wrong');
        numberedSequenceGameState.wrongPresses++;
        
        playNumberedSequenceSound('penalty');
        
        $('#numbered-sequence-message').text(`Wrong square! Expected number ${numberedSequenceGameState.currentExpectedNumber} (${numberedSequenceGameState.wrongPresses}/${numberedSequenceGameState.config.maxWrongPresses})`);
        
        if (numberedSequenceGameState.wrongPresses >= numberedSequenceGameState.config.maxWrongPresses) {
            if (numberedSequenceGameState.guessTimer) {
                clearTimeout(numberedSequenceGameState.guessTimer);
                numberedSequenceGameState.guessTimer = null;
            }
            if (numberedSequenceGameState.timerInterval) {
                clearInterval(numberedSequenceGameState.timerInterval);
                numberedSequenceGameState.timerInterval = null;
            }
            
            numberedSequenceGameState.gameActive = false;
            numberedSequenceGameState.showingPattern = false;
            $('#numbered-sequence-message').text('Too many wrong presses! Game failed.');
            playNumberedSequenceSound('failure');
            setTimeout(() => {
                endNumberedSequenceGame(false);
            }, 1500);
            return;
        }
        
        setTimeout(() => {
            if (!numberedSequenceGameState.gameStarted || 
                numberedSequenceGameState.wrongPresses >= numberedSequenceGameState.config.maxWrongPresses) {
                return;
            }
            
            if (numberedSequenceGameState.guessTimer) {
                clearTimeout(numberedSequenceGameState.guessTimer);
                numberedSequenceGameState.guessTimer = null;
            }
            if (numberedSequenceGameState.timerInterval) {
                clearInterval(numberedSequenceGameState.timerInterval);
                numberedSequenceGameState.timerInterval = null;
            }
            
            $('.numbered-sequence-square').removeClass('selected correct wrong');
            numberedSequenceGameState.playerSequence = [];
            numberedSequenceGameState.currentExpectedNumber = 1;
            numberedSequenceGameState.gameActive = false;
            
            setTimeout(() => {
                if (numberedSequenceGameState.gameStarted && 
                    numberedSequenceGameState.wrongPresses < numberedSequenceGameState.config.maxWrongPresses) {
                    restartCurrentRound();
                }
            }, 1000);
        }, 1500);
    }
}

function endNumberedSequenceGame(success) {
    if (!numberedSequenceGameState.gameStarted) {
        return;
    }
    
    numberedSequenceGameState.gameActive = false;
    numberedSequenceGameState.showingPattern = false;
    numberedSequenceGameState.gameStarted = false;
    
    if (numberedSequenceGameState.timerInterval) {
        clearInterval(numberedSequenceGameState.timerInterval);
        numberedSequenceGameState.timerInterval = null;
    }
    if (numberedSequenceGameState.showTimer) {
        clearTimeout(numberedSequenceGameState.showTimer);
        numberedSequenceGameState.showTimer = null;
    }
    if (numberedSequenceGameState.guessTimer) {
        clearTimeout(numberedSequenceGameState.guessTimer);
        numberedSequenceGameState.guessTimer = null;
    }
    
    if (success) {
        $('#numbered-sequence-message').text('Numbered sequence test completed successfully!');
        playNumberedSequenceSound('success');
    } else {
        const currentMessage = $('#numbered-sequence-message').text();
        if (!currentMessage.includes('failed') && !currentMessage.includes('Time\'s up')) {
            $('#numbered-sequence-message').text('Numbered sequence test failed!');
            playNumberedSequenceSound('failure');
        }
    }
    
    setTimeout(() => {
        const container = $('#numbered-sequence-container');
        container.removeClass('active').hide();
        if (window.invokeNative) {
            fetch(`https://${GetParentResourceName()}/numberedSequenceResult`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json; charset=UTF-8',
                },
                body: JSON.stringify({
                    success: success
                })
            });
        } else {
            console.log('Numbered sequence game result:', success);
        }
    }, 2000);
}

function playNumberedSequenceSound(type) {
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
            case 'penalty':
                audio = document.getElementById('sound-penalty');
                break;
            default:
                audio = document.getElementById('sound-buttonPress');
        }        
        if (audio) {
            audio.currentTime = 0;
            audio.play().catch(() => {});
        }
    } catch (e) {
        
    }
}

window.startNumberedSequenceGame = startNumberedSequenceGame;
