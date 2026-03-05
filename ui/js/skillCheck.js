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

// Skill Check Minigame - Press the correct key when the moving indicator enters the highlighted zone

let skillCheckGame = {
    active: false,
    config: null,
    animFrame: null,
    timerInterval: null,
    timeRemaining: 0,
    position: 0,        // 0–100 %
    direction: 1,       // 1 = right, -1 = left
    lastTimestamp: null,
    currentRound: 0,
    currentKey: null,
    zoneStart: 0,
    perfectStart: 0,
    failures: 0,
    locked: false,

    // FiveM keyCode map
    keyCodeMap: {
        'E': 69, 'F': 70, 'R': 82, 'G': 71, 'H': 72, 'T': 84, 'Y': 89,
        'Q': 81, 'Z': 90, 'X': 88, 'C': 67, 'V': 86, 'B': 66, 'N': 78,
        'M': 77, 'U': 85, 'I': 73, 'O': 79, 'P': 80, 'J': 74, 'K': 75,
        'L': 76, 'A': 65, 'S': 83, 'D': 68, 'W': 87,
        '1': 49, '2': 50, '3': 51, '4': 52, '5': 53,
        '6': 54, '7': 55, '8': 56, '9': 57, '0': 48
    },

    start: function(config) {
        console.log('[SkillCheck] start() called');
        if (this.active) return;

        this.config = {
            keys: config.keys || ['E', 'F', 'R'],          // one key per round
            speed: config.speed || 65,                      // % per second
            timeLimit: config.timeLimit || 15000,           // total ms
            zoneSize: config.zoneSize || 18,                // normal zone width %
            perfectZoneSize: config.perfectZoneSize !== undefined ? config.perfectZoneSize : 5, // 0 = disabled
            maxFailures: config.maxFailures || 1,           // misses/wrong keys before fail
            randomizeZone: config.randomizeZone !== false
        };

        this.active = true;
        this.currentRound = 0;
        this.failures = 0;
        this.locked = false;
        this.position = 0;
        this.direction = 1;
        this.lastTimestamp = null;
        this.timeRemaining = this.config.timeLimit;

        const self = this;
        $('#skill-check-container').fadeIn(200, function() {
            self.setupRound();
            self.startTimer();
            self.animate(performance.now());
        });
    },

    setupRound: function() {
        this.currentRound++;
        this.locked = false;
        this.position = 0;
        this.direction = 1;
        this.lastTimestamp = null;

        this.currentKey = (this.config.keys[(this.currentRound - 1) % this.config.keys.length] || 'E').toUpperCase();

        // Randomise zone, always in the right half so it's not immediately reached
        if (this.config.randomizeZone) {
            const minStart = 30;
            const maxStart = 100 - this.config.zoneSize - 5;
            this.zoneStart = Math.floor(Math.random() * (maxStart - minStart)) + minStart;
        } else {
            this.zoneStart = 55 - this.config.zoneSize / 2;
        }

        // Perfect zone centered inside the normal zone
        if (this.config.perfectZoneSize > 0) {
            this.perfectStart = this.zoneStart + (this.config.zoneSize - this.config.perfectZoneSize) / 2;
        }

        // Zone DOM updates
        $('.skill-check-zone').css({ left: this.zoneStart + '%', width: this.config.zoneSize + '%' });
        $('#skill-check-key').text(this.currentKey);

        if (this.config.perfectZoneSize > 0) {
            const pw = this.config.perfectZoneSize + '%';
            const pl = this.perfectStart + '%';
            $('.skill-check-perfect').css({ left: pl, width: pw }).show();
        } else {
            $('.skill-check-perfect').hide();
        }

        $('#skill-check-round').text(this.currentRound);
        $('#skill-check-total').text(this.config.keys.length);
        $('#skill-check-failures').text(this.failures);
        $('#skill-check-max-failures').text(this.config.maxFailures);
        $('#skill-check-message').text('Press [' + this.currentKey + '] in the zone!');
        $('#skill-check-container').removeClass('sc-flash-success sc-flash-fail');
        $('.skill-check-zone, .skill-check-perfect').removeClass('in-range');
    },

    animate: function(timestamp) {
        if (!this.active) return;

        if (!this.locked) {
            if (!this.lastTimestamp) this.lastTimestamp = timestamp;
            const delta = (timestamp - this.lastTimestamp) / 1000;
            this.lastTimestamp = timestamp;

            this.position += this.direction * this.config.speed * delta;
            if (this.position >= 100) { this.position = 100; this.direction = -1; }
            else if (this.position <= 0) { this.position = 0; this.direction = 1; }

            $('.skill-check-indicator').css('left', this.position + '%');

            // Zone glow when overlapping
            const inZone = this.position >= this.zoneStart && this.position <= (this.zoneStart + this.config.zoneSize);
            const inPerfect = this.config.perfectZoneSize > 0 &&
                              this.position >= this.perfectStart &&
                              this.position <= (this.perfectStart + this.config.perfectZoneSize);

            if (inZone) {
                $('.skill-check-zone').addClass('in-range');
            } else {
                $('.skill-check-zone').removeClass('in-range');
            }
            if (inPerfect) {
                $('.skill-check-perfect').addClass('in-range');
            } else {
                $('.skill-check-perfect').removeClass('in-range');
            }
        } else {
            this.lastTimestamp = null;
        }

        this.animFrame = requestAnimationFrame(this.animate.bind(this));
    },

    // Called by app.js keyPress forwarder
    handleKeyByCode: function(keyCode) {
        if (!this.active || this.locked) return;

        const expectedCode = this.keyCodeMap[this.currentKey];

        if (expectedCode && keyCode === expectedCode) {
            // Correct key — check position
            this.locked = true;
            const inZone = this.position >= this.zoneStart && this.position <= (this.zoneStart + this.config.zoneSize);
            const inPerfect = this.config.perfectZoneSize > 0 &&
                              this.position >= this.perfectStart &&
                              this.position <= (this.perfectStart + this.config.perfectZoneSize);

            if (inZone) {
                $('#skill-check-container').addClass('sc-flash-success');
                $('#skill-check-message').text(inPerfect ? 'PERFECT!' : 'LOCKED IN');
                const self = this;
                setTimeout(function() {
                    if (!self.active) return;
                    $('#skill-check-container').removeClass('sc-flash-success');
                    if (self.currentRound >= self.config.keys.length) {
                        self.endGame(true);
                    } else {
                        self.setupRound();
                    }
                }, 500);
            } else {
                this.recordFailure();
            }
        } else {
            // Wrong key pressed
            this.recordFailure('WRONG KEY');
        }
    },

    recordFailure: function(reason) {
        this.failures++;
        $('#skill-check-failures').text(this.failures);
        $('#skill-check-container').addClass('sc-flash-fail');
        const left = this.config.maxFailures - this.failures;
        $('#skill-check-message').text((reason || 'MISSED') + (left > 0 ? ' — ' + left + ' LEFT' : ''));

        const self = this;
        setTimeout(function() {
            if (!self.active) return;
            $('#skill-check-container').removeClass('sc-flash-fail');
            if (self.failures >= self.config.maxFailures) {
                self.endGame(false);
            } else {
                self.locked = false;
            }
        }, 400);
    },

    startTimer: function() {
        const self = this;
        const totalSecs = (this.config.timeLimit / 1000).toFixed(2) + 's';
        this.timerInterval = setInterval(function() {
            if (!self.active) return;
            self.timeRemaining -= 50;
            const pct = Math.max(0, (self.timeRemaining / self.config.timeLimit) * 100);
            $('.skill-check-timer-progress').css('width', pct + '%');
            const cur = (Math.max(0, self.timeRemaining) / 1000).toFixed(2) + 's';
            $('#skill-check-time').text(cur + ' / ' + totalSecs);
            if (pct <= 25) $('.skill-check-timer-progress').addClass('danger');
            else $('.skill-check-timer-progress').removeClass('danger');
            if (self.timeRemaining <= 0) self.endGame(false);
        }, 50);
    },

    endGame: function(success) {
        if (!this.active) return;
        this.active = false;
        clearInterval(this.timerInterval);
        this.timerInterval = null;
        if (this.animFrame) cancelAnimationFrame(this.animFrame);
        this.animFrame = null;
        $('#skill-check-message').text(success ? 'BREACH SUCCESSFUL' : 'BREACH FAILED');
        const resultData = { success: success, rounds: this.currentRound, failures: this.failures };
        setTimeout(function() {
            $('#skill-check-container').fadeOut(500, function() {
                $.post('https://glitch-minigames/skillCheckResult', JSON.stringify(resultData));
            });
        }, 700);
    },

    close: function() {
        if (!this.active) return;
        this.active = false;
        clearInterval(this.timerInterval);
        this.timerInterval = null;
        if (this.animFrame) cancelAnimationFrame(this.animFrame);
        this.animFrame = null;
        $('#skill-check-container').fadeOut(300);
    }
};

window.skillCheckGame = skillCheckGame;
