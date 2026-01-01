// Circle Click Minigame - Press the key when the rotating segment enters the target zone

let circleClickGame = {
    active: false,
    config: null,
    animationFrame: null,
    currentRound: 0,
    currentKey: null,
    angle: 0,
    targetZoneStart: 0,
    targetZoneSize: 45, // degrees
    rotationSpeed: 2,
    successes: 0,
    failures: 0,
    flashState: null, // null, 'success', or 'failure'
    
    start: function(config) {
        console.log('[CircleClick] start() called');
        
        if (this.active) {
            console.log('[CircleClick] Already active, ignoring');
            return;
        }
        
        this.config = {
            rounds: config.rounds || 5,
            rotationSpeed: config.rotationSpeed || 2, // degrees per frame
            targetZoneSize: config.targetZoneSize || 45, // degrees
            maxFailures: config.maxFailures || 3,
            keys: config.keys || ['1', '2', '3', '4', '5', '6', '7', '8', '9'],
            speedIncrease: config.speedIncrease || 0.3, // Speed increase per round
            randomizeDirection: config.randomizeDirection !== false // Randomize rotation direction
        };
        
        this.active = true;
        this.currentRound = 0;
        this.successes = 0;
        this.failures = 0;
        this.angle = 0;
        this.flashState = null;
        this.rotationSpeed = this.config.rotationSpeed;
        this.targetZoneSize = this.config.targetZoneSize;
        this.rotationDirection = 1;
        
        const self = this;
        $('#circle-click-container').fadeIn(200, function() {
            self.setupRound();
            self.setupKeyHandler();
            self.startRotation();
        });
        
        console.log('[CircleClick] Game started -', this.config.rounds, 'rounds');
    },
    
    setupRound: function() {
        this.currentRound++;
        
        this.currentKey = this.config.keys[Math.floor(Math.random() * this.config.keys.length)];
        
        this.targetZoneStart = Math.random() * 120 - 60 - 90;
        
        if (this.config.randomizeDirection && this.currentRound > 1) {
            this.rotationDirection = Math.random() > 0.5 ? 1 : -1;
        }
        
        this.rotationSpeed = this.config.rotationSpeed + (this.currentRound - 1) * this.config.speedIncrease;
        
        this.angle = this.targetZoneStart + 180;
        
        this.drawCircle();
    },
    
    drawCircle: function() {
        const canvas = document.getElementById('circle-click-canvas');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = 60;
        const innerRadius = 38;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(50, 50, 50, 1)';
        ctx.lineWidth = 6;
        ctx.stroke();
        
        const targetStart = (this.targetZoneStart - 90) * Math.PI / 180;
        const targetEnd = (this.targetZoneStart + this.targetZoneSize - 90) * Math.PI / 180;
        
        ctx.save();
        ctx.shadowColor = '#33b5e5';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, targetStart, targetEnd);
        ctx.strokeStyle = '#33b5e5';
        ctx.lineWidth = 6;
        ctx.stroke();
        ctx.restore();
        
        const segmentSize = 18;
        const segmentStart = (this.angle - 90) * Math.PI / 180;
        const segmentEnd = (this.angle + segmentSize - 90) * Math.PI / 180;
        
        ctx.save();
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, segmentStart, segmentEnd);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.restore();
        
        let innerColor = '#33b5e5';
        let glowColor = 'rgba(0, 0, 0, 0.4)';
        if (this.flashState === 'success') {
            innerColor = '#00ff88';
            glowColor = 'rgba(0, 255, 136, 0.6)';
        } else if (this.flashState === 'failure') {
            innerColor = '#ff4444';
            glowColor = 'rgba(255, 68, 68, 0.6)';
        }
        
        ctx.save();
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = this.flashState ? 20 : 15;
        ctx.shadowOffsetY = this.flashState ? 0 : 4;
        ctx.beginPath();
        ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2);
        ctx.fillStyle = innerColor;
        ctx.fill();
        ctx.restore();
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2);
        ctx.fillStyle = innerColor;
        ctx.fill();
        
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetY = 2;
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px "Share Tech Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.currentKey, centerX, centerY);
        ctx.restore();
    },
    
    startRotation: function() {
        const self = this;
        
        function animate() {
            if (!self.active) return;
            
            self.angle += self.rotationSpeed * self.rotationDirection;
            
            if (self.angle >= 360) self.angle -= 360;
            if (self.angle < 0) self.angle += 360;
            
            self.drawCircle();
            self.animationFrame = requestAnimationFrame(animate);
        }
        
        animate();
    },
    
    setupKeyHandler: function() {
        const self = this;
        
        $(document).off('keydown.circleclick');
        $(document).on('keydown.circleclick', function(e) {
            if (!self.active) return;
            
            const pressedKey = e.key.toUpperCase();
            const expectedKey = self.currentKey.toUpperCase();
            
            const validKeys = self.config.keys.map(k => k.toUpperCase());
            if (!validKeys.includes(pressedKey)) return;
            
            if (pressedKey !== expectedKey) {
                self.handleFailure('wrong_key');
                return;
            }
            
            if (self.isInTargetZone()) {
                self.handleSuccess();
            } else {
                self.handleFailure('wrong_timing');
            }
        });
    },
    
    isInTargetZone: function() {
        let currentAngle = this.angle % 360;
        if (currentAngle < 0) currentAngle += 360;
        
        let zoneStart = this.targetZoneStart % 360;
        if (zoneStart < 0) zoneStart += 360;
        
        let zoneEnd = (this.targetZoneStart + this.targetZoneSize) % 360;
        if (zoneEnd < 0) zoneEnd += 360;
        
        const segmentSize = 15;
        const segmentEnd = (currentAngle + segmentSize) % 360;
        
        if (zoneStart <= zoneEnd) {
            return (currentAngle >= zoneStart && currentAngle <= zoneEnd) ||
                   (segmentEnd >= zoneStart && segmentEnd <= zoneEnd);
        } else {
            return (currentAngle >= zoneStart || currentAngle <= zoneEnd) ||
                   (segmentEnd >= zoneStart || segmentEnd <= zoneEnd);
        }
    },
    
    handleSuccess: function() {
        this.successes++;
        
        playSoundSafe('sound-success');
        
        this.flashResult(true);
        
        const self = this;
        setTimeout(function() {
            if (self.currentRound >= self.config.rounds) {
                self.endGame(true);
            } else {
                self.setupRound();
            }
        }, 500);
    },
    
    handleFailure: function(reason) {
        this.failures++;
        
        console.log('[CircleClick] Failure:', reason, '- Total failures:', this.failures);
        
        playSoundSafe('sound-failure');
        
        this.flashResult(false);
        
        const self = this;
        setTimeout(function() {
            if (self.failures >= self.config.maxFailures) {
                self.endGame(false);
            } else {
                self.angle = self.targetZoneStart + 180;
            }
        }, 500);
    },
    
    flashResult: function(success) {
        this.flashState = success ? 'success' : 'failure';
        
        const self = this;
        setTimeout(function() {
            if (self.active) {
                self.flashState = null;
            }
        }, 400);
    },
    
    endGame: function(success) {
        if (!this.active) return;
        this.active = false;
        
        cancelAnimationFrame(this.animationFrame);
        $(document).off('keydown.circleclick');
        
        const self = this;
        
        this.flashResult(success);
        
        setTimeout(function() {
            $('#circle-click-container').fadeOut(200);
            
            $.post('https://glitch-minigames/circleClickResult', JSON.stringify({ 
                success: success,
                successes: self.successes,
                failures: self.failures
            }));
        }, 800);
    },
    
    close: function() {
        this.active = false;
        cancelAnimationFrame(this.animationFrame);
        $(document).off('keydown.circleclick');
        $('#circle-click-container').hide();
        $.post('https://glitch-minigames/circleClickClose', JSON.stringify({}));
    }
};

window.circleClickGame = circleClickGame;

console.log('[CircleClick] Loaded');
