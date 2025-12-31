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

// Balance Minigame - Keep the needle in the safe zone!

let balanceGame = {
    active: false,
    started: false,
    config: null,
    needle: 0, // -100 to 100, 0 is center
    driftDirection: 1,
    driftSpeed: 0,
    targetDrift: 0,
    timerInterval: null,
    gameInterval: null,
    timeRemaining: 0,
    keysHeld: { q: false, e: false },
    dangerTime: 0, // time spent in red zone
    maxDangerTime: 1000, // 1 second in red = fail
    
    start: function(config) {
        this.config = {
            timeLimit: config.timeLimit || 10000, // 10 seconds default
            driftSpeed: config.driftSpeed || 3, // How fast needle drifts
            sensitivity: config.sensitivity || 8, // How much Q/E moves needle
            greenZoneWidth: config.greenZoneWidth || 30, // Width of safe green zone (degrees from center)
            yellowZoneWidth: config.yellowZoneWidth || 25, // Width of warning yellow zone
            driftRandomness: config.driftRandomness || 2, // How unpredictable the drift is
            maxDangerTime: config.maxDangerTime || 1000 // Time allowed in red before fail (ms)
        };
        
        this.active = true;
        this.started = false;
        this.needle = 0;
        this.driftDirection = Math.random() > 0.5 ? 1 : -1;
        this.driftSpeed = 0;
        this.targetDrift = this.config.driftSpeed * this.driftDirection;
        this.timeRemaining = this.config.timeLimit;
        this.dangerTime = 0;
        this.maxDangerTime = this.config.maxDangerTime;
        this.keysHeld = { q: false, e: false };
        
        $('#balance-container').fadeIn(200);
        this.setupDisplay();
        this.setupKeyListeners();
        
        $('.balance-status').text('PRESS Q OR E').removeClass('danger warning').addClass('ready');
        $('.balance-instruction').text('Press Q or E to begin stabilization - keep the needle balanced!');
    },
    
    beginGame: function() {
        if (this.started) return;
        this.started = true;
        
        console.log('[Balance] Game started by player input');
        
        $('.balance-instruction').text('Keep the needle balanced by pressing Q and E - don\'t let it fall into the red zones!');
        $('.balance-status').text('STABLE').removeClass('ready').addClass('safe');
        
        this.startTimer();
        this.startGameLoop();
    },
    
    setupDisplay: function() {
        this.drawGauge();
        this.updateNeedle();
        this.updateProgressBar();
    },
    
    drawGauge: function() {
        const canvas = document.getElementById('balance-gauge');
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        const centerX = width / 2;
        const centerY = height - 20;
        const radius = Math.min(width, height) - 40;
        
        ctx.clearRect(0, 0, width, height);
        
        const greenHalf = this.config.greenZoneWidth;
        const yellowHalf = this.config.yellowZoneWidth;
        
        // Red left zone
        this.drawArc(ctx, centerX, centerY, radius, 180, 180 + (90 - greenHalf - yellowHalf), '#ff4444');
        // Yellow left zone
        this.drawArc(ctx, centerX, centerY, radius, 180 + (90 - greenHalf - yellowHalf), 180 + (90 - greenHalf), '#ffcc00');
        // Green center zone
        this.drawArc(ctx, centerX, centerY, radius, 180 + (90 - greenHalf), 180 + (90 + greenHalf), '#00cc66');
        // Yellow right zone
        this.drawArc(ctx, centerX, centerY, radius, 180 + (90 + greenHalf), 180 + (90 + greenHalf + yellowHalf), '#ffcc00');
        // Red right zone
        this.drawArc(ctx, centerX, centerY, radius, 180 + (90 + greenHalf + yellowHalf), 360, '#ff4444');
        
        // Center marker
        ctx.beginPath();
        ctx.arc(centerX, centerY - radius - 5, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#00d4ff';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
    },
    
    drawArc: function(ctx, x, y, radius, startAngle, endAngle, color) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.arc(x, y, radius, (startAngle * Math.PI) / 180, (endAngle * Math.PI) / 180);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();
    },
    
    updateNeedle: function() {
        const canvas = document.getElementById('balance-gauge');
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        const centerX = width / 2;
        const centerY = height - 20;
        const radius = Math.min(width, height) - 40;
        
        this.drawGauge();
        
        const angle = 270 + (this.needle * 0.9);
        const angleRad = (angle * Math.PI) / 180;
        
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        const needleLength = radius - 10;
        const needleX = centerX + Math.cos(angleRad) * needleLength;
        const needleY = centerY + Math.sin(angleRad) * needleLength;
        ctx.lineTo(needleX, needleY);
        ctx.strokeStyle = '#00d4ff';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.restore();
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, 12, 0, Math.PI * 2);
        ctx.fillStyle = '#1a3a4a';
        ctx.fill();
        ctx.strokeStyle = '#00d4ff';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#00d4ff';
        ctx.fill();
    },
    
    getZone: function() {
        const absNeedle = Math.abs(this.needle);
        const greenThreshold = this.config.greenZoneWidth * (100 / 90);
        const yellowThreshold = (this.config.greenZoneWidth + this.config.yellowZoneWidth) * (100 / 90);
        
        if (absNeedle <= greenThreshold) return 'green';
        if (absNeedle <= yellowThreshold) return 'yellow';
        return 'red';
    },
    
    updateProgressBar: function() {
        const percent = (this.timeRemaining / this.config.timeLimit) * 100;
        const $bar = $('.balance-timer-progress');
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
            if (!self.active || !self.started) return;
            
            self.timeRemaining -= updateInterval;
            self.updateProgressBar();
            
            if (self.timeRemaining <= 0) {
                self.endGame(true);
            }
        }, updateInterval);
    },
    
    startGameLoop: function() {
        const self = this;
        const frameRate = 16;
        
        this.gameInterval = setInterval(function() {
            if (!self.active || !self.started) return;
            
            if (Math.random() < 0.02) {
                self.targetDrift = (Math.random() - 0.5) * self.config.driftSpeed * 2;
            }
            
            const randomDrift = (Math.random() - 0.5) * self.config.driftRandomness;
            
            self.driftSpeed += (self.targetDrift - self.driftSpeed) * 0.1;
            
            self.needle += (self.driftSpeed + randomDrift) * (frameRate / 100);
            
            if (self.keysHeld.q) {
                self.needle -= self.config.sensitivity * (frameRate / 100);
            }
            if (self.keysHeld.e) {
                self.needle += self.config.sensitivity * (frameRate / 100);
            }
            
            self.needle = Math.max(-100, Math.min(100, self.needle));
            
            const zone = self.getZone();
            if (zone === 'red') {
                self.dangerTime += frameRate;
                $('.balance-status').text('DANGER!').removeClass('safe warning ready').addClass('danger');
                
                if (self.dangerTime >= self.maxDangerTime) {
                    self.endGame(false);
                }
            } else if (zone === 'yellow') {
                self.dangerTime = Math.max(0, self.dangerTime - frameRate * 0.5);
                $('.balance-status').text('CAUTION').removeClass('safe danger ready').addClass('warning');
            } else {
                self.dangerTime = Math.max(0, self.dangerTime - frameRate);
                $('.balance-status').text('STABLE').removeClass('danger warning ready').addClass('safe');
            }
            
            const dangerPercent = (self.dangerTime / self.maxDangerTime) * 100;
            $('.balance-danger-fill').css('width', dangerPercent + '%');
            
            self.updateNeedle();
        }, frameRate);
    },
    
    setupKeyListeners: function() {
        const self = this;
        
        $(document).off('keydown.balance keyup.balance');
        
        $(document).on('keydown.balance', function(e) {
            if (!self.active) return;
            
            if (e.key.toLowerCase() === 'q') {
                if (!self.started) {
                    self.beginGame();
                }
                self.keysHeld.q = true;
            } else if (e.key.toLowerCase() === 'e') {
                if (!self.started) {
                    self.beginGame();
                }
                self.keysHeld.e = true;
            }
        });
        
        $(document).on('keyup.balance', function(e) {
            if (!self.active) return;
            
            if (e.key.toLowerCase() === 'q') {
                self.keysHeld.q = false;
            } else if (e.key.toLowerCase() === 'e') {
                self.keysHeld.e = false;
            }
        });
    },
    
    endGame: function(success) {
        if (!this.active) return;
        this.active = false;
        this.started = false;
        
        clearInterval(this.timerInterval);
        clearInterval(this.gameInterval);
        $(document).off('keydown.balance keyup.balance');
        
        const self = this;
        
        const $result = $('<div>').addClass('balance-result').addClass(success ? 'success' : 'failure');
        $result.text(success ? 'BALANCED!' : 'DESTABILIZED!');
        $('.balance-display').append($result);
        
        setTimeout(function() {
            $('#balance-container').fadeOut(200, function() {
                $result.remove();
                $('.balance-status').text('STABLE').removeClass('danger warning ready').addClass('safe');
                $('.balance-danger-fill').css('width', '0%');
            });
            
            $.post('https://glitch-minigames/balanceResult', JSON.stringify({ success: success }));
        }, 1500);
    },
    
    close: function() {
        this.active = false;
        this.started = false;
        clearInterval(this.timerInterval);
        clearInterval(this.gameInterval);
        $(document).off('keydown.balance keyup.balance');
        $('#balance-container').hide();
        $.post('https://glitch-minigames/balanceClose', JSON.stringify({}));
    }
};

window.balanceGame = balanceGame;

console.log('[Balance] Loaded');

window.addEventListener('message', function(event) {
    if (event.data.action === 'startBalance') {
        console.log('[Balance] Starting game with config:', event.data.config);
        balanceGame.start(event.data.config || {});
    } else if (event.data.action === 'endBalance') {
        balanceGame.close();
    }
});
