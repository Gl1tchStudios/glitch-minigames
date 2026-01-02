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

// Aim Test Minigame - Click the targets before they disappear!

let aimTestGame = {
    active: false,
    config: null,
    timerInterval: null,
    targetTimeout: null,
    timeRemaining: 0,
    targetsHit: 0,
    targetsMissed: 0,
    currentTarget: null,
    
    start: function(config) {
        console.log('[AimTest] start() called');
        
        if (this.active) {
            console.log('[AimTest] Already active, ignoring');
            return;
        }
        
        this.config = {
            timeLimit: config.timeLimit || 30000,
            targetsToHit: config.targetsToHit || 10,
            targetLifetime: config.targetLifetime || 1500,
            targetSize: config.targetSize || 60,
            shrinkTarget: config.shrinkTarget !== false,
            maxMisses: config.maxMisses || 5,
            timePenalty: config.timePenalty || 0
        };
        
        this.active = true;
        this.targetsHit = 0;
        this.targetsMissed = 0;
        this.timeRemaining = this.config.timeLimit;
        this.currentTarget = null;
        
        $('.aim-test-area').empty();
        
        const self = this;
        $('#aim-test-container').fadeIn(200, function() {
            self.setupDisplay();
            self.startTimer();
            self.setupClickHandler();
            setTimeout(function() {
                self.spawnTarget();
            }, 100);
        });
        
        console.log('[AimTest] Game started - hit', this.config.targetsToHit, 'targets');
    },
    
    setupDisplay: function() {
        $('.aim-test-area').empty();
        
        this.updateCounter();
        this.updateProgressBar();
    },
    
    updateCounter: function() {
        $('#aim-test-hits').text(this.targetsHit);
        $('#aim-test-total').text(this.config.targetsToHit);
        $('#aim-test-misses').text(this.targetsMissed);
        $('#aim-test-max-misses').text(this.config.maxMisses);
    },
    
    updateProgressBar: function() {
        const percent = (this.timeRemaining / this.config.timeLimit) * 100;
        const $bar = $('.aim-test-timer-progress');
        $bar.css('width', percent + '%');
        
        if (percent <= 25) {
            $bar.addClass('danger');
        } else {
            $bar.removeClass('danger');
        }
    },
    
    startTimer: function() {
        const self = this;
        const updateInterval = 50;
        
        this.timerInterval = setInterval(function() {
            if (!self.active) return;
            
            self.timeRemaining -= updateInterval;
            self.updateProgressBar();
            
            if (self.timeRemaining <= 0) {
                self.endGame(false);
            }
        }, updateInterval);
    },
    
    spawnTarget: function() {
        if (!this.active) return;
        
        const self = this;
        const $area = $('.aim-test-area');
        const areaWidth = $area.innerWidth();
        const areaHeight = $area.innerHeight();
        const size = this.config.targetSize;
        
        console.log('[AimTest] Area dimensions:', areaWidth, 'x', areaHeight, 'target size:', size);
        
        if (areaWidth <= 0 || areaHeight <= 0) {
            console.error('[AimTest] Area has no dimensions! Retrying in 100ms...');
            setTimeout(function() {
                self.spawnTarget();
            }, 100);
            return;
        }
        
        $('.aim-test-target').remove();
        
        const padding = 10;
        const maxX = areaWidth - size - padding;
        const maxY = areaHeight - size - padding;
        const x = Math.floor(Math.random() * maxX) + padding;
        const y = Math.floor(Math.random() * maxY) + padding;
        
        const $target = $('<div></div>');
        $target.addClass('aim-test-target');
        $target.css({
            'position': 'absolute',
            'left': x + 'px',
            'top': y + 'px',
            'width': size + 'px',
            'height': size + 'px',
            'background': `radial-gradient(circle at 30% 30%, ${window.MinigameColors.failure}, ${window.MinigameColors.danger} 50%, ${window.MinigameColors.danger})`,
            'border-radius': '50%',
            'cursor': 'crosshair',
            'box-shadow': `0 0 20px rgba(${window.MinigameColors.failureRgba}, 0.8), inset 0 -5px 15px rgba(0, 0, 0, 0.3)`,
            'border': `3px solid ${window.MinigameColors.failure}`,
            'z-index': '1000',
            'display': 'block',
            'opacity': '1',
            'visibility': 'visible',
            'transform': 'scale(1)',
            'pointer-events': 'auto'
        });
        
        const $innerRing = $('<div></div>');
        $innerRing.css({
            'position': 'absolute',
            'top': '50%',
            'left': '50%',
            'width': '50%',
            'height': '50%',
            'transform': 'translate(-50%, -50%)',
            'border': `2px solid rgba(${window.MinigameColors.textRgba}, 0.5)`,
            'border-radius': '50%',
            'pointer-events': 'none'
        });
        $target.append($innerRing);
        
        const $centerDot = $('<div></div>');
        $centerDot.css({
            'position': 'absolute',
            'top': '50%',
            'left': '50%',
            'width': '8px',
            'height': '8px',
            'transform': 'translate(-50%, -50%)',
            'background': window.MinigameColors.text,
            'border-radius': '50%',
            'pointer-events': 'none'
        });
        $target.append($centerDot);
        
        // Append to area
        $area.append($target);
        this.currentTarget = $target;
        
        console.log('[AimTest] Target spawned at', x, y, '- Elements in DOM:', $('.aim-test-target').length);
        
        if (this.config.shrinkTarget) {
            $target.css('transition', 'transform ' + this.config.targetLifetime + 'ms linear');
            setTimeout(function() {
                if ($target.length && self.active) {
                    $target.css('transform', 'scale(0)');
                }
            }, 50);
        }
        
        this.targetTimeout = setTimeout(function() {
            if (self.active && self.currentTarget && self.currentTarget[0] === $target[0]) {
                self.missTarget($target);
            }
        }, this.config.targetLifetime);
    },
    
    hitTarget: function($target) {
        if (!this.active) return;
        
        clearTimeout(this.targetTimeout);
        
        $target.addClass('hit');
        $target.css('transform', 'scale(1.3)');
        
        this.targetsHit++;
        this.updateCounter();
        
        const self = this;
        
        setTimeout(function() {
            $target.remove();
            self.currentTarget = null;
            
            if (self.targetsHit >= self.config.targetsToHit) {
                self.endGame(true);
            } else {
                setTimeout(function() {
                    self.spawnTarget();
                }, 200);
            }
        }, 100);
    },
    
    missTarget: function($target) {
        if (!this.active) return;
        
        $target.addClass('missed');
        
        this.targetsMissed++;
        this.updateCounter();
        
        // Apply time penalty if configured
        if (this.config.timePenalty > 0) {
            this.timeRemaining -= this.config.timePenalty;
            this.updateProgressBar();
            
            // Check if time ran out from penalty
            if (this.timeRemaining <= 0) {
                this.timeRemaining = 0;
                this.endGame(false);
                return;
            }
        }
        
        const self = this;
        
        setTimeout(function() {
            $target.remove();
            self.currentTarget = null;
            
            if (self.targetsMissed >= self.config.maxMisses) {
                self.endGame(false);
            } else if (self.active) {
                setTimeout(function() {
                    self.spawnTarget();
                }, 200);
            }
        }, 200);
    },
    
    setupClickHandler: function() {
        const self = this;
        
        $('.aim-test-area').off('click.aimtest');
        
        $('.aim-test-area').on('click.aimtest', '.aim-test-target', function(e) {
            e.stopPropagation();
            if (!self.active) return;
            
            const $target = $(this);
            if (!$target.hasClass('hit') && !$target.hasClass('missed')) {
                self.hitTarget($target);
            }
        });
    },
    
    endGame: function(success) {
        if (!this.active) return;
        this.active = false;
        
        clearInterval(this.timerInterval);
        clearTimeout(this.targetTimeout);
        $('.aim-test-area').off('click.aimtest');
        
        const self = this;
        
        if (this.currentTarget) {
            this.currentTarget.remove();
            this.currentTarget = null;
        }
        
        const $result = $('<div>').addClass('aim-test-result').addClass(success ? 'success' : 'failure');
        $result.html(success ? 
            'TARGET ACQUIRED!<br><span class="result-stats">' + this.targetsHit + '/' + this.config.targetsToHit + ' hits</span>' : 
            'TARGET LOST!<br><span class="result-stats">' + this.targetsHit + '/' + this.config.targetsToHit + ' hits</span>'
        );
        $('.aim-test-display').append($result);
        
        setTimeout(function() {
            $('#aim-test-container').fadeOut(200, function() {
                $result.remove();
                $('.aim-test-area').empty();
            });
            
            $.post('https://glitch-minigames/aimTestResult', JSON.stringify({ 
                success: success,
                targetsHit: self.targetsHit,
                targetsMissed: self.targetsMissed
            }));
        }, 1500);
    },
    
    close: function() {
        this.active = false;
        clearInterval(this.timerInterval);
        clearTimeout(this.targetTimeout);
        $('.aim-test-area').off('click.aimtest');
        if (this.currentTarget) {
            this.currentTarget.remove();
            this.currentTarget = null;
        }
        $('#aim-test-container').hide();
        $('.aim-test-area').empty();
        $.post('https://glitch-minigames/aimTestClose', JSON.stringify({}));
    }
};

window.aimTestGame = aimTestGame;

console.log('[AimTest] Loaded');