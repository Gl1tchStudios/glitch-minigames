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

// Firewall Pulse Minigame
(function() {
    let isActive = false;
    let direction = 1; // 1 = right, -1 = left
    let position = 0;
    let speed = 2;
    let pulseWidth;
    let trackWidth;
    let safeZoneLeft;
    let safeZoneRight;
    let safeZoneWidth;
    let successCount = 0;
    let animationFrame;
    let canClick = true;
    let timeLimit = 10; // in seconds
    let timeRemaining = 0;
    let timerInterval;
    let hackConfig = {
        requiredHacks: 3,
        initialSpeed: 2,
        maxSpeed: 10,
        timeLimit: 10,
        safeZoneMinWidth: 40,
        safeZoneMaxWidth: 120,
        safeZoneShrinkAmount: 10
    };

    function startGame() {
        isActive = true;
        canClick = true;
        successCount = 0;
        speed = hackConfig.initialSpeed;
        updateCounter();
        
        $('.pulse-bar').removeClass('success-bar fail-bar');
        $('#hack-container').show();
        
        pulseWidth = $('.pulse-bar').width();
        trackWidth = $('.pulse-track').width() - pulseWidth;
        
        const safeZone = $('.safe-zone');
        safeZoneWidth = hackConfig.safeZoneMaxWidth;
        safeZone.width(safeZoneWidth);
        
        repositionSafeZone();
        position = 0;
        $('#message').text('Click to stop the pulse inside the safe zone');
        $('#total-hacks').text(hackConfig.requiredHacks);
        
        $('body').css('cursor', 'pointer');
        
        startTimer();
        startPulse();
    }

    function stopGame() {
        isActive = false;
        stopTimer();
        if (animationFrame) {
            cancelAnimationFrame(animationFrame);
            animationFrame = null;
        }
        $('.pulse-bar').removeClass('success-bar fail-bar');
        
        setTimeout(() => {
            $('#hack-container').fadeOut(500, function() {
                isActive = false;
                canClick = true;
                successCount = 0;
            });
        }, 1000);
    }

    function stopPulse() {
        cancelAnimationFrame(animationFrame);
    }

    function startPulse() {
        if (!isActive) return;
        
        if (animationFrame) {
            cancelAnimationFrame(animationFrame);
        }
        
        animatePulse();
    }

    function animatePulse() {
        if (!isActive) return;
        
        position += direction * speed;
        
        if (position >= trackWidth || position <= 0) {
            direction *= -1;
        }
        
        position = Math.max(0, Math.min(trackWidth, position));
        $('.pulse-bar').css('left', position + 'px');
        
        animationFrame = requestAnimationFrame(animatePulse);
    }

    function repositionSafeZone() {
        const trackWidth = $('.pulse-track').width();
        const safeZone = $('.safe-zone');
        const margin = safeZoneWidth * 0.75;
        const maxPosition = trackWidth - safeZoneWidth - margin;
        const minPosition = margin;
        const newPosition = Math.floor(Math.random() * (maxPosition - minPosition + 1)) + minPosition;
        
        safeZone.css('left', newPosition + 'px');
        safeZoneLeft = newPosition;
        safeZoneRight = newPosition + safeZoneWidth;
    }

    function startTimer() {
        timeRemaining = hackConfig.timeLimit;
        
        updateTimerDisplay();
        
        $('.timer-progress').css('width', '100%');
        
        clearInterval(timerInterval);
        
        timerInterval = setInterval(function() {
            timeRemaining -= 0.1;
            timeRemaining = Math.max(0, parseFloat(timeRemaining.toFixed(1)));
            
            updateTimerDisplay();
            
            const percentage = (timeRemaining / hackConfig.timeLimit) * 100;
            $('.timer-progress').css('width', percentage + '%');
            
            if (timeRemaining <= 0) {
                clearInterval(timerInterval);
                onFailure('Time expired!');
            }
        }, 100);
    }

    function updateTimerDisplay() {
        $('#timer-count').text(timeRemaining.toFixed(1));
    }

    function stopTimer() {
        clearInterval(timerInterval);
    }

    function checkResult() {
        stopPulse();
        
        const currentPosition = $('.pulse-bar').position().left;
        const pulseRight = currentPosition + pulseWidth;
        
        safeZoneLeft = $('.safe-zone').position().left;
        safeZoneRight = safeZoneLeft + $('.safe-zone').width();
        
        if (currentPosition >= safeZoneLeft && pulseRight <= safeZoneRight) {
            playSoundSafe('sound-click');
            onSuccess();
        } else {
            playSoundSafe('sound-failure');
            onFailure('Hack failed - outside safe zone!');
        }
    }

    function onSuccess() {
        $('.pulse-bar').addClass('success-bar');
        successCount++;
        updateCounter();
        
        if (successCount >= hackConfig.requiredHacks) {
            stopTimer();
            $('#message').text('FIREWALL BYPASSED!');
            playSoundSafe('sound-success');
            
            fetch('https://glitch-minigames/hackSuccess', {
                method: 'POST',
                body: JSON.stringify({})
            });
            
            stopGame();
        } else {
            $('#message').text('SUCCESS! Difficulty increased.');
            setTimeout(() => {
                $('.pulse-bar').removeClass('success-bar');
                safeZoneWidth = Math.max(hackConfig.safeZoneMinWidth, safeZoneWidth - hackConfig.safeZoneShrinkAmount);
                $('.safe-zone').width(safeZoneWidth);
                repositionSafeZone();
                speed = Math.min(hackConfig.maxSpeed, speed + 1);
                startTimer();
                startPulse();
            }, 1000);
        }
    }

    function onFailure(reason) {
        stopTimer();
        stopPulse();
        $('.pulse-bar').addClass('fail-bar');
        $('#message').text(reason || 'BREACH FAILED! Security alerted.');
        playSoundSafe('sound-failure');
        
        fetch('https://glitch-minigames/hackFail', {
            method: 'POST',
            body: JSON.stringify({})
        });
        
        stopGame();
    }

    function updateCounter() {
        $('#counter').text(successCount);
    }

    // Expose public functions
    window.firewallPulseFunctions = {
        start: function(config) {
            if (config) {
                hackConfig = {
                    requiredHacks: config.requiredHacks || 3,
                    initialSpeed: config.initialSpeed || 2,
                    maxSpeed: config.maxSpeed || 10,
                    timeLimit: config.timeLimit || 10,
                    safeZoneMinWidth: config.safeZoneMinWidth || 40,
                    safeZoneMaxWidth: config.safeZoneMaxWidth || 120,
                    safeZoneShrinkAmount: config.safeZoneShrinkAmount || 10
                };
            }
            startGame();
        },
        stop: stopGame,
        checkResult: checkResult
    };

    console.log('[FirewallPulse] Loaded');
})();
