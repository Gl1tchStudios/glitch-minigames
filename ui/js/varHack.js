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

const varHackState = {
    config: {
        blocks: 5,
        speed: 5
    },
    order: 1,
    gameStarted: false,
    gamePlaying: false,
    timerInterval: null
};

function startVarHack(config = {}) {
    console.log('Initializing VAR hack UI');
    
    if (varHackState.timerInterval) {
        clearInterval(varHackState.timerInterval);
        varHackState.timerInterval = null;
    }
    
    varHackState.config = { ...varHackState.config, ...config };
    
    varHackState.order = 1;
    varHackState.gameStarted = false;
    varHackState.gamePlaying = false;
    
    $('#var-hack-container').show();
    
    $('.var-groups').empty().hide();
    $('.var-splash').show();
    
    $('#var-message').text('Memorize the pattern');
    $('.var-timer-progress').css('width', '100%');
    $('#var-timer').text(varHackState.config.speed.toFixed(1));
    
    console.log('Splash screen shown, waiting 3 seconds...');
    
    setTimeout(() => {
        console.log('Initializing game elements...');
        $('.var-splash').fadeOut(400, () => {
            initializeGame();
            $('.var-groups').fadeIn(400);
        });
    }, 3000);
}

function initializeGame() {
    console.log('Game initialization started');
    varHackState.order = 1;
    varHackState.gameStarted = true;
    varHackState.gamePlaying = false;
    
    $('.var-groups').removeClass('hidden').empty();
    console.log('Groups container cleared and shown');
    
    let numbers = Array.from({length: varHackState.config.blocks}, (_, i) => i + 1);
    shuffle(numbers);
    console.log('Generated numbers:', numbers);
    
    numbers.forEach(num => {
        const group = $('<div>')
            .addClass('var-group')
            .attr('data-number', num)
            .text(num)
            .css({
                position: 'absolute',
                top: `${random(50, 300)}px`,
                left: `${random(50, 500)}px`,
                width: '80px',
                height: '80px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: '1'
            })
            .on('click', handleClick);
        
        console.log(`Creating square for number ${num}`);
        $('.var-groups').append(group);
        
        moveSquare(group);
    });
    
    console.log('Game elements created, starting timer...');
    startTimer();
}

function moveSquare(element) {
    function animate() {
        const newTop = random(50, 300);
        const newLeft = random(50, 500);

        const duration = random(1000, 4000);
        
        $(element).animate({
            top: newTop,
            left: newLeft
        }, {
            duration: duration,
            easing: 'linear',
            complete: animate
        });
    }
    
    console.log('Starting movement animation for square:', $(element).text());
    animate();
}

function handleClick(e) {
    if (!varHackState.gamePlaying) return;
    
    const clicked = parseInt($(e.target).data('number'));
    
    if (clicked === varHackState.order) {
        $(e.target).addClass('good');
        playSoundSafe('sound-buttonPress');
        varHackState.order++;
        
        if (varHackState.order > varHackState.config.blocks) {
            gameWon();
        }
    } else {
        $(e.target).addClass('bad');
        gameLost();
    }
}

function gameWon() {
    varHackState.gameStarted = false;
    varHackState.gamePlaying = false;
    
    $('#var-message').text('Success!');
    playSoundSafe('sound-success');
    
    if (varHackState.timerInterval) {
        clearInterval(varHackState.timerInterval);
        varHackState.timerInterval = null;
    }
    
    setTimeout(() => {
        $.post(`https://${GetParentResourceName()}/varHackResult`, JSON.stringify({ 
            success: true
        }));
        resetGame();
        $('#var-hack-container').fadeOut();
    }, 1000);
}

function gameLost() {
    varHackState.gameStarted = false;
    varHackState.gamePlaying = false;
    
    $('#var-message').text('Failed!');
    playSoundSafe('sound-failure');
    
    if (varHackState.timerInterval) {
        clearInterval(varHackState.timerInterval);
        varHackState.timerInterval = null;
    }
    
    setTimeout(() => {
        $.post(`https://${GetParentResourceName()}/varHackResult`, JSON.stringify({ 
            success: false
        }));
        resetGame();
        $('#var-hack-container').fadeOut();
    }, 1000);
}

function startTimer() {
    console.log('Starting timer sequence');

    setTimeout(() => {
        console.log('Starting gameplay phase...');
        $('.var-groups').addClass('playing');
        varHackState.gamePlaying = true;
        $('#var-message').text('Click the numbers in order!');
        
        let timeLeft = varHackState.config.speed;
        updateTimer(timeLeft);
        
        varHackState.timerInterval = setInterval(() => {
            timeLeft -= 0.1;
            if (timeLeft <= 0) {
                clearInterval(varHackState.timerInterval);
                if (varHackState.gameStarted) {
                    gameLost();
                }
                return;
            }
            updateTimer(timeLeft);
        }, 100);
    }, 4000);
}

function updateTimer(time) {
    const width = (time / varHackState.config.speed) * 100;
    $('.var-timer-progress').css('width', `${width}%`);
    $('#var-timer').text(Math.max(0, time).toFixed(1));
}

function random(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

window.addEventListener('message', (event) => {
    console.log('Received NUI message:', event.data);
    
    if (event.data.action === 'startVarHack') {
        console.log('Starting VAR hack with config:', event.data.config);
        startVarHack(event.data.config);
    } else if (event.data.action === 'endVarHack' || event.data.action === 'forceClose') {
        console.log('Forced close of VAR hack:', event.data);
        if (varHackState.timerInterval) {
            clearInterval(varHackState.timerInterval);
            varHackState.timerInterval = null;
        }
        
        varHackState.gameStarted = false;
        varHackState.gamePlaying = false;
        
        $.post(`https://${GetParentResourceName()}/varHackResult`, JSON.stringify({ 
            success: false
        }));
        
        $('#var-hack-container').fadeOut();
        resetGame();
    }
});

function resetGame() {
    if (varHackState.timerInterval) {
        clearInterval(varHackState.timerInterval);
        varHackState.timerInterval = null;
    }
    
    varHackState.order = 1;
    varHackState.gameStarted = false;
    varHackState.gamePlaying = false;
    
    $('.var-groups').empty();
    $('.var-groups').removeClass('playing');
    $('.var-group').removeClass('good bad');
    
    $('#var-message').text('Memorize the pattern');
    $('.var-timer-progress').css('width', '100%');
    $('#var-timer').text(varHackState.config.speed.toFixed(1));
}