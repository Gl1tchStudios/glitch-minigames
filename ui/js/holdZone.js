// -- Glitch Minigames — Hold Zone
// -- Minimal HUD: hold a key to shrink a ring toward a green zone, release on cue

window.holdZoneGame = (function () {

    const RING_SIZE  = 220; // px — outer ring container diameter
    const RING_HALF  = RING_SIZE / 2;

    // Maps key letter → JS keyCode (matches FiveM key forwarding table)
    const KEY_CODE_MAP = {
        A:65,B:66,C:67,D:68,E:69,F:70,G:71,H:72,I:73,J:74,
        K:75,L:76,M:77,N:78,O:79,P:80,Q:81,R:82,S:83,T:84,
        U:85,V:86,W:87,X:88,Y:89,Z:90,
        '1':49,'2':50,'3':51,'4':52,'5':53,
        '6':54,'7':55,'8':56,'9':57,'0':48
    };

    let config   = {};
    let active   = false;
    let round    = 0;
    let failures = 0;

    // per-round state
    let ringPct      = 100; // 100 = outer edge, 0 = centre
    let zoneMin      = 0;   // % (inner boundary of success zone)
    let zoneMax      = 0;   // % (outer boundary of success zone)
    let holding      = false;
    let resolved     = false;
    let animFrame    = null;
    let lastTs       = null;
    let targetKeyCode = 69;  // resolved JS keyCode
    let idleTimer    = null;

    // ── helpers ──────────────────────────────────────────────

    function pctToRadius(pct) { return (pct / 100) * RING_HALF; }

    function updateRingCSS() {
        const r      = pctToRadius(ringPct);
        const offset = RING_HALF - r;
        const inZone = ringPct >= zoneMin && ringPct <= zoneMax;
        const closing = ringPct - zoneMin < 8 && ringPct >= zoneMin;

        $('#hz-ring').css({
            width:   r * 2 + 'px',
            height:  r * 2 + 'px',
            top:     offset + 'px',
            left:    offset + 'px',
            borderColor: inZone
                ? 'var(--safe-color)'
                : closing
                    ? 'var(--danger-color)'
                    : 'var(--primary-color)'
        });
    }

    function buildZoneCSS() {
        const outerR  = pctToRadius(zoneMax);
        const innerR  = pctToRadius(zoneMin);
        const band    = outerR - innerR;
        const offset  = RING_HALF - outerR;

        $('#hz-zone').css({
            width:        outerR * 2 + 'px',
            height:       outerR * 2 + 'px',
            borderWidth:  band + 'px',
            top:          offset + 'px',
            left:         offset + 'px',
            opacity:      1
        });

        // Perfect inner zone if configured
        const perfectPct = config.perfectZoneSize || 0;
        if (perfectPct > 0) {
            const pmid = (zoneMin + zoneMax) / 2;
            const pMin = pmid - perfectPct / 2;
            const pMax = pmid + perfectPct / 2;
            const pR   = pctToRadius(pMax);
            const pB   = pctToRadius(pMax) - pctToRadius(pMin);
            const pOff = RING_HALF - pR;
            $('#hz-perfect').css({
                width:       pR * 2 + 'px',
                height:      pR * 2 + 'px',
                borderWidth: pB + 'px',
                top:         pOff + 'px',
                left:        pOff + 'px',
                opacity:     1
            });
        } else {
            $('#hz-perfect').css('opacity', 0);
        }
    }

    // ── animation loop ───────────────────────────────────────

    function tick(ts) {
        if (!active || resolved) return;

        const dt = lastTs ? (ts - lastTs) / 1000 : 0;
        lastTs = ts;

        if (holding) {
            const speed = config.speed || 18; // % per second
            ringPct = Math.max(0, ringPct - speed * dt);
            updateRingCSS();

            if (ringPct <= 0) {
                // Ring collapsed — auto fail
                onResult(false);
                return;
            }
        }

        animFrame = requestAnimationFrame(tick);
    }

    // ── round/game flow ──────────────────────────────────────

    function startRound() {
        round++;
        if (round > (config.rounds || 3)) { endGame(true); return; }
        runRound();
    }

    function runRound() {
        holding  = false;
        resolved = false;
        ringPct  = 100;
        lastTs   = null;

        const zoneSize = config.zoneSize || 18;
        zoneMin = 12 + Math.random() * 28;   // 12%–40%
        zoneMax = zoneMin + zoneSize;

        buildZoneCSS();
        updateRingCSS();

        const label = config.key || 'E';
        $('#hz-key-hint').html(
            'Hold <span class="hz-key-badge">' + label + '</span> &amp; release in zone'
        );
        $('#hz-round').text('Round ' + round + ' / ' + (config.rounds || 3));
        if (animFrame) cancelAnimationFrame(animFrame);
        animFrame = requestAnimationFrame(tick);

        // Idle timeout — auto-fail if the player never presses the key
        clearTimeout(idleTimer);
        idleTimer = null;
        const _idleMs = (config.idleTimeout !== undefined && config.idleTimeout !== null)
            ? config.idleTimeout * 1000
            : 10000;
        if (_idleMs > 0) {
            idleTimer = setTimeout(function () {
                if (!active || resolved || holding) return;
                onResult(false);
            }, _idleMs);
        }

        // Progress bar counts down over the idle timeout duration
        const $fill = $('#hz-progress-fill');
        $fill.css({ transition: 'none', width: '100%' });
        $fill[0].offsetWidth; // force reflow so CSS transition restarts
        if (_idleMs > 0) {
            $fill.css({ transition: 'width ' + (_idleMs / 1000) + 's linear', width: '0%' });
        }
    }

    function onResult(success) {
        resolved = true;
        clearTimeout(idleTimer);
        idleTimer = null;
        // Freeze countdown bar at its current animated position
        const $fill = $('#hz-progress-fill');
        $fill.css({ transition: 'none', width: window.getComputedStyle($fill[0]).width });
        if (animFrame) { cancelAnimationFrame(animFrame); animFrame = null; }

        const $c = $('#hold-zone-container');
        if (!success) {
            failures++;
            playSoundSafe('sound-penalty');
            $c.addClass('hz-flash-fail');
            setTimeout(() => {
                $c.removeClass('hz-flash-fail');
                if (failures >= (config.maxFailures || 1)) {
                    endGame(false);
                } else {
                    runRound(); // retry same round number, don't advance past total
                }
            }, 500);
        } else {
            playSoundSafe('sound-buttonPress');
            $c.addClass('hz-flash-success');
            setTimeout(() => {
                $c.removeClass('hz-flash-success');
                startRound();
            }, 400);
        }
    }

    function endGame(success) {
        active      = false;
        window.holdZoneGame.active = false;
        clearTimeout(idleTimer);
        idleTimer = null;
        if (animFrame) { cancelAnimationFrame(animFrame); animFrame = null; }

        const $c = $('#hold-zone-container');
        const $pfill = $('#hz-progress-fill');
        $pfill.css({ transition: 'none', width: window.getComputedStyle($pfill[0]).width });
        if (success) {
            $pfill[0].offsetWidth;
            $pfill.css({ transition: 'width 0.3s ease', width: '100%' });
        }
        $c.addClass(success ? 'hz-flash-success' : 'hz-flash-fail');
        playSoundSafe(success ? 'sound-success' : 'sound-failure');
        setTimeout(() => {
            $c.fadeOut(300, function() {
                $.post('https://glitch-minigames/holdZoneResult', JSON.stringify({ success: success }));
            });
        }, 400);
    }

    // ── public API ───────────────────────────────────────────

    return {
        active: false,

        start: function (cfg) {
            config   = cfg || {};
            active   = true;
            this.active = true;
            round    = 0;
            failures = 0;
            const keyStr = (config.key || 'E').toUpperCase();
            targetKeyCode = KEY_CODE_MAP[keyStr] || 69;

            $('#hold-zone-container').show().removeClass('hz-flash-success hz-flash-fail');
            startRound();
        },

        close: function () {
            active      = false;
            this.active = false;
            clearTimeout(idleTimer);
            idleTimer = null;
            if (animFrame) { cancelAnimationFrame(animFrame); animFrame = null; }
            $('#hold-zone-container').fadeOut(300);
        },

        handleKeyByCode: function (kc) {
            if (!active || resolved) return;
            if (parseInt(kc) !== targetKeyCode) return;
            // Player interacted — cancel the idle timeout
            clearTimeout(idleTimer);
            idleTimer = null;
            holding = true;
            // start animation if it isn't already running
            if (!animFrame) {
                lastTs = null;
                animFrame = requestAnimationFrame(tick);
            }
        },

        handleKeyRelease: function (kc) {
            if (!active || resolved) return;
            if (parseInt(kc) !== targetKeyCode) return;
            if (!holding) return;

            holding = false;
            // Evaluate position at release
            const success = ringPct >= zoneMin && ringPct <= zoneMax;
            onResult(success);
        }
    };

})();
