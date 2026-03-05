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

// Bar Hit Minigame - Press the key when the moving bar enters the highlighted target zone

let barHitGame = {
    active: false,
    config: null,
    animationFrame: null,
    timerInterval: null,
    timeRemaining: 0,
    barPosition: 0,   // 0–100
    direction: 1,     // 1 = right, -1 = left
    lastTimestamp: null,
    currentRound: 0,
    failures: 0,
    locked: false,
    zoneStart: 0,
    zoneEnd: 0,
    flashTimeout: null,

    start: function(config) {
        console.log('[BarHit] start() called');

        if (this.active) {
            console.log('[BarHit] Already active, ignoring');
            return;
        }

        this.config = {
            key: (config.key || 'E').toUpperCase(),
            rounds: config.rounds || 3,
            speed: config.speed || 55,           // % per second
            zoneSize: config.zoneSize || 20,     // width of zone in % (10–40)
            zoneStart: config.zoneStart || null, // fixed start %, null = random each round
            maxFailures: config.maxFailures || 3,
            timeLimit: config.timeLimit || 30000
        };

        this.active = true;
        this.currentRound = 0;
        this.failures = 0;
        this.locked = false;
        this.barPosition = 0;
        this.direction = 1;
        this.lastTimestamp = null;
        this.timeRemaining = this.config.timeLimit;

        const self = this;
        $('#bar-hit-container').fadeIn(150, function() {
            $('#bar-hit-key').text(self.config.key);
            $('#bar-hit-rounds').text(self.config.rounds);
            $('#bar-hit-max-failures').text(self.config.maxFailures);

            self.setupRound();
            self.startTimer();
            self.animate(performance.now());
        });

        console.log('[BarHit] Game started — key:', this.config.key, 'rounds:', this.config.rounds, 'speed:', this.config.speed);
    },

    setupRound: function() {
        this.currentRound++;
        this.locked = false;
        this.barPosition = 0;
        this.direction = 1;
        this.lastTimestamp = null;

        // Zone position
        if (this.config.zoneStart !== null && this.config.zoneStart !== undefined) {
            this.zoneStart = Math.min(this.config.zoneStart, 100 - this.config.zoneSize);
        } else {
            // Random zone somewhere in the right half to avoid trivially easy start
            const minStart = 30;
            const maxStart = 100 - this.config.zoneSize - 5;
            this.zoneStart = Math.floor(Math.random() * (maxStart - minStart)) + minStart;
        }
        this.zoneEnd = Math.min(this.zoneStart + this.config.zoneSize, 100);

        // Update zone display
        const $track = $('.bar-hit-track');
        const zoneLeft = this.zoneStart + '%';
        const zoneWidth = (this.zoneEnd - this.zoneStart) + '%';
        $('.bar-hit-zone').css({ left: zoneLeft, width: zoneWidth });

        $('#bar-hit-round').text(this.currentRound);
        $('#bar-hit-failures').text(this.failures);
        $('#bar-hit-message').text('Press [' + this.config.key + '] when the bar hits the zone');
        $('#bar-hit-container').removeClass('flash-success flash-fail');
    },

    animate: function(timestamp) {
        if (!this.active) return;
        if (this.locked) {
            this.animationFrame = requestAnimationFrame(this.animate.bind(this));
            return;
        }

        if (!this.lastTimestamp) this.lastTimestamp = timestamp;
        const delta = (timestamp - this.lastTimestamp) / 1000; // seconds
        this.lastTimestamp = timestamp;

        this.barPosition += this.direction * this.config.speed * delta;

        if (this.barPosition >= 100) {
            this.barPosition = 100;
            this.direction = -1;
        } else if (this.barPosition <= 0) {
            this.barPosition = 0;
            this.direction = 1;
        }

        this.renderBar();
        this.animationFrame = requestAnimationFrame(this.animate.bind(this));
    },

    renderBar: function() {
        const pct = this.barPosition;
        $('.bar-hit-fill').css('width', pct + '%');

        // Glow the zone when bar overlaps it
        const inZone = pct >= this.zoneStart && pct <= this.zoneEnd;
        if (inZone) {
            $('.bar-hit-zone').addClass('active-zone');
        } else {
            $('.bar-hit-zone').removeClass('active-zone');
        }
    },

    // Key name → JS keyCode map for FiveM keyPress forwarding
    keyCodeMap: {
        'E': 69, 'F': 70, 'R': 82, 'G': 71, 'H': 72, 'T': 84, 'Y': 89,
        'Q': 81, 'Z': 90, 'X': 88, 'C': 67, 'V': 86, 'B': 66, 'N': 78,
        'M': 77, 'U': 85, 'I': 73, 'O': 79, 'P': 80, 'J': 74, 'K': 75,
        'L': 76, 'A': 65, 'S': 83, 'D': 68, 'W': 87,
        '1': 49, '2': 50, '3': 51, '4': 52, '5': 53,
        '6': 54, '7': 55, '8': 56, '9': 57, '0': 48,
        'SPACE': 32
    },

    // Called from app.js keyPress handler (FiveM key forwarding)
    handleKeyByCode: function(keyCode) {
        if (!this.active) return;
        const expectedCode = this.keyCodeMap[this.config.key];
        if (expectedCode && keyCode === expectedCode) {
            this.handlePress();
        }
    },

    handlePress: function() {
        if (!this.active || this.locked) return;

        this.locked = true;
        const inZone = this.barPosition >= this.zoneStart && this.barPosition <= this.zoneEnd;

        if (inZone) {
            $('#bar-hit-container').addClass('flash-success');
            $('#bar-hit-message').text('LOCKED IN');

            const self = this;
            setTimeout(function() {
                if (!self.active) return;
                $('#bar-hit-container').removeClass('flash-success');

                if (self.currentRound >= self.config.rounds) {
                    self.endGame(true);
                } else {
                    self.setupRound();
                    self.locked = false;
                }
            }, 500);
        } else {
            this.failures++;
            $('#bar-hit-failures').text(this.failures);
            $('#bar-hit-container').addClass('flash-fail');
            $('#bar-hit-message').text('MISSED — ' + (this.config.maxFailures - this.failures) + ' LEFT');

            const self = this;
            setTimeout(function() {
                if (!self.active) return;
                $('#bar-hit-container').removeClass('flash-fail');

                if (self.failures >= self.config.maxFailures) {
                    self.endGame(false);
                } else {
                    self.locked = false;
                }
            }, 400);
        }
    },

    startTimer: function() {
        const self = this;
        this.timerInterval = setInterval(function() {
            if (!self.active) return;
            self.timeRemaining -= 50;
            const pct = Math.max(0, (self.timeRemaining / self.config.timeLimit) * 100);
            $('.bar-hit-timer-progress').css('width', pct + '%');
            if (pct <= 25) $('.bar-hit-timer-progress').addClass('danger');
            else $('.bar-hit-timer-progress').removeClass('danger');
            if (self.timeRemaining <= 0) self.endGame(false);
        }, 50);
    },

    endGame: function(success) {
        if (!this.active) return;
        this.active = false;

        clearInterval(this.timerInterval);
        this.timerInterval = null;
        if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
        this.animationFrame = null;

        $('#bar-hit-message').text(success ? 'ACCESS GRANTED' : 'ACCESS DENIED');

        const resultData = {
            success: success,
            rounds: this.currentRound,
            failures: this.failures
        };

        setTimeout(function() {
            $('#bar-hit-container').fadeOut(500, function() {
                $.post('https://glitch-minigames/barHitResult', JSON.stringify(resultData));
            });
        }, 700);
    },

    close: function() {
        if (!this.active) return;
        this.active = false;
        clearInterval(this.timerInterval);
        this.timerInterval = null;
        if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
        this.animationFrame = null;
        $('#bar-hit-container').fadeOut(300);
    }
};

window.barHitGame = barHitGame;
