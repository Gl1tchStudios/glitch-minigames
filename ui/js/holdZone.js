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
                    ? 'var(--warning-color)'
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
    }

    function onResult(success) {
        resolved = true;
        if (animFrame) { cancelAnimationFrame(animFrame); animFrame = null; }

        const $c = $('#hold-zone-container');
        if (!success) {
            failures++;
            $c.addClass('hz-flash-fail');
            setTimeout(() => {
                $c.removeClass('hz-flash-fail');
                if (failures >= (config.maxFailures || 2)) {
                    endGame(false);
                } else {
                    startRound();
                }
            }, 500);
        } else {
            $c.addClass('hz-flash-success');
            setTimeout(() => {
                $c.removeClass('hz-flash-success');
                startRound();
            }, 400);
        }
    }

    function endGame(success) {
        active      = false;
        this_active = false;
        window.holdZoneGame.active = false;
        if (animFrame) { cancelAnimationFrame(animFrame); animFrame = null; }

        const $c = $('#hold-zone-container');
        $c.addClass(success ? 'hz-flash-success' : 'hz-flash-fail');
        setTimeout(() => {
            $.post('https://glitch-minigames/holdZoneResult', JSON.stringify({ success: success }));
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
            if (animFrame) { cancelAnimationFrame(animFrame); animFrame = null; }
            $('#hold-zone-container').fadeOut(300);
        },

        handleKeyByCode: function (kc) {
            if (!active || resolved) return;
            if (parseInt(kc) !== targetKeyCode) return;
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
