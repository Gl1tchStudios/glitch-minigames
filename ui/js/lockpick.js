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
//
// Turning the pick works like the volume knob on the smart radios (glitch-audioProps
// controls.js Knob): hold LMB and move the mouse in an arc around the lock, the pick
// turns by the same angle. Mouse wheel and A / D nudge it. Hold E, SPACE or RMB to
// put tension on the lock; if the pick sits in the hidden sweet spot when the hold
// fills, the pin sets.
//
// The lock shakes when the pick is in the sweet spot (strong) or just outside its
// edge (light). Nowhere else.
//
// Styles (config.LockpickStyle or the 6th export arg):
//   'dial'      the original tick dial
//   'arc'       floating hairline ring, orbiting pick dot
//   'dots'      floating ring of dots that light up around the pick
//   'realistic' brass pin-tumbler cylinder, steel pick and tension wrench
//   'padlock'   brass padlock + chrome shackle, steel pick and wrench in the keyway

const LOCKPICK_STYLES = {
    dial:      { w: 180, h: 180, cx: 90,  cy: 90 },
    arc:       { w: 240, h: 250, cx: 120, cy: 112 },
    dots:      { w: 240, h: 250, cx: 120, cy: 112 },
    realistic: { w: 360, h: 340, cx: 180, cy: 160 },
    padlock:   { w: 340, h: 460, cx: 170, cy: 280 }
};

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
    shakeTarget: 0,
    dragging: false,
    lastDragAngle: null,
    flashState: null,
    flashStartTime: 0,
    isTransitioning: false,
    lastFrame: 0,

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
            lockTime: config.lockTime || 350,
            speed: config.speed || 4.5,     // A / D turn speed, degrees per 16 ms frame
            style: LOCKPICK_STYLES[config.style] ? config.style : 'dial'
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
        this.shakeIntensity = 0;
        this.shakeTarget = 0;
        this.dragging = false;
        this.lastDragAngle = null;

        const s = LOCKPICK_STYLES[this.config.style];
        const canvas = document.getElementById('lockpick-canvas');
        if (canvas) {
            canvas.width = s.w;
            canvas.height = s.h;
        }
        $('#lockpick-container').attr('data-style', this.config.style);

        const self = this;
        $('#lockpick-container').css('display', 'flex').hide().fadeIn(200, function() {
            self.setupRound();
            self.setupControls();
            self.startAnimation();
        });

        console.log('[Lockpick] Game started -', this.config.rounds, 'rounds, style', this.config.style);
    },

    setupRound: function() {
        this.currentRound++;

        this.flashState = null;
        this.flashStartTime = 0;
        this.isTransitioning = false;
        this.isHolding = false;
        this.holdStartTime = 0;
        this.turnStart = 0;

        this.sweetSpotStart = Math.random() * 360;

        // Harder every lock: t goes 0 (first) -> 1 (last). Smaller sweet spot, faster
        // pick, less shake warning, shorter hold. The spot never moves within a lock: one shake point.
        const n = Math.max(1, this.config.rounds);
        const t = n > 1 ? (this.currentRound - 1) / (n - 1) : 0;
        this.sweetSpotSize = Math.max(5, this.config.sweetSpotSize * (1 - 0.6 * t));
        this.speedNow = this.config.speed * (1 + 0.7 * t);
        this.shakeNow = Math.max(10, this.config.shakeRange * (1 - 0.45 * t));
        this.lockTimeNow = Math.max(150, this.config.lockTime * (1 - 0.4 * t));

        this.angle = (this.sweetSpotStart + 180 + (Math.random() * 60 - 30)) % 360;

        if (this.keysHeld) {
            this.keysHeld.left = false;
            this.keysHeld.right = false;
        }

        console.log('[Lockpick] Round', this.currentRound, '- Sweet spot at', this.sweetSpotStart.toFixed(1), 'degrees');
    },

    // ---------- shake ----------

    // Degrees between the pick and the nearest edge of the sweet spot; 0 when inside it
    getEdgeDistance: function() {
        const half = this.sweetSpotSize / 2;
        const centre = this.sweetSpotStart + half;
        let d = Math.abs(((this.angle - centre) % 360 + 540) % 360 - 180);
        return Math.max(0, d - half);
    },

    // Light warning band just outside the spot: shakeRange counts from the spot's centre
    // (export arg), kept tight so the lock never rattles far from the spot.
    getShakeBand: function() {
        const fromEdge = (this.shakeNow || this.config.shakeRange) - this.sweetSpotSize / 2;
        return Math.max(3, Math.min(fromEdge, Math.max(6, this.sweetSpotSize * 0.5)));
    },

    updateShake: function(dt) {
        const d = this.getEdgeDistance();
        const band = this.getShakeBand();
        if (d === 0) {
            // inside: strong, a little stronger towards the middle
            const half = this.sweetSpotSize / 2;
            const centre = this.sweetSpotStart + half;
            const off = Math.abs(((this.angle - centre) % 360 + 540) % 360 - 180);
            this.shakeTarget = 2.6 + 1.4 * (1 - off / Math.max(1, half));
        } else if (d <= band) {
            this.shakeTarget = 0.6 + 0.8 * (1 - d / band);
        } else {
            this.shakeTarget = 0;
        }
        // instant attack, fast release: a quick pass over the spot still shows a visible
        // flick, and it stops within ~130 ms of leaving it
        if (this.shakeTarget >= this.shakeIntensity) {
            this.shakeIntensity = this.shakeTarget;
        } else {
            this.shakeIntensity = Math.max(this.shakeTarget, this.shakeIntensity - dt * 0.03);
        }
    },

    shakeOffset: function(now) {
        const a = this.isTransitioning ? 0 : this.shakeIntensity;
        if (a <= 0.01) return { x: 0, y: 0 };
        // two fast sines plus a little noise: never lands on ~0 for a whole frame
        return {
            x: a * (0.75 * Math.sin(now / 9) + 0.25 * (Math.random() * 2 - 1)),
            y: a * (0.75 * Math.cos(now / 13) + 0.25 * (Math.random() * 2 - 1))
        };
    },

    isInSweetSpot: function() {
        return this.getEdgeDistance() === 0;
    },

    holdProgress: function() {
        if (!this.isHolding) return 0;
        return Math.min(1, (Date.now() - this.holdStartTime) / (this.lockTimeNow || this.config.lockTime));
    },

    flashOpacity: function(duration) {
        if (!this.flashState) return 0;
        return Math.max(0, 1 - (Date.now() - this.flashStartTime) / (duration || 400));
    },

    // ---------- drawing ----------

    drawLockpick: function() {
        const canvas = document.getElementById('lockpick-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const s = LOCKPICK_STYLES[this.config.style];
        const now = performance.now();
        const o = this.shakeOffset(now);

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.translate(o.x, o.y);
        const draw = this['draw_' + this.config.style] || this.draw_dial;
        draw.call(this, ctx, s.cx, s.cy, now);
        ctx.restore();

        if (this.config.style !== 'dial') this.drawPips(ctx, s.cx, canvas.height - 16);
    },

    // Round pips + strike marks under the lock (new styles)
    drawPips: function(ctx, cx, y) {
        const C = window.MinigameColors;
        const n = this.config.rounds, f = this.config.maxFailures;
        const gap = 14;
        const total = (n + f) * gap + 10;
        let x = cx - total / 2 + gap / 2;
        for (let i = 0; i < n; i++, x += gap) {
            ctx.beginPath();
            ctx.arc(x, y, 3.2, 0, Math.PI * 2);
            if (i < this.successes) {
                ctx.fillStyle = C.success;
                ctx.fill();
            } else {
                ctx.strokeStyle = i === this.successes ? `rgba(${C.textRgba}, 0.9)` : `rgba(${C.textRgba}, 0.3)`;
                ctx.lineWidth = 1.4;
                ctx.stroke();
            }
        }
        x += 10;
        for (let i = 0; i < f; i++, x += gap) {
            const used = i < this.failures;
            ctx.strokeStyle = used ? C.failure : `rgba(${C.textRgba}, 0.22)`;
            ctx.lineWidth = 1.6;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(x - 3, y - 3); ctx.lineTo(x + 3, y + 3);
            ctx.moveTo(x + 3, y - 3); ctx.lineTo(x - 3, y + 3);
            ctx.stroke();
        }
    },

    // Original tick dial
    draw_dial: function(ctx, centerX, centerY) {
        const C = window.MinigameColors;
        const outerRadius = 70;
        const innerRadius = 50;
        const tickLength = 8;

        ctx.beginPath();
        ctx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${C.borderRgba}, 0.8)`;
        ctx.lineWidth = 3;
        ctx.stroke();

        const numTicks = 36;
        for (let i = 0; i < numTicks; i++) {
            const tickAngle = (i * (360 / numTicks) - 90) * Math.PI / 180;
            const isLongTick = i % 3 === 0;
            const tickLen = isLongTick ? tickLength + 3 : tickLength;
            ctx.beginPath();
            ctx.moveTo(centerX + Math.cos(tickAngle) * (outerRadius - tickLen), centerY + Math.sin(tickAngle) * (outerRadius - tickLen));
            ctx.lineTo(centerX + Math.cos(tickAngle) * outerRadius, centerY + Math.sin(tickAngle) * outerRadius);
            ctx.strokeStyle = isLongTick ? `rgba(${C.textRgba}, 0.9)` : `rgba(${C.textSecondaryRgba}, 0.6)`;
            ctx.lineWidth = isLongTick ? 2 : 1;
            ctx.stroke();
        }

        ctx.beginPath();
        ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${C.backgroundRgba}, 0.9)`;
        ctx.fill();
        ctx.strokeStyle = `rgba(${C.borderRgba}, 0.8)`;
        ctx.lineWidth = 2;
        ctx.stroke();

        const flash = this.flashOpacity(400) * 0.6;
        if (flash > 0) {
            ctx.beginPath();
            ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${this.flashState === 'success' ? C.successRgba : C.failureRgba}, ${flash})`;
            ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${C.textSecondaryRgba}, 0.8)`;
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
        ctx.strokeStyle = C.text;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.restore();

        if (this.isHolding) {
            ctx.beginPath();
            ctx.arc(centerX, centerY, 15, -Math.PI / 2, -Math.PI / 2 + (this.holdProgress() * Math.PI * 2));
            ctx.strokeStyle = C.primary;
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.stroke();
        }
    },

    // Floating hairline ring, a dot riding it as the pick, hold fills a small inner ring
    draw_arc: function(ctx, cx, cy) {
        const C = window.MinigameColors;
        const R = 78;
        const a = (this.angle - 90) * Math.PI / 180;
        const flash = this.flashOpacity(450);
        const flashRgb = this.flashState === 'success' ? C.successRgba : C.failureRgba;

        // soft dark halo so it reads on any background, no box
        const g = ctx.createRadialGradient(cx, cy, R - 30, cx, cy, R + 26);
        g.addColorStop(0, 'rgba(0,0,0,0)');
        g.addColorStop(0.55, 'rgba(0,0,0,0.28)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(cx, cy, R + 26, 0, Math.PI * 2); ctx.fill();

        // hairline ring
        ctx.beginPath();
        ctx.arc(cx, cy, R, 0, Math.PI * 2);
        ctx.strokeStyle = flash > 0 ? `rgba(${flashRgb}, ${0.35 + 0.6 * flash})` : `rgba(${C.textRgba}, 0.28)`;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // four quiet cardinal marks
        ctx.strokeStyle = `rgba(${C.textRgba}, 0.35)`;
        ctx.lineWidth = 1;
        for (let i = 0; i < 4; i++) {
            const t = i * Math.PI / 2;
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(t) * (R + 6), cy + Math.sin(t) * (R + 6));
            ctx.lineTo(cx + Math.cos(t) * (R + 11), cy + Math.sin(t) * (R + 11));
            ctx.stroke();
        }

        // short comet trail behind the pick
        ctx.beginPath();
        ctx.arc(cx, cy, R, a - 0.38, a);
        ctx.strokeStyle = `rgba(${C.primaryRgba}, 0.55)`;
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx, cy, R, a, a + 0.38);
        ctx.stroke();

        // faint spoke from the centre
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * 26, cy + Math.sin(a) * 26);
        ctx.lineTo(cx + Math.cos(a) * (R - 8), cy + Math.sin(a) * (R - 8));
        ctx.strokeStyle = `rgba(${C.textRgba}, 0.18)`;
        ctx.lineWidth = 1;
        ctx.stroke();

        // the pick
        const px = cx + Math.cos(a) * R, py = cy + Math.sin(a) * R;
        ctx.save();
        ctx.shadowColor = C.primary;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(px, py, 5.5, 0, Math.PI * 2);
        ctx.fillStyle = C.text;
        ctx.fill();
        ctx.restore();
        ctx.beginPath();
        ctx.arc(px, py, 5.5, 0, Math.PI * 2);
        ctx.strokeStyle = C.primary;
        ctx.lineWidth = 2;
        ctx.stroke();

        // centre: hold ring
        ctx.beginPath();
        ctx.arc(cx, cy, 18, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${C.textRgba}, 0.14)`;
        ctx.lineWidth = 3;
        ctx.stroke();
        const hp = this.holdProgress();
        if (hp > 0) {
            ctx.beginPath();
            ctx.arc(cx, cy, 18, -Math.PI / 2, -Math.PI / 2 + hp * Math.PI * 2);
            ctx.strokeStyle = C.primary;
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.stroke();
        }
        ctx.beginPath();
        ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = flash > 0 ? `rgba(${flashRgb}, 1)` : `rgba(${C.textRgba}, 0.6)`;
        ctx.fill();
    },

    // Floating ring of dots: the ones near the pick light up, the pick is a bright bar
    draw_dots: function(ctx, cx, cy) {
        const C = window.MinigameColors;
        const R = 76, N = 60;
        const flash = this.flashOpacity(450);
        const flashRgb = this.flashState === 'success' ? C.successRgba : C.failureRgba;
        const hp = this.holdProgress();

        const g = ctx.createRadialGradient(cx, cy, 10, cx, cy, R + 24);
        g.addColorStop(0, 'rgba(0,0,0,0.30)');
        g.addColorStop(0.75, 'rgba(0,0,0,0.20)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(cx, cy, R + 24, 0, Math.PI * 2); ctx.fill();

        for (let i = 0; i < N; i++) {
            const deg = i * 360 / N;
            let d = Math.abs(((deg - this.angle) % 360 + 540) % 360 - 180);
            const near = Math.max(0, 1 - d / 40);
            const t = (deg - 90) * Math.PI / 180;
            const r = 1.6 + near * 1.6;
            ctx.beginPath();
            ctx.arc(cx + Math.cos(t) * R, cy + Math.sin(t) * R, r, 0, Math.PI * 2);
            if (flash > 0) ctx.fillStyle = `rgba(${flashRgb}, ${0.3 + 0.7 * flash})`;
            else if (near > 0) ctx.fillStyle = `rgba(${C.primaryRgba}, ${0.3 + 0.7 * near})`;
            else ctx.fillStyle = `rgba(${C.textRgba}, 0.22)`;
            ctx.fill();
        }

        // the pick: a short bright bar crossing the ring
        const a = (this.angle - 90) * Math.PI / 180;
        ctx.save();
        ctx.shadowColor = C.primary;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * (R - 12), cy + Math.sin(a) * (R - 12));
        ctx.lineTo(cx + Math.cos(a) * (R + 12), cy + Math.sin(a) * (R + 12));
        ctx.strokeStyle = C.text;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.restore();

        // centre: the current pin as a capsule that rises with the hold
        const pw = 12, ph = 34;
        const top = cy - ph / 2;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(cx - pw / 2, top, pw, ph, 6); else ctx.rect(cx - pw / 2, top, pw, ph);
        ctx.strokeStyle = `rgba(${C.textRgba}, 0.3)`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        if (hp > 0 || flash > 0) {
            const fill = flash > 0 && this.flashState === 'success' ? 1 : hp;
            const fh = Math.max(4, (ph - 4) * fill);
            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(cx - pw / 2 + 2, top + ph - 2 - fh, pw - 4, fh, 4); else ctx.rect(cx - pw / 2 + 2, top + ph - 2 - fh, pw - 4, fh);
            ctx.fillStyle = flash > 0 ? `rgba(${flashRgb}, 1)` : C.primary;
            ctx.fill();
        }
    },

    // Realistic: steel housing, brass plug with a keyway, tension wrench, steel pick.
    // Tension turns the plug a little (same for right and wrong spots, so it gives
    // nothing away); a set pin snaps it round.
    draw_realistic: function(ctx, cx, cy, now) {
        const C = window.MinigameColors;
        const Rh = 96, Rp = 64;
        const hp = this.holdProgress();
        let plug = hp * 18;
        if (this.flashState === 'success') {
            const k = Math.min(1, (Date.now() - this.flashStartTime) / 220);
            plug = 18 + (90 - 18) * (1 - Math.pow(1 - k, 3));
        } else if (this.flashState === 'failure') {
            plug = 18 * (1 - Math.min(1, (Date.now() - this.flashStartTime) / 200));
        }
        const plugRad = plug * Math.PI / 180;

        // drop shadow under the housing
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.65)';
        ctx.shadowBlur = 22;
        ctx.shadowOffsetY = 8;
        ctx.beginPath(); ctx.arc(cx, cy, Rh, 0, Math.PI * 2);
        ctx.fillStyle = '#2a2c30';
        ctx.fill();
        ctx.restore();

        // housing: brushed steel ring with a bevel
        let g = ctx.createLinearGradient(cx - Rh, cy - Rh, cx + Rh, cy + Rh);
        g.addColorStop(0, '#d9dde2');
        g.addColorStop(0.35, '#8e949c');
        g.addColorStop(0.55, '#c6cbd1');
        g.addColorStop(1, '#4d5258');
        ctx.beginPath(); ctx.arc(cx, cy, Rh, 0, Math.PI * 2);
        ctx.fillStyle = g; ctx.fill();
        // brushed rings
        for (let r = Rp + 8; r < Rh - 3; r += 2.2) {
            ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255,255,255,${0.035 + 0.03 * Math.sin(r * 1.7)})`;
            ctx.lineWidth = 1; ctx.stroke();
        }
        ctx.beginPath(); ctx.arc(cx, cy, Rh - 1, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 2; ctx.stroke();
        // inner bevel into the plug
        g = ctx.createLinearGradient(cx, cy - Rp - 8, cx, cy + Rp + 8);
        g.addColorStop(0, '#3a3d42'); g.addColorStop(1, '#e3e6ea');
        ctx.beginPath(); ctx.arc(cx, cy, Rp + 7, 0, Math.PI * 2);
        ctx.fillStyle = g; ctx.fill();

        // plug: brass, turns with tension
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(plugRad);
        g = ctx.createRadialGradient(-Rp * 0.35, -Rp * 0.4, 4, 0, 0, Rp);
        g.addColorStop(0, '#f6dc8e');
        g.addColorStop(0.45, '#c9a14a');
        g.addColorStop(1, '#7a5a1e');
        ctx.beginPath(); ctx.arc(0, 0, Rp, 0, Math.PI * 2);
        ctx.fillStyle = g; ctx.fill();
        ctx.strokeStyle = 'rgba(60,40,10,0.7)'; ctx.lineWidth = 1.5; ctx.stroke();
        // shear line + pin holes along the top
        ctx.beginPath(); ctx.arc(0, 0, Rp - 6, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(90,62,16,0.35)'; ctx.lineWidth = 1; ctx.stroke();
        for (let i = 0; i < 5; i++) {
            const x = -24 + i * 12;
            ctx.beginPath(); ctx.arc(x, -Rp + 12, 3, 0, Math.PI * 2);
            const set = i < Math.round(5 * this.successes / Math.max(1, this.config.rounds));
            ctx.fillStyle = set ? '#3b2a0c' : 'rgba(70,48,12,0.55)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,235,170,0.35)'; ctx.lineWidth = 0.8; ctx.stroke();
        }
        // keyway: the classic slot with a wavy profile
        ctx.beginPath();
        ctx.moveTo(-5, -30);
        ctx.quadraticCurveTo(0, -36, 5, -30);
        ctx.lineTo(4, -12); ctx.lineTo(8, -4); ctx.lineTo(3, 6); ctx.lineTo(6, 16);
        ctx.lineTo(3, 32); ctx.lineTo(-3, 32); ctx.lineTo(-6, 18); ctx.lineTo(-2, 6);
        ctx.lineTo(-7, -4); ctx.lineTo(-4, -14);
        ctx.closePath();
        g = ctx.createLinearGradient(0, -36, 0, 32);
        g.addColorStop(0, '#050505'); g.addColorStop(1, '#1b1408');
        ctx.fillStyle = g; ctx.fill();
        ctx.strokeStyle = 'rgba(255,230,160,0.35)'; ctx.lineWidth = 1; ctx.stroke();

        // tension wrench: sits in the bottom of the keyway, bent out to the lower left
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(0, 22); ctx.lineTo(0, 46); ctx.lineTo(-62, 104);
        ctx.strokeStyle = '#1c1d20'; ctx.lineWidth = 9; ctx.stroke();
        ctx.strokeStyle = '#8d939a'; ctx.lineWidth = 7; ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.restore();

        // hold = tension gauge: a thin arc around the housing
        if (hp > 0) {
            ctx.beginPath();
            ctx.arc(cx, cy, Rh + 7, Math.PI * 0.5, Math.PI * 0.5 + hp * Math.PI * 0.6);
            ctx.strokeStyle = `rgba(${C.primaryRgba}, 0.9)`;
            ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.stroke();
        }

        // the pick: steel shaft entering the keyway from the pick angle, hook at the tip
        const a = (this.angle - 90) * Math.PI / 180;
        const ux = Math.cos(a), uy = Math.sin(a);
        const tipX = cx + ux * 6, tipY = cy + uy * 6;
        const baseX = cx + ux * (Rh + 58), baseY = cy + uy * (Rh + 58);
        const gripX = cx + ux * (Rh + 14), gripY = cy + uy * (Rh + 14);
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.55)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetX = 3; ctx.shadowOffsetY = 4;
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(gripX, gripY); ctx.lineTo(tipX, tipY);
        ctx.strokeStyle = '#2b2d31'; ctx.lineWidth = 4.6; ctx.stroke();
        ctx.restore();
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(gripX, gripY); ctx.lineTo(tipX, tipY);
        ctx.strokeStyle = '#b9bfc6'; ctx.lineWidth = 3.2; ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 1; ctx.stroke();
        // hook
        const nx = -uy, ny = ux;
        ctx.beginPath();
        ctx.moveTo(tipX, tipY);
        ctx.quadraticCurveTo(tipX - ux * 4 + nx * 2, tipY - uy * 4 + ny * 2, tipX - ux * 1 + nx * 8, tipY - uy * 1 + ny * 8);
        ctx.strokeStyle = '#b9bfc6'; ctx.lineWidth = 3; ctx.stroke();
        // handle: black rubber grip, clipped by the canvas edge if needed
        ctx.beginPath(); ctx.moveTo(gripX, gripY); ctx.lineTo(baseX, baseY);
        ctx.strokeStyle = '#0c0d0f'; ctx.lineWidth = 13; ctx.stroke();
        ctx.strokeStyle = '#1d1f23'; ctx.lineWidth = 10; ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.lineWidth = 2.5; ctx.stroke();

        // failure: a quick red glint on the shear line
        const flash = this.flashOpacity(380);
        if (flash > 0 && this.flashState === 'failure') {
            ctx.beginPath(); ctx.arc(cx, cy, Rp + 3, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(${C.failureRgba}, ${0.8 * flash})`;
            ctx.lineWidth = 3; ctx.stroke();
        }
    },

    // Padlock: brass body, chrome shackle, steel pick + wrench in the keyway. (cx, cy) is
    // the keyway centre. The shackle lifts a little per set pin and pops on the last one;
    // tension turns the plug the same amount on right and wrong spots.
    draw_padlock: function(ctx, cx, cy) {
        const C = window.MinigameColors;
        const hp = this.holdProgress();
        const bw = 190, bh = 170, top = cy - 100;
        const rr = (x, y, w, h, r) => { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); };

        // plug turn: tension, then a snap on a set pin
        let plug = hp * 16;
        if (this.flashState === 'success') {
            const k = Math.min(1, (Date.now() - this.flashStartTime) / 220);
            plug = 16 + (90 - 16) * (1 - Math.pow(1 - k, 3));
        } else if (this.flashState === 'failure') {
            plug = 16 * (1 - Math.min(1, (Date.now() - this.flashStartTime) / 200));
        }
        // shackle lift: 6 px per set pin, pops up on the last one
        let lift = 6 * Math.min(this.successes, this.config.rounds);
        if (this.successes >= this.config.rounds && this.flashState === 'success') {
            const k = Math.min(1, (Date.now() - this.flashStartTime) / 260);
            lift += 22 * (1 - Math.pow(1 - k, 3));
        }

        // shackle (behind the body)
        const arcY = top - 48 - lift, sy = top + 30 - lift;
        const shackle = () => {
            ctx.beginPath();
            ctx.moveTo(cx - 62, sy); ctx.lineTo(cx - 62, arcY);
            ctx.arc(cx, arcY, 62, Math.PI, 0);
            ctx.lineTo(cx + 62, sy);
        };
        ctx.lineCap = 'butt';
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 4;
        shackle(); ctx.strokeStyle = '#6d737a'; ctx.lineWidth = 24; ctx.stroke();
        ctx.restore();
        let g = ctx.createLinearGradient(cx - 74, 0, cx + 74, 0);
        g.addColorStop(0, '#5b6168'); g.addColorStop(0.18, '#f2f4f6'); g.addColorStop(0.32, '#9aa1a8');
        g.addColorStop(0.5, '#e6e9ec'); g.addColorStop(0.68, '#8d949b'); g.addColorStop(0.84, '#eef0f2'); g.addColorStop(1, '#565c63');
        shackle(); ctx.strokeStyle = g; ctx.lineWidth = 20; ctx.stroke();

        // body: brushed brass block
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 10;
        rr(cx - bw / 2, top, bw, bh, 22); ctx.fillStyle = '#7a5a1e'; ctx.fill();
        ctx.restore();
        g = ctx.createLinearGradient(cx - bw / 2, top, cx + bw / 2, top + bh);
        g.addColorStop(0, '#f3d98c'); g.addColorStop(0.35, '#c99f45'); g.addColorStop(0.7, '#a77f2e'); g.addColorStop(1, '#6f5019');
        rr(cx - bw / 2, top, bw, bh, 22); ctx.fillStyle = g; ctx.fill();
        rr(cx - bw / 2 + 6, top + 6, bw - 12, bh - 12, 17);
        ctx.strokeStyle = 'rgba(255,240,190,0.35)'; ctx.lineWidth = 1.5; ctx.stroke();
        for (let x = cx - bw / 2 + 10; x < cx + bw / 2 - 10; x += 3) {
            ctx.strokeStyle = `rgba(255,240,200,${0.03 + 0.03 * Math.sin(x * 0.9)})`; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(x, top + 10); ctx.lineTo(x, top + bh - 10); ctx.stroke();
        }

        // plug + keyway + wrench, turning together
        const pr = 34;
        g = ctx.createLinearGradient(cx, cy - pr - 6, cx, cy + pr + 6);
        g.addColorStop(0, '#4a3510'); g.addColorStop(1, '#f6e2a4');
        ctx.beginPath(); ctx.arc(cx, cy, pr + 5, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(plug * Math.PI / 180);
        g = ctx.createRadialGradient(-10, -12, 3, 0, 0, pr);
        g.addColorStop(0, '#fbe7a6'); g.addColorStop(0.5, '#d1aa52'); g.addColorStop(1, '#86641f');
        ctx.beginPath(); ctx.arc(0, 0, pr, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-3, -22); ctx.quadraticCurveTo(0, -26, 3, -22); ctx.lineTo(3, -8); ctx.lineTo(6, -2); ctx.lineTo(2, 6); ctx.lineTo(4, 20);
        ctx.lineTo(-3, 20); ctx.lineTo(-5, 8); ctx.lineTo(-2, 0); ctx.lineTo(-5, -8); ctx.closePath();
        ctx.fillStyle = '#080604'; ctx.fill();
        ctx.strokeStyle = 'rgba(255,230,160,0.35)'; ctx.lineWidth = 1; ctx.stroke();
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.moveTo(0, 16); ctx.lineTo(0, 30); ctx.lineTo(48, 70);
        ctx.strokeStyle = '#1c1d20'; ctx.lineWidth = 8; ctx.stroke();
        ctx.strokeStyle = '#8d939a'; ctx.lineWidth = 6; ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 1.3; ctx.stroke();
        ctx.restore();

        // failure: red glint round the plug
        const flash = this.flashOpacity(380);
        if (flash > 0 && this.flashState === 'failure') {
            ctx.beginPath(); ctx.arc(cx, cy, pr + 4, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(${C.failureRgba}, ${0.85 * flash})`; ctx.lineWidth = 3; ctx.stroke();
        }

        // the pick, entering the keyway from the pick angle
        const a = (this.angle - 90) * Math.PI / 180, ux = Math.cos(a), uy = Math.sin(a);
        const tipX = cx + ux * 4, tipY = cy + uy * 4;
        const gx = cx + ux * 92, gy = cy + uy * 92, bx = cx + ux * 138, by = cy + uy * 138;
        ctx.lineCap = 'round';
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 6; ctx.shadowOffsetX = 3; ctx.shadowOffsetY = 4;
        ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(tipX, tipY);
        ctx.strokeStyle = '#2b2d31'; ctx.lineWidth = 4.4; ctx.stroke();
        ctx.restore();
        ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(tipX, tipY);
        ctx.strokeStyle = '#bcc2c9'; ctx.lineWidth = 3; ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 1; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(bx, by);
        ctx.strokeStyle = '#0c0d0f'; ctx.lineWidth = 13; ctx.stroke();
        ctx.strokeStyle = '#1d1f23'; ctx.lineWidth = 10; ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.lineWidth = 2.5; ctx.stroke();

        // tension gauge down the right edge
        const gxr = cx + bw / 2 + 16, gyb = top + bh - 10, gh = bh - 20;
        ctx.lineCap = 'round'; ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.beginPath(); ctx.moveTo(gxr, gyb); ctx.lineTo(gxr, gyb - gh); ctx.stroke();
        if (hp > 0) {
            ctx.strokeStyle = C.primary;
            ctx.beginPath(); ctx.moveTo(gxr, gyb); ctx.lineTo(gxr, gyb - hp * gh); ctx.stroke();
        }
    },

    // ---------- loop + input ----------

    startAnimation: function() {
        const self = this;
        this.lastFrame = performance.now();

        function animate(ts) {
            if (!self.active) return;
            const now = ts || performance.now();
            const dt = Math.min(50, now - self.lastFrame);
            self.lastFrame = now;

            if (!self.isTransitioning) {
                // A / D turn the pick (not while tension is on)
                if (!self.isHolding && self.keysHeld) {
                    const step = (self.speedNow || self.config.speed) * 0.6 * dt / 16.67;
                    if (self.keysHeld.left) self.turnPick(-step);
                    if (self.keysHeld.right) self.turnPick(step);
                }
                self.updateShake(dt);

                if (self.isHolding && Date.now() - self.holdStartTime >= (self.lockTimeNow || self.config.lockTime)) {
                    self.attemptLock();
                }
            } else {
                self.shakeIntensity = 0;
            }

            self.drawLockpick();
            self.animationFrame = requestAnimationFrame(animate);
        }

        this.animationFrame = requestAnimationFrame(animate);
    },

    turnPick: function(deg) {
        this.angle = ((this.angle + deg) % 360 + 360) % 360;
    },

    // Mouse angle around the lock centre, degrees (0 = straight up, clockwise positive),
    // and the distance from it in px
    mouseAngle: function(e) {
        const canvas = document.getElementById('lockpick-canvas');
        const r = canvas.getBoundingClientRect();
        const s = LOCKPICK_STYLES[this.config.style];
        const sx = r.width / canvas.width, sy = r.height / canvas.height;
        const dx = e.clientX - (r.left + s.cx * sx);
        const dy = e.clientY - (r.top + s.cy * sy);
        return { a: Math.atan2(dx, -dy) * 180 / Math.PI, dist: Math.sqrt(dx * dx + dy * dy) };
    },

    startHold: function() {
        if (this.isHolding || this.isTransitioning) return;
        this.isHolding = true;
        this.holdStartTime = Date.now();
    },

    endHold: function() {
        this.isHolding = false;
        this.holdStartTime = 0;
    },

    setupControls: function() {
        const self = this;
        const EVENTS = 'keydown.lockpick keyup.lockpick mousemove.lockpick mousedown.lockpick mouseup.lockpick wheel.lockpick contextmenu.lockpick';
        $(document).off(EVENTS);
        this.events = EVENTS;

        this.keysHeld = { left: false, right: false };
        this.dragging = false;
        this.lastDragAngle = null;

        $(document).on('keydown.lockpick', function(e) {
            if (!self.active) return;
            if (e.code === 'KeyA' || e.code === 'ArrowLeft') { self.keysHeld.left = true; e.preventDefault(); }
            if (e.code === 'KeyD' || e.code === 'ArrowRight') { self.keysHeld.right = true; e.preventDefault(); }
            if (e.code === 'KeyE' || e.code === 'Space') { self.startHold(); e.preventDefault(); }
        });

        $(document).on('keyup.lockpick', function(e) {
            if (!self.active) return;
            if (e.code === 'KeyA' || e.code === 'ArrowLeft') self.keysHeld.left = false;
            if (e.code === 'KeyD' || e.code === 'ArrowRight') self.keysHeld.right = false;
            if (e.code === 'KeyE' || e.code === 'Space') self.endHold();
        });

        // LMB: grab the pick and turn it like a knob, anywhere on screen
        $(document).on('mousedown.lockpick', function(e) {
            if (!self.active) return;
            if (e.button === 0) {
                self.dragging = true;
                const m = self.mouseAngle(e);
                self.lastDragAngle = m.dist > 12 ? m.a : null;
                $('#lockpick-container').addClass('dragging');
                e.preventDefault();
            } else if (e.button === 2) {
                self.startHold();
                e.preventDefault();
            }
        });

        $(document).on('mousemove.lockpick', function(e) {
            if (!self.active || !self.dragging) return;
            const m = self.mouseAngle(e);
            // right on the centre the angle jumps about: ignore it and pick up again outside
            if (m.dist <= 12) { self.lastDragAngle = null; return; }
            if (self.lastDragAngle !== null && !self.isHolding && !self.isTransitioning) {
                let d = m.a - self.lastDragAngle;
                if (d > 180) d -= 360; else if (d < -180) d += 360;   // crossing the bottom seam
                self.turnPick(d);
            }
            self.lastDragAngle = m.a;
        });

        $(document).on('mouseup.lockpick', function(e) {
            if (!self.active) return;
            if (e.button === 0) {
                self.dragging = false;
                self.lastDragAngle = null;
                $('#lockpick-container').removeClass('dragging');
            } else if (e.button === 2) {
                self.endHold();
            }
            e.preventDefault();
        });

        $(document).on('wheel.lockpick', function(e) {
            if (!self.active || self.isHolding || self.isTransitioning) return;
            const dy = e.originalEvent ? e.originalEvent.deltaY : 0;
            self.turnPick(dy < 0 ? -2 : 2);
        });

        $(document).on('contextmenu.lockpick', function(e) { e.preventDefault(); });
    },

    unbind: function() {
        cancelAnimationFrame(this.animationFrame);
        $(document).off(this.events || 'keydown.lockpick keyup.lockpick mousemove.lockpick mousedown.lockpick mouseup.lockpick wheel.lockpick contextmenu.lockpick');
        this.dragging = false;
        this.lastDragAngle = null;
        $('#lockpick-container').removeClass('dragging');
    },

    attemptLock: function() {
        if (this.isTransitioning) return;

        this.isTransitioning = true;
        const inSpot = this.isInSweetSpot();
        this.isHolding = false;
        this.holdStartTime = 0;

        if (inSpot) {
            this.handleSuccess();
        } else {
            this.handleFailure();
        }
    },

    handleSuccess: function() {
        this.successes++;
        this.flashState = 'success';
        this.flashStartTime = Date.now();

        const self = this;
        setTimeout(function() {
            if (self.currentRound >= self.config.rounds) {
                // Final round: endGame plays the sound (avoid double).
                self.endGame(true);
            } else {
                playSoundSafe('sound-success');
                self.setupRound();
            }
        }, 280);
    },

    handleFailure: function() {
        this.failures++;
        this.flashState = 'failure';
        this.flashStartTime = Date.now();

        console.log('[Lockpick] Failed - Total failures:', this.failures);

        const self = this;
        setTimeout(function() {
            if (self.failures >= self.config.maxFailures) {
                // Final failure: endGame plays the sound (avoid double).
                self.endGame(false);
            } else {
                playSoundSafe('sound-failure');
                // the spot stays where it is: only the pick goes back across the lock
                self.angle = (self.sweetSpotStart + 180 + (Math.random() * 60 - 30)) % 360;
                self.flashState = null;
                self.isTransitioning = false;
            }
        }, 320);
    },

    endGame: function(success) {
        if (!this.active) return;
        this.active = false;
        this.isTransitioning = true;

        playSoundSafe(success ? 'sound-success' : 'sound-failure');

        const self = this;
        this.flashState = success ? 'success' : 'failure';
        this.flashStartTime = Date.now();

        // keep drawing for the end flash, then stop
        const until = Date.now() + 700;
        cancelAnimationFrame(this.animationFrame);
        $(document).off(this.events);
        (function tail() {
            self.drawLockpick();
            if (Date.now() < until && !self.active) self.animationFrame = requestAnimationFrame(tail);
        })();

        setTimeout(function() {
            self.unbind();
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
        this.unbind();
        $('#lockpick-container').hide();
        $.post('https://glitch-minigames/lockpickClose', JSON.stringify({}));
    }
};

window.lockpickGame = lockpickGame;

console.log('[Lockpick] Loaded');
