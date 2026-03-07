// -- Glitch Minigames — Combo Input
// -- Minimal HUD: directional combo (W/A/S/D shown as ↑←↓→) type it fast

window.comboInputGame = (function () {

    // Direction key map: JS keyCode → display symbol & axis label
    const DIR_MAP = {
        87: { sym: '↑', label: 'W' },
        65: { sym: '←', label: 'A' },
        83: { sym: '↓', label: 'S' },
        68: { sym: '→', label: 'D' }
    };
    const DIR_KEYS = [87, 65, 83, 68];

    // Arrow key aliases → WASD equivalents
    const ARROW_MAP = { 38: 87, 37: 65, 40: 83, 39: 68 };

    let config   = {};
    let active   = false;
    let combo    = [];      // keyCode array for this round
    let cursor   = 0;       // how many keys correctly pressed
    let round    = 0;
    let failures = 0;
    let timeLeft = 0;
    let timerInt = null;

    // ── helpers ─────────────────────────────────────────────

    function generateCombo(length) {
        const arr = [];
        let last = -1;
        for (let i = 0; i < length; i++) {
            let pick;
            do { pick = DIR_KEYS[Math.floor(Math.random() * DIR_KEYS.length)]; }
            while (pick === last && length <= DIR_KEYS.length * 2);
            arr.push(pick);
            last = pick;
        }
        return arr;
    }

    function renderArrows() {
        const $wrap = $('#ci-arrows');
        $wrap.empty();
        combo.forEach((k, i) => {
            const state = i < cursor ? 'ci-done' : i === cursor ? 'ci-active' : 'ci-pending';
            $wrap.append(`<span class="ci-arrow ${state}">${DIR_MAP[k].sym}</span>`);
        });
    }

    function clearTimer() {
        if (timerInt) { clearInterval(timerInt); timerInt = null; }
    }

    // ── round/game flow ──────────────────────────────────────

    function startRound() {
        round++;
        if (round > (config.rounds || 3)) { endGame(true); return; }

        cursor = 0;
        const baseLen    = config.comboLength    || 4;
        const increase   = config.lengthIncrease || 1;
        const comboLen   = baseLen + (round - 1) * increase;
        combo = generateCombo(comboLen);

        clearTimer();
        timeLeft = config.timePerCombo || 6;
        setTimerUI(timeLeft, timeLeft);

        $('#ci-round').text('CMD ' + round + ' / ' + (config.rounds || 3));
        renderArrows();

        timerInt = setInterval(() => {
            timeLeft -= 0.1;
            if (timeLeft < 0) timeLeft = 0;
            setTimerUI(timeLeft, config.timePerCombo || 6);
            if (timeLeft <= 0) {
                clearTimer();
                handleFailure();
            }
        }, 100);
    }

    function setTimerUI(current, max) {
        const pct = (current / max) * 100;
        $('#ci-timer-fill').css('width', pct + '%');
        $('#ci-time-text').text(current.toFixed(1) + 's');
    }

    function handleFailure() {
        failures++;
        const $c = $('#combo-input-container');
        $c.addClass('ci-flash-fail');
        setTimeout(() => {
            $c.removeClass('ci-flash-fail');
            if (failures >= (config.maxFailures || 2)) {
                endGame(false);
            } else {
                startRound();
            }
        }, 450);
    }

    function endGame(success) {
        clearTimer();
        active        = false;
        window.comboInputGame.active = false;

        const $c = $('#combo-input-container');
        $c.addClass(success ? 'ci-flash-success' : 'ci-flash-fail');
        playSoundSafe(success ? 'sound-success' : 'sound-failure');
        setTimeout(() => {
            $c.fadeOut(300, function() {
                $.post('https://glitch-minigames/comboInputResult', JSON.stringify({ success: success }));
            });
        }, success ? 600 : 450);
    }

    // ── key handler ──────────────────────────────────────────

    function handleKey(keyCode) {
        if (!active) return;
        const k = ARROW_MAP[parseInt(keyCode)] || parseInt(keyCode);
        if (!DIR_MAP[k]) return; // not a direction key

        if (k === combo[cursor]) {
            playSoundSafe('sound-buttonPress');
            cursor++;
            renderArrows();
            if (cursor >= combo.length) {
                clearTimer();
                playSoundSafe('sound-click');
                const $c = $('#combo-input-container');
                $c.addClass('ci-flash-success');
                setTimeout(() => {
                    $c.removeClass('ci-flash-success');
                    startRound();
                }, 330);
            }
        } else {
            // Wrong key — reset combo progress (not a full failure)
            playSoundSafe('sound-penalty');
            cursor = 0;
            renderArrows();
            const $c = $('#combo-input-container');
            $c.addClass('ci-flash-wrong');
            setTimeout(() => $c.removeClass('ci-flash-wrong'), 200);
        }
    }

    // ── public API ───────────────────────────────────────────

    let _onKeyDown = null;

    return {
        active: false,

        start: function (cfg) {
            config   = cfg || {};
            active   = true;
            this.active = true;
            round    = 0;
            failures = 0;

            // Native keydown listener so WASD and arrow keys work in FiveM
            // (requires SetNuiFocus(true, false) in Lua so the browser gets keyboard focus)
            if (_onKeyDown) document.removeEventListener('keydown', _onKeyDown);
            _onKeyDown = function (e) {
                // Prevent arrow keys from scrolling the page
                if (e.keyCode >= 37 && e.keyCode <= 40) e.preventDefault();
                handleKey(e.keyCode);
            };
            document.addEventListener('keydown', _onKeyDown);

            $('#combo-input-container').show().removeClass('ci-flash-success ci-flash-fail ci-flash-wrong');
            startRound();
        },

        close: function () {
            clearTimer();
            active      = false;
            this.active = false;
            if (_onKeyDown) {
                document.removeEventListener('keydown', _onKeyDown);
                _onKeyDown = null;
            }
            $('#combo-input-container').fadeOut(300);
        },

        handleKeyByCode: handleKey
    };

})();
