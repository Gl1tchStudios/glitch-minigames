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

// Lockpick Minigame

let lockpickGame = {
    active: false,
    config: null,
    animationFrame: null,
    angle: 0,
    sweetSpotStart: 0,
    sweetSpotSize: 30,
    currentRound: 0,
    successes: 0,
    failures: 0,
    shakeIntensity: 0,
    isShaking: false,
    lastMouseX: null,
    mouseSensitivity: 0.5,
    flashState: null,
    flashStartTime: 0,
    isTransitioning: false,
    
    start: function(config) {
        console.log('[Lockpick] start() called');
        
        if (this.active) {
            console.log('[Lockpick] Already active, ignoring');
            return;
        }
        
        this.config = {
            rounds: config.rounds || 3,
            sweetSpotSize: config.sweetSpotSize || 30,
            maxFailures: config.maxFailures || 2,
            shakeRange: config.shakeRange || 40,
            lockTime: config.lockTime || 500
        };
        
        this.active = true;
        this.currentRound = 0;
        this.successes = 0;
        this.failures = 0;
        this.angle = 0;
        this.sweetSpotSize = this.config.sweetSpotSize;
        this.isHolding = false;
        this.holdStartTime = 0;
        this.flashState = null;
        this.flashStartTime = 0;
        this.isTransitioning = false;
        
        const self = this;
        $('#lockpick-container').fadeIn(200, function() {
            self.setupRound();
            self.setupControls();
            self.startAnimation();
        });
        
        console.log('[Lockpick] Game started -', this.config.rounds, 'rounds');
    },
    
    setupRound: function() {
        this.currentRound++;
        
        this.flashState = null;
        this.flashStartTime = 0;
        this.isTransitioning = false;
        this.isHolding = false;
        this.holdStartTime = 0;
        this.lastMouseX = null;
        
        this.sweetSpotStart = Math.random() * 360;
        
        this.angle = (this.sweetSpotStart + 180 + (Math.random() * 60 - 30)) % 360;
        
        if (this.keysHeld) {
            this.keysHeld.left = false;
            this.keysHeld.right = false;
        }
        
        console.log('[Lockpick] Round', this.currentRound, '- Sweet spot at', this.sweetSpotStart.toFixed(1), 'degrees');
    },
    
    drawLockpick: function() {
        const canvas = document.getElementById('lockpick-canvas');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const outerRadius = 70;
        const innerRadius = 50;
        const tickLength = 8;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        let offsetX = 0;
        let offsetY = 0;
        if (this.shakeIntensity > 0 && !this.isTransitioning) {
            offsetX = (Math.random() - 0.5) * this.shakeIntensity;
            offsetY = (Math.random() - 0.5) * this.shakeIntensity;
        }
        
        ctx.save();
        ctx.translate(offsetX, offsetY);
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(100, 100, 100, 0.8)';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        const numTicks = 36;
        for (let i = 0; i < numTicks; i++) {
            const tickAngle = (i * (360 / numTicks) - 90) * Math.PI / 180;
            const isLongTick = i % 3 === 0;
            const tickLen = isLongTick ? tickLength + 3 : tickLength;
            
            const innerX = centerX + Math.cos(tickAngle) * (outerRadius - tickLen);
            const innerY = centerY + Math.sin(tickAngle) * (outerRadius - tickLen);
            const outerX = centerX + Math.cos(tickAngle) * outerRadius;
            const outerY = centerY + Math.sin(tickAngle) * outerRadius;
            
            ctx.beginPath();
            ctx.moveTo(innerX, innerY);
            ctx.lineTo(outerX, outerY);
            ctx.strokeStyle = isLongTick ? 'rgba(200, 200, 200, 0.9)' : 'rgba(150, 150, 150, 0.6)';
            ctx.lineWidth = isLongTick ? 2 : 1;
            ctx.stroke();
        }
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(30, 30, 30, 0.9)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(80, 80, 80, 0.8)';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        if (this.flashState) {
            const elapsed = Date.now() - this.flashStartTime;
            const flashDuration = 400;
            const opacity = Math.max(0, 1 - (elapsed / flashDuration)) * 0.6;
            
            ctx.beginPath();
            ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2);
            
            if (this.flashState === 'success') {
                ctx.fillStyle = `rgba(45, 212, 168, ${opacity})`;
            } else {
                ctx.fillStyle = `rgba(255, 68, 68, ${opacity})`;
            }
            ctx.fill();
        }
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(150, 150, 150, 0.8)';
        ctx.fill();
        
        const needleLength = outerRadius - 5;
        const needleAngle = (this.angle - 90) * Math.PI / 180;
        const needleEndX = centerX + Math.cos(needleAngle) * needleLength;
        const needleEndY = centerY + Math.sin(needleAngle) * needleLength;
        
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(needleEndX, needleEndY);
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.stroke();
        
        ctx.restore();
        
        if (this.isInSweetSpot()) {
            ctx.save();
            ctx.shadowColor = '#2dd4a8';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(needleEndX, needleEndY, 3, 0, Math.PI * 2);
            ctx.fillStyle = '#2dd4a8';
            ctx.fill();
            ctx.restore();
        }
        
        if (this.isHolding) {
            const holdProgress = Math.min(1, (Date.now() - this.holdStartTime) / this.config.lockTime);
            
            ctx.beginPath();
            ctx.arc(centerX, centerY, 15, -Math.PI / 2, -Math.PI / 2 + (holdProgress * Math.PI * 2));
            ctx.strokeStyle = '#2dd4a8';
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.stroke();
        }
        
        ctx.restore();
    },
    
    startAnimation: function() {
        const self = this;
        
        function animate() {
            if (!self.active) return;
            
            if (!self.isTransitioning) {
                self.updateShake();
                
                if (self.isHolding) {
                    const holdDuration = Date.now() - self.holdStartTime;
                    if (holdDuration >= self.config.lockTime) {
                        self.attemptLock();
                    }
                }
            }
            
            self.drawLockpick();
            self.animationFrame = requestAnimationFrame(animate);
        }
        
        animate();
    },
    
    updateShake: function() {
        const distance = this.getDistanceFromSweetSpot();
        const shakeRange = this.config.shakeRange;
        
        if (distance <= shakeRange) {
            const proximity = 1 - (distance / shakeRange);
            this.shakeIntensity = proximity * 8;
        } else {
            this.shakeIntensity = 0;
        }
    },
    
    getDistanceFromSweetSpot: function() {
        const sweetSpotCenter = this.sweetSpotStart + this.sweetSpotSize / 2;
        let distance = Math.abs(this.angle - sweetSpotCenter);
        
        if (distance > 180) {
            distance = 360 - distance;
        }
        
        return distance;
    },
    
    isInSweetSpot: function() {
        let angle = this.angle % 360;
        if (angle < 0) angle += 360;
        
        let start = this.sweetSpotStart % 360;
        if (start < 0) start += 360;
        
        let end = (this.sweetSpotStart + this.sweetSpotSize) % 360;
        if (end < 0) end += 360;
        
        if (start <= end) {
            return angle >= start && angle <= end;
        } else {
            return angle >= start || angle <= end;
        }
    },
    
    setupControls: function() {
        const self = this;
        
        $(document).off('keydown.lockpick keyup.lockpick mousemove.lockpick mousedown.lockpick mouseup.lockpick');
        
        this.keysHeld = { left: false, right: false };
        this.lastMouseX = null;
        
        $(document).on('keydown.lockpick', function(e) {
            if (!self.active) return;
            
            if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') {
                self.keysHeld.left = true;
                e.preventDefault();
            }
            if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') {
                self.keysHeld.right = true;
                e.preventDefault();
            }
            
            if ((e.key === 'e' || e.key === 'E' || e.key === ' ') && !self.isHolding) {
                self.isHolding = true;
                self.holdStartTime = Date.now();
                e.preventDefault();
            }
        });
        
        $(document).on('keyup.lockpick', function(e) {
            if (!self.active) return;
            
            if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') {
                self.keysHeld.left = false;
            }
            if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') {
                self.keysHeld.right = false;
            }
            
            if (e.key === 'e' || e.key === 'E' || e.key === ' ') {
                self.isHolding = false;
                self.holdStartTime = 0;
            }
        });
        
        $(document).on('mousemove.lockpick', function(e) {
            if (!self.active) return;
            
            if (self.lastMouseX !== null) {
                const deltaX = e.clientX - self.lastMouseX;
                self.angle += deltaX * self.mouseSensitivity;
                
                while (self.angle < 0) self.angle += 360;
                while (self.angle >= 360) self.angle -= 360;
            }
            
            self.lastMouseX = e.clientX;
        });
        
        $(document).on('mousedown.lockpick', function(e) {
            if (!self.active) return;
            
            if (e.button === 0 && !self.isHolding) {
                self.isHolding = true;
                self.holdStartTime = Date.now();
                e.preventDefault();
            }
        });
        
        $(document).on('mouseup.lockpick', function(e) {
            if (!self.active) return;
            
            if (e.button === 0) {
                self.isHolding = false;
                self.holdStartTime = 0;
                e.preventDefault();
            }
        });
        
        this.movementInterval = setInterval(function() {
            if (!self.active) return;
            
            const speed = 2;
            if (self.keysHeld.left) {
                self.angle -= speed;
                if (self.angle < 0) self.angle += 360;
            }
            if (self.keysHeld.right) {
                self.angle += speed;
                if (self.angle >= 360) self.angle -= 360;
            }
        }, 16);
    },
    
    attemptLock: function() {
        if (this.isTransitioning) return;
        
        this.isTransitioning = true;
        this.isHolding = false;
        this.holdStartTime = 0;
        
        if (this.isInSweetSpot()) {
            this.handleSuccess();
        } else {
            this.handleFailure();
        }
    },
    
    handleSuccess: function() {
        this.successes++;
        
        playSoundSafe('sound-success');
        
        this.flashState = 'success';
        this.flashStartTime = Date.now();
        
        const self = this;
        setTimeout(function() {
            if (self.currentRound >= self.config.rounds) {
                self.endGame(true);
            } else {
                self.setupRound();
            }
        }, 500);
    },
    
    handleFailure: function() {
        this.failures++;
        
        playSoundSafe('sound-failure');
        
        this.flashState = 'failure';
        this.flashStartTime = Date.now();
        
        console.log('[Lockpick] Failed - Total failures:', this.failures);
        
        const self = this;
        setTimeout(function() {
            if (self.failures >= self.config.maxFailures) {
                self.endGame(false);
            } else {
                self.angle = (self.sweetSpotStart + 180 + (Math.random() * 60 - 30)) % 360;
                self.flashState = null;
                self.isTransitioning = false;
            }
        }, 500);
    },
    
    
    endGame: function(success) {
        if (!this.active) return;
        this.active = false;
        this.isTransitioning = true;
        
        cancelAnimationFrame(this.animationFrame);
        clearInterval(this.movementInterval);
        $(document).off('keydown.lockpick keyup.lockpick mousemove.lockpick mousedown.lockpick mouseup.lockpick');
        this.lastMouseX = null;
        
        const self = this;
        
        this.flashState = success ? 'success' : 'failure';
        this.flashStartTime = Date.now();
        
        setTimeout(function() {
            $('#lockpick-container').fadeOut(200);
            
            $.post('https://glitch-minigames/lockpickResult', JSON.stringify({ 
                success: success,
                successes: self.successes,
                failures: self.failures
            }));
        }, 800);
    },
    
    close: function() {
        this.active = false;
        cancelAnimationFrame(this.animationFrame);
        clearInterval(this.movementInterval);
        $(document).off('keydown.lockpick keyup.lockpick mousemove.lockpick mousedown.lockpick mouseup.lockpick');
        this.lastMouseX = null;
        $('#lockpick-container').hide();
        $.post('https://glitch-minigames/lockpickClose', JSON.stringify({}));
    }
};

window.lockpickGame = lockpickGame;

console.log('[Lockpick] Loaded');
