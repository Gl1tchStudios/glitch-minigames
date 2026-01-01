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

const verbalMemoryGameState = {
    config: {
        maxStrikes: 3,
        wordsToShow: 50,
        wordDuration: 5000 // 5 seconds per word by default
    },
    currentWordIndex: 0,
    strikes: 0,
    score: 0,
    gameStarted: false,
    gameActive: false,
    seenWords: [],
    currentWord: '',    isNewWord: false,
    wordTimer: null,
    countdownTimer: null,
    timeRemaining: 0,
    wordList: [
        'APPLE', 'HOUSE', 'WATER', 'LIGHT', 'PAPER', 'MUSIC', 'PHONE', 'MONEY',
        'CHAIR', 'TABLE', 'WORLD', 'NIGHT', 'BEACH', 'OCEAN', 'RIVER', 'MOUNT',
        'FIELD', 'STONE', 'PLANT', 'HEART', 'BRAIN', 'VOICE', 'SMILE', 'POWER',
        'DREAM', 'MAGIC', 'TRUTH', 'PEACE', 'STORM', 'CLOUD', 'SPACE', 'EARTH',
        'GLASS', 'METAL', 'BREAD', 'FRUIT', 'SWEET', 'SHARP', 'QUICK', 'HAPPY',
        'ANGRY', 'QUIET', 'ROUGH', 'SMOOTH', 'HEAVY', 'LIGHT', 'FRESH', 'CLEAN',
        'DIRTY', 'CLEAR', 'SOLID', 'EMPTY', 'SUNNY', 'WINDY', 'COLD', 'WARM',
        'TALL', 'SHORT', 'WIDE', 'THIN', 'ROUND', 'SQUARE', 'BRIGHT', 'DARK',
        'YOUNG', 'OLD', 'NEW', 'FAST', 'SLOW', 'SOFT', 'HARD', 'LOUD',
        'ROYAL', 'NOBLE', 'BRAVE', 'WISE', 'KIND', 'CRUEL', 'GENTLE', 'WILD',
        'CALM', 'BUSY', 'FREE', 'SAFE', 'LOST', 'FOUND', 'OPEN', 'SHUT',
        'FIRST', 'LAST', 'BEST', 'WORST', 'GREAT', 'SMALL', 'GIANT', 'TINY',
        'FRONT', 'BACK', 'LEFT', 'RIGHT', 'ABOVE', 'BELOW', 'NEAR', 'FAR',
        'GLITCH', 'OUTER', 'UPPER', 'LOWER', 'NORTH', 'SOUTH', 'EAST', 'WEST',
        'BOOK', 'PAGE', 'WORD', 'LINE', 'STORY', 'POEM', 'SONG', 'DANCE',
        'GAME', 'SPORT', 'RACE', 'PRIZE', 'GIFT', 'PARTY', 'FEAST', 'MEAL',
        'FOOD', 'DRINK', 'WINE', 'BEER', 'MILK', 'JUICE', 'SUGAR', 'SALT',
        'FIRE', 'SMOKE', 'FLAME', 'SPARK', 'TORCH', 'CANDLE', 'LAMP', 'BULB',
        'DOOR', 'WINDOW', 'WALL', 'FLOOR', 'ROOF', 'ROOM', 'HALL', 'YARD',
        'GARDEN', 'FLOWER', 'TREE', 'LEAF', 'BRANCH', 'ROOT', 'SEED', 'GRASS'
    ],
    shuffledWords: []
};

function startVerbalMemoryGame(config = {}) {
    console.log('Initializing Verbal Memory Game');
    verbalMemoryGameState.config = { ...verbalMemoryGameState.config, ...config };
    
    verbalMemoryGameState.currentWordIndex = 0;
    verbalMemoryGameState.strikes = 0;
    verbalMemoryGameState.score = 0;
    verbalMemoryGameState.gameStarted = false;
    verbalMemoryGameState.gameActive = false;
    verbalMemoryGameState.seenWords = [];
    verbalMemoryGameState.currentWord = '';
    
    if (verbalMemoryGameState.wordTimer) {
        clearTimeout(verbalMemoryGameState.wordTimer);
        verbalMemoryGameState.wordTimer = null;
    }
    
    verbalMemoryGameState.shuffledWords = [...verbalMemoryGameState.wordList].sort(() => Math.random() - 0.5);
    
    $('#hack-container, #sequence-container, #rhythm-container, #keymash-container, #var-hack-container, #memory-container, #sequence-memory-container').hide();
    
    $('#verbal-memory-container').show();
    
    $('.verbal-memory-game').hide();
    $('.verbal-memory-splash').show();
    
    updateVerbalMemoryUI();
      console.log('Splash screen shown, waiting 3 seconds...');
    
    setTimeout(() => {
        console.log('Starting verbal memory game...');
        $('.verbal-memory-splash').fadeOut(400, () => {
            $('.verbal-memory-game, .verbal-memory-top-section, .verbal-memory-bottom-section').css({
                'background': 'transparent',
                'background-color': 'transparent'
            });
            
            $('.verbal-memory-game').fadeIn(400, () => {
                $('#verbal-memory-container').css('background', `linear-gradient(135deg, var(--background-gradient-1) 0%, var(--background-gradient-2) 100%)`);
                $('.verbal-memory-word-display').css('background', 'var(--background-secondary)');
                $('.verbal-memory-top-section, .verbal-memory-bottom-section').css('background', 'transparent');verbalMemoryGameState.gameStarted = true;
                showNextWord();
            });
        });
    }, 3000);
}

function updateVerbalMemoryUI() {
    $('#verbal-memory-score').text(verbalMemoryGameState.score);
    $('#verbal-memory-strikes').text(verbalMemoryGameState.strikes);
    $('#verbal-memory-max-strikes').text(verbalMemoryGameState.config.maxStrikes);
    $('#verbal-memory-word-count').text(verbalMemoryGameState.currentWordIndex);
    $('#verbal-memory-message').text(
        verbalMemoryGameState.gameActive ? 
        "Click SEEN if you've seen this word before, or NEW if it's a new word" :
        "Preparing next word..."
    );
}

function startCountdownTimer() {
    verbalMemoryGameState.timeRemaining = verbalMemoryGameState.config.wordDuration;
    
    if (verbalMemoryGameState.countdownTimer) {
        clearInterval(verbalMemoryGameState.countdownTimer);
    }
    
    updateTimerDisplay();
    
    verbalMemoryGameState.countdownTimer = setInterval(() => {
        verbalMemoryGameState.timeRemaining -= 100;
        updateTimerDisplay();
        
        if (verbalMemoryGameState.timeRemaining <= 0) {
            clearInterval(verbalMemoryGameState.countdownTimer);
            verbalMemoryGameState.countdownTimer = null;
        }
    }, 100);
}

function stopCountdownTimer() {
    if (verbalMemoryGameState.countdownTimer) {
        clearInterval(verbalMemoryGameState.countdownTimer);
        verbalMemoryGameState.countdownTimer = null;
    }
}

function updateTimerDisplay() {
    const timeLeftSeconds = Math.max(0, verbalMemoryGameState.timeRemaining / 1000);
    const percentage = Math.max(0, (verbalMemoryGameState.timeRemaining / verbalMemoryGameState.config.wordDuration) * 100);
    
    $('#verbal-memory-time-left').text(timeLeftSeconds.toFixed(1));
    
    $('.verbal-memory-timer-progress').css('width', percentage + '%');
    
    const progressBar = $('.verbal-memory-timer-progress');
    progressBar.removeClass('warning danger');
    
    if (percentage <= 20) {
        progressBar.addClass('danger');
    } else if (percentage <= 50) {
        progressBar.addClass('warning');
    }
}

function showNextWord() {
    if (verbalMemoryGameState.currentWordIndex >= verbalMemoryGameState.config.wordsToShow) {
        endVerbalMemoryGame(true);
        return;
    }
    
    verbalMemoryGameState.gameActive = false;
    
    $('#verbal-memory-container').css('background', `linear-gradient(135deg, var(--background-gradient-1) 0%, var(--background-gradient-2) 100%)`);
    $('.verbal-memory-word-display').css({
        'background': 'var(--background-secondary)',
        'border': 'none',
        'border-radius': '0',
        'width': '100%',
        'height': '100%',
        'padding': '0',
        'margin': '0',
        'box-shadow': 'none'
    });
    
    $('.verbal-memory-game, .verbal-memory-top-section, .verbal-memory-bottom-section').css('background', 'transparent');
    $('.verbal-memory-btn').css({
        'border': 'none',
        'border-radius': '0',
        'width': '100%',
        'height': '100%',
        'padding': '0',
        'margin': '0',
        'outline': 'none',
        'box-shadow': 'none'
    });
    
    $('.verbal-memory-left-btn, .verbal-memory-right-btn').css({
        'border': 'none',
        'border-left': 'none',
        'border-right': 'none',
        'padding': '0',
        'margin': '0'
    });
    
    $('.seen-btn').css('background', `rgba(${window.MinigameColors.primaryRgba}, 0.4)`);
    $('.new-btn').css('background', `rgba(${window.MinigameColors.safeRgba}, 0.4)`);
    
    let word;
    let isNewWord;
    
    if (verbalMemoryGameState.seenWords.length === 0 || Math.random() < 0.7) {
        word = verbalMemoryGameState.shuffledWords[verbalMemoryGameState.currentWordIndex % verbalMemoryGameState.shuffledWords.length];
        isNewWord = true;
    } else {
        word = verbalMemoryGameState.seenWords[Math.floor(Math.random() * verbalMemoryGameState.seenWords.length)];
        isNewWord = false;
    }
    
    verbalMemoryGameState.currentWord = word;
    verbalMemoryGameState.isNewWord = isNewWord;
    
    console.log(`Showing word: ${word} (${isNewWord ? 'NEW' : 'SEEN'})`);
    
    $('#verbal-memory-current-word').text(word);
    $('.verbal-memory-btn').removeClass('correct wrong');
    
    verbalMemoryGameState.currentWordIndex++;
    updateVerbalMemoryUI();
    setTimeout(() => {
        verbalMemoryGameState.gameActive = true;
        $('#verbal-memory-message').text("Click SEEN if you've seen this word before, or NEW if it's a new word");
        
        if (verbalMemoryGameState.wordTimer) {
            clearTimeout(verbalMemoryGameState.wordTimer);
        }
        
        startCountdownTimer();
        
        verbalMemoryGameState.wordTimer = setTimeout(() => {
            if (verbalMemoryGameState.gameActive && verbalMemoryGameState.gameStarted) {
                console.log('Time expired - treating as wrong answer');
                handleTimeExpired();
            }
        }, verbalMemoryGameState.config.wordDuration);
    }, 500);
}

function handleTimeExpired() {
    if (!verbalMemoryGameState.gameActive || !verbalMemoryGameState.gameStarted) {
        return;
    }
    
    verbalMemoryGameState.gameActive = false;
    verbalMemoryGameState.wordTimer = null;
    
    stopCountdownTimer();
    
    console.log('Time expired for word:', verbalMemoryGameState.currentWord);
    
    verbalMemoryGameState.strikes++;
    
    $('.verbal-memory-btn').addClass('wrong');
    $('#verbal-memory-message').text("Time's up! Too slow...");
    
    playSoundSafe('sound-penalty');
    updateVerbalMemoryUI();
    
    if (verbalMemoryGameState.strikes >= verbalMemoryGameState.config.maxStrikes) {
        setTimeout(() => {
            endVerbalMemoryGame(false);
        }, 1000);
    } else {
        setTimeout(() => {
            $('.verbal-memory-btn').removeClass('wrong');
            showNextWord();
        }, 1500);
    }
}

function handleVerbalMemoryChoice(choice) {
    if (!verbalMemoryGameState.gameActive || !verbalMemoryGameState.gameStarted) {
        return;
    }
      verbalMemoryGameState.gameActive = false;
    
    if (verbalMemoryGameState.wordTimer) {
        clearTimeout(verbalMemoryGameState.wordTimer);
        verbalMemoryGameState.wordTimer = null;
    }
    
    stopCountdownTimer();
    
    const isCorrect = (choice === 'new' && verbalMemoryGameState.isNewWord) || 
                     (choice === 'seen' && !verbalMemoryGameState.isNewWord);
    
    console.log(`Choice: ${choice}, IsNewWord: ${verbalMemoryGameState.isNewWord}, Correct: ${isCorrect}`);
    
    const buttonClicked = choice === 'seen' ? $('#verbal-memory-seen-btn') : $('#verbal-memory-new-btn');
    
    if (isCorrect) {
        buttonClicked.addClass('correct');
        verbalMemoryGameState.score++;
        
        if (verbalMemoryGameState.isNewWord && !verbalMemoryGameState.seenWords.includes(verbalMemoryGameState.currentWord)) {
            verbalMemoryGameState.seenWords.push(verbalMemoryGameState.currentWord);
        }
        
        playSoundSafe('sound-success');
        
        setTimeout(() => {
            buttonClicked.removeClass('correct');
            showNextWord();
        }, 800);
        
    } else {
        buttonClicked.addClass('wrong');
        verbalMemoryGameState.strikes++;
        
        playSoundSafe('sound-penalty');
        
        updateVerbalMemoryUI();
        
        if (verbalMemoryGameState.strikes >= verbalMemoryGameState.config.maxStrikes) {
            setTimeout(() => {
                endVerbalMemoryGame(false);
            }, 1000);
        } else {
            setTimeout(() => {
                buttonClicked.removeClass('wrong');
                showNextWord();
            }, 1500);
        }
    }
}

function endVerbalMemoryGame(success) {
    console.log('Verbal memory game ended:', success ? 'Success' : 'Failure');
    
    verbalMemoryGameState.gameActive = false;
    verbalMemoryGameState.gameStarted = false;
    if (verbalMemoryGameState.wordTimer) {
        clearTimeout(verbalMemoryGameState.wordTimer);
        verbalMemoryGameState.wordTimer = null;
    }
    
    stopCountdownTimer();
    
    playSoundSafe(success ? 'sound-success' : 'sound-failure');
    
    if (success) {
        $('#verbal-memory-message').text(`Perfect! You completed all ${verbalMemoryGameState.config.wordsToShow} words!`);
    } else {
        $('#verbal-memory-message').text(`Game Over! Final Score: ${verbalMemoryGameState.score}`);
    }
    
    setTimeout(() => {
        $('body').css('background-color', 'transparent');
        $('#verbal-memory-container').hide();
        
        if (window.invokeNative) {
            fetch(`https://${GetParentResourceName()}/verbalMemoryResult`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json; charset=UTF-8',
                },
                body: JSON.stringify({
                    success: success,
                    score: verbalMemoryGameState.score,
                    strikes: verbalMemoryGameState.strikes
                })
            });
        } else {
            console.log('Verbal memory game result:', success, 'Score:', verbalMemoryGameState.score);
        }
    }, 2000);
}

$(document).ready(() => {
    $('#verbal-memory-seen-btn').on('click', () => {
        handleVerbalMemoryChoice('seen');
    });
    
    $('#verbal-memory-new-btn').on('click', () => {
        handleVerbalMemoryChoice('new');
    });
});

window.addEventListener('message', (event) => {
    const data = event.data;
    
    if (data.action === 'startVerbalMemory') {
        $('#hack-container, #sequence-container, #rhythm-container, #keymash-container, #var-hack-container, #memory-container, #sequence-memory-container').hide();
        
        cleanupOverlayElements();
        
        startVerbalMemoryGame(data.config || {});
    } else if (data.action === 'endVerbalMemory') {
        endVerbalMemoryGame(false);
    }
});

function cleanupOverlayElements() {
    $('body, html').css({
        'background-color': 'transparent',
        'background': 'transparent'
    });
    
    $('body > div:not(.game-container):not(.audio-elements)').each(function() {
        const $this = $(this);
        if ($this.css('display') !== 'none' && 
            $this.css('background-color') && 
            $this.css('background-color').includes('rgba')) {
            console.log('Removing potential overlay element:', $this);
            $this.remove();
        }
    });
    
    $('#verbal-memory-container').css({
        'position': 'fixed',
        'top': '50%',
        'left': '50%',
        'transform': 'translate(-50%, -50%)',
        'z-index': '9999',
        'isolation': 'isolate',
        'backdrop-filter': 'none',
        'background': `linear-gradient(135deg, var(--background-gradient-1) 0%, var(--background-gradient-2) 100%)`
    });
    
    $('.verbal-memory-display, .verbal-memory-game, .verbal-memory-splash, .verbal-memory-top-section, .verbal-memory-bottom-section').css({
        'background': 'transparent',
        'background-color': 'transparent'
    });
    
    $('.verbal-memory-word-display').css({
        'background': 'var(--background-secondary)',
        'backdrop-filter': 'none',
        'border': 'none',
        'border-radius': '0',
        'width': '100%',
        'height': '100%',
        'padding': '0'
    });
    $('.verbal-memory-btn').css({
        'background': 'var(--background-secondary)',
        'backdrop-filter': 'none',
        'border': 'none',
        'border-radius': '0',
        'width': '100%',
        'height': '100%',
        'padding': '0',
        'margin': '0',
        'outline': 'none',
        'box-shadow': 'none'
    });
    
    $('.verbal-memory-left-btn, .verbal-memory-right-btn').css({
        'border': 'none',
        'border-left': 'none',
        'border-right': 'none',
        'width': '50%',
        'height': '100%',
        'padding': '0',
        'margin': '0'
    });
    
    $('.seen-btn').css({
        'background': `rgba(${window.MinigameColors.primaryRgba}, 0.4)`,
        'border': 'none',
        'width': '100%',
        'height': '100%'
    });
    $('.new-btn').css({
        'background': `rgba(${window.MinigameColors.safeRgba}, 0.4)`,
        'border': 'none',
        'width': '100%',
        'height': '100%'
    });
}
