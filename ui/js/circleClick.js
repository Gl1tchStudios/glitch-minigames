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

// Circle Click Minigame - Press the key when the dot is inside the target arc
// Look: CC1 Hairline (glitch-uiElements/ui/dev/ui-themes.html #circleclick) - floating,
// no panel: thin track, bold primary target, one dot riding the ring, key in the middle.

// Drawing is done in a 150 x 172 box, scaled up by CC_SCALE on screen
const CC_W = 150, CC_H = 172, CC_SCALE = 1.3, CC_R = 44;
const CC_HIT_SLACK = 4; // degrees either side of the dot that still count as inside
const CC_FLASH_MS = 350; // how long the hit / miss colour shows
const CC_END_HOLD_MS = CC_FLASH_MS + 1000; // final Hit / Too slow stays this long before the fade

// position: preset name, or { x, y } as 0-1 fractions (or 0-100 percent) of the screen,
// the centre of the ring goes there
const CC_POSITIONS = {
    'bottom':       { x: 0.5,  y: 0.80 },
    'center':       { x: 0.5,  y: 0.5 },
    'centre':       { x: 0.5,  y: 0.5 },
    'top':          { x: 0.5,  y: 0.2 },
    'left':         { x: 0.2,  y: 0.5 },
    'right':        { x: 0.8,  y: 0.5 },
    'top-left':     { x: 0.2,  y: 0.2 },
    'top-right':    { x: 0.8,  y: 0.2 },
    'bottom-left':  { x: 0.2,  y: 0.80 },
    'bottom-right': { x: 0.8,  y: 0.80 }
};

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
    results: [],
    flashState: null, // null, 'success', or 'failure'
    flashText: '',

    start: function(config) {
        console.log('[CircleClick] start() called');

        if (this.active) {
            console.log('[CircleClick] Already active, ignoring');
            return;
        }

        this.config = {
            rounds: config.rounds || 5,
            rotationSpeed: config.rotationSpeed || 2, // degrees per frame at 60 fps
            targetZoneSize: config.targetZoneSize || 45, // degrees
            maxFailures: config.maxFailures || 3,
            keys: config.keys || ['1', '2', '3', '4', '5', '6', '7', '8', '9'],
            speedIncrease: config.speedIncrease ?? 0.3, // Speed increase per round
            randomizeDirection: config.randomizeDirection !== false, // Randomize rotation direction
            timeoutRotations: config.timeoutRotations ?? 1, // Full turns per round before it counts as a miss (0 = never)
            position: config.position || window.minigamePosition || 'bottom'
        };

        this.active = true;
        this.currentRound = 0;
        this.successes = 0;
        this.failures = 0;
        this.results = [];
        this.angle = 0;
        this.flashState = null;
        this.flashText = '';
        this.flashTextColour = null;
        this.rotationSpeed = this.config.rotationSpeed;
        this.targetZoneSize = this.config.targetZoneSize;
        this.rotationDirection = 1;
        this.run = (this.run || 0) + 1;
        this.travelled = 0;
        this.busy = false;

        this.setupCanvas();
        this.applyPosition(this.config.position);

        // first frame drawn before the fade in (no stale frame from the last game),
        // and any fade still running from the last game stopped
        this.setupRound();
        this.setupKeyHandler();
        this.startRotation();
        $('#circle-click-container').stop(true, true).css({ display: 'block', opacity: 0 }).animate({ opacity: 1 }, 150);

        console.log('[CircleClick] Game started -', this.config.rounds, 'rounds');
    },

    setupCanvas: function() {
        const canvas = document.getElementById('circle-click-canvas');
        if (!canvas) return;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.round(CC_W * CC_SCALE * dpr);
        canvas.height = Math.round(CC_H * CC_SCALE * dpr);
        canvas.style.width = (CC_W * CC_SCALE) + 'px';
        canvas.style.height = (CC_H * CC_SCALE) + 'px';
        this.dpr = dpr;
    },

    // Puts the ring centre on the given screen spot
    applyPosition: function(position) {
        let pos = CC_POSITIONS.bottom;
        if (typeof position === 'string' && CC_POSITIONS[position.toLowerCase()]) {
            pos = CC_POSITIONS[position.toLowerCase()];
        } else if (position && typeof position === 'object' && position.x !== undefined && position.y !== undefined) {
            const f = function(v) { v = Number(v); return v > 1 ? v / 100 : v; };
            pos = { x: f(position.x), y: f(position.y) };
        }
        // the ring centre sits CC_W / 2 down from the top of the canvas
        $('#circle-click-container').css({
            left: (pos.x * 100) + '%',
            top: (pos.y * 100) + '%',
            bottom: 'auto',
            transform: 'translate(-50%, -' + (CC_W / 2 * CC_SCALE) + 'px)'
        });
    },

    setupRound: function() {
        this.currentRound++;

        this.currentKey = this.config.keys[Math.floor(Math.random() * this.config.keys.length)];

        if (this.currentRound === 1) {
            this.rotationDirection = 1; // always clockwise from the top (randomizeDirection is ignored)
            this.angle = 0; // every game starts at the top of the ring
        }

        this.rotationSpeed = this.config.rotationSpeed + (this.currentRound - 1) * this.config.speedIncrease;

        this.placeTarget();
        this.drawCircle();
    },

    // New target about half a turn ahead of the dot; the dot itself never jumps
    placeTarget: function() {
        const ahead = 150 + Math.random() * 60;
        const mid = this.angle + this.rotationDirection * ahead;
        this.targetZoneStart = ((mid - this.targetZoneSize / 2) % 360 + 360) % 360;
        this.travelled = 0;
        this.busy = false;
    },

    drawCircle: function() {
        const canvas = document.getElementById('circle-click-canvas');
        if (!canvas) return;

        const C = window.MinigameColors;
        const ctx = canvas.getContext('2d');
        const k = CC_SCALE * (this.dpr || 1);
        ctx.setTransform(k, 0, 0, k, 0, 0);
        ctx.clearRect(0, 0, CC_W, CC_H);

        const x = CC_W / 2, y = CC_W / 2, r = CC_R;
        const rad = function(d) { return (d - 90) * Math.PI / 180; };
        const flash = this.flashState === 'success' ? C.success : this.flashState === 'failure' ? C.failure : null;

        // dark drop shadow under the ring so it reads over bright backgrounds (sea, sky)
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.lineWidth = 8;
        ctx.stroke();
        ctx.restore();

        // thin see-through track (never the border colour: on some themes it equals primary)
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${C.textRgba}, 0.16)`;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // target arc
        ctx.save();
        ctx.shadowColor = flash || C.primary;
        ctx.shadowBlur = 12;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(x, y, r, rad(this.targetZoneStart), rad(this.targetZoneStart + this.targetZoneSize));
        ctx.strokeStyle = flash || C.primary;
        ctx.lineWidth = 5;
        ctx.stroke();
        ctx.restore();

        // the dot
        const a = rad(this.angle);
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(x + Math.cos(a) * r, y + Math.sin(a) * r, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = C.text;
        ctx.fill();
        ctx.restore();
        ctx.save();
        ctx.shadowColor = C.text;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(x + Math.cos(a) * r, y + Math.sin(a) * r, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = C.text;
        ctx.fill();
        ctx.restore();

        // key, no fill behind it
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
        ctx.shadowBlur = 10;
        ctx.fillStyle = flash || C.text;
        ctx.font = 'italic 800 30px "Barlow Condensed", "Figtree", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.currentKey || '', x, y + 1);
        ctx.restore();

        // round pips (only up to 8 so long runs stay small)
        const pips = Math.min(this.config.rounds, 8);
        const first = Math.max(0, Math.min(this.currentRound - 1, this.config.rounds - pips));
        for (let i = 0; i < pips; i++) {
            const n = first + i, res = this.results[n];
            ctx.beginPath();
            ctx.arc(x - (pips - 1) * 5 + i * 10, y + r + 14, 2.2, 0, Math.PI * 2);
            const current = n === this.currentRound - 1;
            ctx.fillStyle = res === true ? C.success
                : current ? (this.flashState === 'failure' ? C.failure : C.text) : `rgba(${C.textRgba}, 0.25)`;
            ctx.fill();
        }

        // hit / miss word under the pips
        if (this.flashText) {
            ctx.save();
            ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
            ctx.shadowBlur = 4;
            ctx.fillStyle = this.flashTextColour === 'success' ? C.success : C.failure;
            ctx.font = 'italic 800 13px "Barlow Condensed", "Figtree", sans-serif';
            if ('letterSpacing' in ctx) ctx.letterSpacing = '2px';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.flashText.toUpperCase(), x, y + r + 32);
            ctx.restore();
        }
    },

    startRotation: function() {
        const self = this;
        let last = performance.now();

        function animate(now) {
            if (!self.active) return;

            // speed is degrees per frame at 60 fps, same on every frame rate
            const frames = Math.min(3, ((now || performance.now()) - last) / (1000 / 60));
            last = now || performance.now();

            // the dot keeps moving through the hit / miss flash too
            const step = self.rotationSpeed * frames;
            self.angle = (self.angle + step * self.rotationDirection + 360) % 360;

            if (!self.busy) {
                // One full turn (default) without a press = miss
                if (self.config.timeoutRotations > 0) {
                    self.travelled += step;
                    if (self.travelled >= 360 * self.config.timeoutRotations) {
                        self.handleFailure('timeout');
                    }
                }
            }

            self.drawCircle();
            self.animationFrame = requestAnimationFrame(animate);
        }

        this.animationFrame = requestAnimationFrame(animate);
    },

    setupKeyHandler: function() {
        const self = this;

        $(document).off('keydown.circleclick');
        $(document).on('keydown.circleclick', function(e) {
            if (!self.active || self.busy || e.originalEvent && e.originalEvent.repeat) return;

            const pressedKey = /^Key[A-Z]$/.test(e.code) ? e.code.charAt(3) : e.key.toUpperCase();
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
        const d = ((this.angle - this.targetZoneStart) % 360 + 360) % 360;
        return d <= this.targetZoneSize + CC_HIT_SLACK || d >= 360 - CC_HIT_SLACK;
    },

    handleSuccess: function() {
        this.busy = true;
        this.successes++;
        this.results[this.currentRound - 1] = true;
        this.flashResult(true, 'Hit');

        if (this.currentRound >= this.config.rounds) {
            this.endGame(true); // plays the sound
            return;
        }
        playSoundSafe('sound-success');

        const self = this, run = this.run;
        setTimeout(function() {
            if (!self.active || self.run !== run) return; // closed / restarted meanwhile
            self.setupRound();
        }, CC_FLASH_MS);
    },

    handleFailure: function(reason) {
        this.busy = true;
        this.failures++;

        console.log('[CircleClick] Failure:', reason, '- Total failures:', this.failures);
        // tries left, so a miss that does not end the game reads as one
        const left = this.config.maxFailures - this.failures;
        const word = reason === 'timeout' ? 'Too slow' : reason === 'wrong_key' ? 'Wrong key' : 'Miss';
        this.flashResult(false, left > 0 ? word + ' - ' + left + ' left' : word);

        if (left <= 0) {
            this.endGame(false); // plays the sound
            return;
        }
        playSoundSafe('sound-failure');

        // same round (same key), new target ahead of the dot
        const self = this, run = this.run;
        setTimeout(function() {
            if (!self.active || self.run !== run) return; // no late fail sound after the game ended
            self.placeTarget();
        }, CC_FLASH_MS);
    },

    flashResult: function(success, text) {
        this.flashState = success ? 'success' : 'failure';
        // the word stays until the next result replaces it or the game closes
        this.flashText = text || '';
        this.flashTextColour = success ? 'success' : 'failure';

        const self = this, run = this.run;
        setTimeout(function() {
            if (self.active && self.run === run) {
                self.flashState = null;
            }
        }, CC_FLASH_MS);
    },

    endGame: function(success) {
        if (!this.active) return;
        this.active = false;

        playSoundSafe(success ? 'sound-success' : 'sound-failure');
        cancelAnimationFrame(this.animationFrame);
        $(document).off('keydown.circleclick');

        const self = this;

        // result colour on the ring; the Hit / Miss word was set by handleSuccess / handleFailure
        this.flashState = success ? 'success' : 'failure';
        this.drawCircle();

        setTimeout(function() {
            $('#circle-click-container').fadeOut(150, function() {
                $.post('https://glitch-minigames/circleClickResult', JSON.stringify({
                    success: success,
                    successes: self.successes,
                    failures: self.failures
                }));
            });
        }, CC_END_HOLD_MS);
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
