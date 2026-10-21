// Glitch Minigames - Carrier Tune
//
// An oscilloscope shows the target signal (warning colour) and the player's carrier
// (theme colour). Change frequency (A / D) and amplitude (W / S), or click the
// buttons, until the waves sit on top of each other, then hold them there to lock.
// Lock enough signals before the TTL runs out. No strikes: time is the only limit.
//
// Config (merged + clamped in Lua, StartCarrierTuneGame):
//   locks, timeLimit, holdTime, holdDecay ('drain' | 'reset'), freqTolerance, ampTolerance,
//   freqRange { min, max }, ampRange { min, max }, freqStep, ampStep, drift (0-1), noise, scroll, title

(function () {
    var K = window.HackKit;
    var W = 600, H = 200, MID = H / 2;
    var REPEAT_MS = 90, FIRST_REPEAT_MS = 260;

    var cfg = null, S = null, run = null, active = false;

    function range(r, lo, hi, dmin, dmax) {
        var a = K.num(r && (r.min !== undefined ? r.min : r[0]), dmin);
        var b = K.num(r && (r.max !== undefined ? r.max : r[1]), dmax);
        a = K.clamp(a, lo, hi); b = K.clamp(b, lo, hi);
        if (b - a < (hi - lo) * 0.1) { a = dmin; b = dmax; }
        return { min: Math.min(a, b), max: Math.max(a, b) };
    }

    function readConfig(c) {
        c = c || {};
        return {
            locks: K.clamp(Math.floor(K.num(c.locks, 5)), 1, 10),
            timeLimit: Math.max(5000, K.num(c.timeLimit, 40000)),
            holdTime: Math.max(200, K.num(c.holdTime, 1500)),
            holdDecay: c.holdDecay === 'reset' ? 'reset' : 'drain',
            freqTolerance: K.clamp(K.num(c.freqTolerance, 0.15), 0.02, 2),
            ampTolerance: K.clamp(K.num(c.ampTolerance, 0.08), 0.01, 0.5),
            freqRange: range(c.freqRange, 0.5, 12, 1, 6),
            ampRange: range(c.ampRange, 0.05, 1, 0.2, 1),
            freqStep: K.clamp(K.num(c.freqStep, 0.1), 0.01, 1),
            ampStep: K.clamp(K.num(c.ampStep, 0.05), 0.01, 0.25),
            drift: K.clamp(K.num(c.drift, 0), 0, 1),
            noise: c.noise === true,
            scroll: c.scroll !== false,
            title: c.title ? String(c.title) : 'CARRIER TUNE'
        };
    }

    function between(r) { return r.min + Math.random() * (r.max - r.min); }
    function snap(v, step) { return Math.round(v / step) * step; }

    // a target far enough from the carrier that no lock starts already matched
    function newTarget() {
        for (var i = 0; i < 40; i++) {
            var tf = between(cfg.freqRange), ta = between(cfg.ampRange);
            if (Math.abs(tf - S.cf) > cfg.freqTolerance * 4 || Math.abs(ta - S.ca) > cfg.ampTolerance * 4) {
                S.tf = tf; S.ta = ta; return;
            }
        }
        S.tf = cfg.freqRange.min + cfg.freqRange.max - S.cf;
        S.ta = cfg.ampRange.min + cfg.ampRange.max - S.ca;
    }

    function inTune() {
        return Math.abs(S.cf - S.tf) <= cfg.freqTolerance && Math.abs(S.ca - S.ta) <= cfg.ampTolerance;
    }

    function bars() {
        var score = Math.max(Math.abs(S.cf - S.tf) / cfg.freqTolerance, Math.abs(S.ca - S.ta) / cfg.ampTolerance);
        return score <= 1 ? 5 : score <= 2 ? 4 : score <= 4 ? 3 : score <= 8 ? 2 : 1;
    }

    // ---- drawing -------------------------------------------------------------
    function wave(f, a, phase) {
        var pts = [];
        for (var x = 0; x <= W; x += 4) pts.push(x + ',' + (MID - Math.sin((x / W) * f * Math.PI * 2 + phase) * a * (H / 2 - 14)).toFixed(1));
        return pts.join(' ');
    }

    function drawScope() {
        var svg = S.grid;
        if (cfg.noise) {
            for (var k = 0; k < 70; k++) svg += '<circle class="ct-noise" cx="' + K.rand(W) + '" cy="' + K.rand(H) + '" r="1.2"/>';
        }
        svg += '<polyline class="ct-target" points="' + wave(S.tf, S.ta, S.phase) + '"/>';
        svg += '<polyline class="ct-carrier" points="' + wave(S.cf, S.ca, S.phase + (S.locked ? 0 : 0.6)) + '"/>';
        S.svg.innerHTML = svg;
    }

    function drawReadout() {
        var b = bars(), sig = '';
        for (var i = 0; i < 5; i++) sig += '<i class="' + (i < b ? 'on' : '') + '" style="height:' + (5 + i * 3) + 'px"></i>';
        $('#ct-sig').html(sig).toggleClass('locked', S.locked);
        $('#ct-stat').text(S.locked ? 'Locked' : inTune() ? 'Locking' : 'Tune');
        $('#ct-hold').css('width', Math.min(100, S.hold / cfg.holdTime * 100) + '%');
        $('#ct-fval').text(S.cf.toFixed(S.fDigits));
        $('#ct-aval').text(S.ca.toFixed(2));
        var sign = function (v) { return (v >= 0 ? '+' : '') + v.toFixed(2); };
        $('#ct-foff').text(sign(S.cf - S.tf));
        $('#ct-aoff').text(sign(S.ca - S.ta));
        $('#ct-locks').text(S.locks + ' / ' + cfg.locks);
        K.pips('#ct-pips', K.roundStates(cfg.locks, S.locks, -1));
    }

    // ---- input ---------------------------------------------------------------
    function nudge(k, d) {
        if (!active || S.locked) return;
        if (k === 'f') S.cf = K.clamp(snap(S.cf + d * cfg.freqStep, cfg.freqStep), cfg.freqRange.min, cfg.freqRange.max);
        else S.ca = K.clamp(snap(S.ca + d * cfg.ampStep, cfg.ampStep), cfg.ampRange.min, cfg.ampRange.max);
    }

    // held keys / buttons repeat: first step at once, then every REPEAT_MS after a short wait
    function press(id, k, d) {
        if (S.held[id] || !active || S.locked) return;
        nudge(k, d);
        K.sound('sound-click');
        S.held[id] = { k: k, d: d, next: Date.now() + FIRST_REPEAT_MS };
        $('.ct-btn[data-k="' + k + '"][data-d="' + d + '"]').addClass('press');
    }

    function release(id) {
        var h = S.held[id];
        if (!h) return;
        delete S.held[id];
        $('.ct-btn[data-k="' + h.k + '"][data-d="' + h.d + '"]').removeClass('press');
    }

    var KEYS = { KeyA: ['f', -1], KeyD: ['f', 1], KeyW: ['a', 1], KeyS: ['a', -1], ArrowLeft: ['f', -1], ArrowRight: ['f', 1], ArrowUp: ['a', 1], ArrowDown: ['a', -1] };

    function bind() {
        $(document).off('keydown.ct keyup.ct').on('keydown.ct', function (e) {
            var m = KEYS[e.code];
            if (!m || !active) return;
            e.preventDefault();
            press(e.code, m[0], m[1]);
        }).on('keyup.ct', function (e) {
            if (KEYS[e.code]) release(e.code);
        });
        $('#carrier-tune-container').off('mousedown.ct').on('mousedown.ct', '.ct-btn', function (e) {
            e.preventDefault();
            press('mouse', $(this).attr('data-k'), Number($(this).attr('data-d')));
        });
        $(document).off('mouseup.ct').on('mouseup.ct', function () { release('mouse'); });
    }

    function unbind() {
        $(document).off('keydown.ct keyup.ct mouseup.ct');
        $('#carrier-tune-container').off('mousedown.ct');
    }

    // ---- loop ----------------------------------------------------------------
    function loop(now) {
        if (!active) return;
        var dt = Math.min(250, now - (S.last || now));   // capped so a stalled frame never eats the TTL
        S.last = now;
        S.left -= dt;

        Object.keys(S.held).forEach(function (id) {
            var h = S.held[id];
            if (Date.now() >= h.next) { nudge(h.k, h.d); h.next = Date.now() + REPEAT_MS; }
        });

        if (cfg.scroll) S.phase += dt * 0.0025;
        if (cfg.drift > 0 && !S.locked) {
            // slow wander, bounced back inside the ranges
            S.dt += dt / 1000;
            S.tf += Math.sin(S.dt * 0.9 + S.seed) * cfg.drift * 0.6 * dt / 1000;
            S.ta += Math.cos(S.dt * 0.7 + S.seed * 2) * cfg.drift * 0.12 * dt / 1000;
            S.tf = K.clamp(S.tf, cfg.freqRange.min, cfg.freqRange.max);
            S.ta = K.clamp(S.ta, cfg.ampRange.min, cfg.ampRange.max);
        }

        if (!S.locked) {
            if (inTune()) S.hold += dt;
            else S.hold = cfg.holdDecay === 'reset' ? 0 : Math.max(0, S.hold - dt * 1.5);
            if (S.hold >= cfg.holdTime) lock();
        }

        K.timer('#ct-bar', '#ct-time', S.left, cfg.timeLimit);
        drawScope();
        drawReadout();

        if (S.left <= 0) { finish(false); return; }
        run.frame(loop);
    }

    function lock() {
        S.locked = true;
        S.locks++;
        $('#ct-scope').addClass('ct-locked');
        K.tag('#ct-tag', 'LOCKED');
        $('#ct-msg').addClass('good').text(S.locks >= cfg.locks ? 'All signals locked' : 'Carrier locked, next signal');
        if (S.locks >= cfg.locks) { drawReadout(); finish(true); return; }
        K.sound('sound-success');
        run.after(700, function () {
            S.locked = false;
            S.hold = 0;
            newTarget();
            $('#ct-scope').removeClass('ct-locked');
            K.tag('#ct-tag', 'TUNE');
            $('#ct-msg').removeClass('good').text(message());
        });
    }

    function message() {
        return cfg.drift > 0 ? 'The signal keeps moving, keep chasing it' : 'Match the carrier to the signal and hold it';
    }

    function finish(success) {
        if (!active) return;
        active = false;
        window.carrierTuneGame.active = false;
        S.held = {};
        $('.ct-btn').removeClass('press');
        K.sound(success ? 'sound-success' : 'sound-failure');
        if (!success) { K.tag('#ct-tag', 'LOST'); $('#ct-msg').addClass('bad').text('Signal lost'); }
        K.result('#ct-scope', success, success ? 'Carrier locked' : 'Signal lost');
        run.after(1500, function () {
            $('#carrier-tune-container').removeClass('active').fadeOut(300);
            K.post('carrierTuneResult', { success: success, locks: S.locks });
            run.clear();
        });
    }

    var game = window.carrierTuneGame = {
        active: false,
        start: function (config) {
            if (run) run.clear();
            run = K.session();
            cfg = readConfig(config);
            var grid = '';
            for (var gx = 50; gx < W; gx += 50) grid += '<line class="ct-grid" x1="' + gx + '" y1="0" x2="' + gx + '" y2="' + H + '"/>';
            for (var gy = 25; gy < H; gy += 25) grid += '<line class="ct-grid" x1="0" y1="' + gy + '" x2="' + W + '" y2="' + gy + '"/>';
            grid += '<line class="ct-axis" x1="0" y1="' + MID + '" x2="' + W + '" y2="' + MID + '"/>';
            $('#ct-scope').removeClass('ct-locked').html('<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg"></svg>');
            S = {
                svg: $('#ct-scope svg')[0], grid: grid, held: {}, locks: 0, hold: 0, locked: false, left: cfg.timeLimit,
                phase: 0, dt: 0, seed: Math.random() * 6, last: 0,
                fDigits: cfg.freqStep < 0.1 ? 2 : 1,
                cf: snap(between(cfg.freqRange), cfg.freqStep), ca: snap(between(cfg.ampRange), cfg.ampStep)
            };
            S.cf = K.clamp(S.cf, cfg.freqRange.min, cfg.freqRange.max);
            S.ca = K.clamp(S.ca, cfg.ampRange.min, cfg.ampRange.max);
            newTarget();
            active = true;
            game.active = true;
            $('#ct-title').text(cfg.title);
            K.tag('#ct-tag', 'TUNE');
            $('#ct-msg').removeClass('bad good').text(message());
            $('#carrier-tune-container').stop(true, true).addClass('active').css('display', 'flex');
            bind();
            K.sound('sound-buttonPress');
            run.frame(loop);
        },
        close: function () {
            var was = active;
            active = false;
            game.active = false;
            if (run) { run.clear(); run = null; }
            unbind();
            $('#carrier-tune-container').removeClass('active').hide();
            $('#ct-scope').empty();
            if (was) K.post('carrierTuneClose', {});
        }
    };

    K.register('startCarrierTune', game);
})();
