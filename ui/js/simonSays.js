// -- Glitch Minigames — Simon Says
// -- Full container: growing colour/button sequence — watch then repeat

window.simonSaysGame = (function () {

    // Button colours use the minigame palette CSS vars
    const BUTTONS = [
        { id: 0, cls: 'ss-btn-0', activeClass: 'ss-active-0', label: '1' },
        { id: 1, cls: 'ss-btn-1', activeClass: 'ss-active-1', label: '2' },
        { id: 2, cls: 'ss-btn-2', activeClass: 'ss-active-2', label: '3' },
        { id: 3, cls: 'ss-btn-3', activeClass: 'ss-active-3', label: '4' }
    ];

    let config      = {};
    let active      = false;
    let sequence    = [];   // growing list of button ids
    let playerInput = [];   // what the player has pressed so far
    let phase       = 'idle'; // 'showing' | 'input' | 'idle'
    let timerInt    = null;
    let timeLeft    = 0;
    let showTimeout = null;

    // ── sequences ────────────────────────────────────────────

    function extendSequence() {
        const next = Math.floor(Math.random() * BUTTONS.length);
        sequence.push(next);
    }

    // ── playback ─────────────────────────────────────────────

    function playSequence(cb) {
        phase = 'showing';
        setInputEnabled(false);
        clearPlayerInput();

        const flashMs  = config.flashSpeed  || 550;
        const gapMs    = config.flashGap    || 250;
        let i = 0;

        function next() {
            if (i >= sequence.length) {
                // Finished showing
                setTimeout(() => {
                    phase = 'input';
                    setInputEnabled(true);
                    cb && cb();
                }, gapMs);
                return;
            }

            const btnId = sequence[i];
            flashButton(btnId, flashMs, () => {
                i++;
                setTimeout(next, gapMs);
            });
        }
        next();
    }

    function flashButton(btnId, duration, cb) {
        const $btn = $('#ss-btn-' + btnId);
        $btn.addClass(BUTTONS[btnId].activeClass);
        setTimeout(() => {
            $btn.removeClass(BUTTONS[btnId].activeClass);
            cb && cb();
        }, duration);
    }

    // ── input handling ───────────────────────────────────────

    function setInputEnabled(enabled) {
        $('.ss-button').toggleClass('ss-disabled', !enabled);
    }

    function clearPlayerInput() {
        playerInput = [];
        updateProgress();
    }

    function onButtonClick(btnId) {
        if (!active || phase !== 'input') return;

        flashButton(btnId, 200);
        playerInput.push(btnId);
        updateProgress();

        const pos = playerInput.length - 1;

        if (playerInput[pos] !== sequence[pos]) {
            // Wrong button
            onFail();
            return;
        }

        if (playerInput.length === sequence.length) {
            // Correct full sequence
            onRoundWin();
        }
    }

    function updateProgress() {
        const pct = sequence.length === 0
            ? 0
            : (playerInput.length / sequence.length) * 100;
        $('#ss-progress-fill').css('width', pct + '%');
        $('#ss-progress-text').text(playerInput.length + ' / ' + sequence.length);
    }

    // ── round flow ───────────────────────────────────────────

    function startRound() {
        clearInterval(timerInt);
        clearTimeout(showTimeout);
        clearPlayerInput();
        extendSequence();

        const roundNum  = sequence.length;
        const maxRounds = config.rounds || 5;

        $('#ss-round').text('Round ' + roundNum + ' / ' + maxRounds);
        $('#ss-status').text('Watch carefully…').removeClass('ss-ok ss-fail');
        setInputEnabled(false);

        // Brief pause before showing
        showTimeout = setTimeout(() => {
            playSequence(() => {
                // Player's turn
                $('#ss-status').text('Your turn!').addClass('ss-ok');
                startInputTimer();
            });
        }, 600);
    }

    function startInputTimer() {
        if (!config.timeLimit) return;
        timeLeft = config.timeLimit;
        $('#ss-timer-fill').css('width', '100%');
        $('#ss-time-text').text(timeLeft + 's');

        timerInt = setInterval(() => {
            timeLeft -= 0.1;
            if (timeLeft < 0) timeLeft = 0;
            const pct = (timeLeft / config.timeLimit) * 100;
            $('#ss-timer-fill').css('width', pct + '%');
            $('#ss-time-text').text(Math.ceil(timeLeft) + 's');
            if (timeLeft <= 0) {
                clearInterval(timerInt);
                onFail();
            }
        }, 100);
    }

    function onRoundWin() {
        clearInterval(timerInt);
        setInputEnabled(false);
        phase = 'idle';
        $('#ss-status').text('Correct! ✓').addClass('ss-ok');

        if (sequence.length >= (config.rounds || 5)) {
            endGame(true);
        } else {
            setTimeout(startRound, 900);
        }
    }

    function onFail() {
        clearInterval(timerInt);
        setInputEnabled(false);
        phase = 'idle';
        const failures = config.maxMistakes || 1;

        // Simple: one mistake = fail (or configurable)
        $('#ss-status').text('Wrong!').removeClass('ss-ok').addClass('ss-fail');
        const $c = $('#simon-says-container');
        $c.addClass('flash-fail');
        setTimeout(() => {
            $c.removeClass('flash-fail');
            endGame(false);
        }, 500);
    }

    function endGame(success) {
        active      = false;
        this_active = false;
        window.simonSaysGame.active = false;
        clearInterval(timerInt);
        clearTimeout(showTimeout);
        setInputEnabled(false);

        const $c = $('#simon-says-container');
        $c.addClass(success ? 'flash-success' : 'flash-fail');
        setTimeout(() => {
            $.post('https://glitch-minigames/simonSaysResult', JSON.stringify({ success: success }));
        }, 600);
    }

    // ── public API ───────────────────────────────────────────

    return {
        active: false,

        start: function (cfg) {
            config    = cfg || {};
            active    = true;
            this.active = true;
            sequence  = [];
            playerInput = [];
            phase     = 'idle';

            clearInterval(timerInt);
            clearTimeout(showTimeout);

            $('#simon-says-container').show().removeClass('flash-success flash-fail');

            // Bind button clicks
            BUTTONS.forEach(b => {
                $('#ss-btn-' + b.id).off('click').on('click', () => onButtonClick(b.id));
            });

            updateProgress();
            startRound();
        },

        close: function () {
            active      = false;
            this.active = false;
            clearInterval(timerInt);
            clearTimeout(showTimeout);
            BUTTONS.forEach(b => $('#ss-btn-' + b.id).off('click'));
            $('#simon-says-container').fadeOut(300);
        }
    };

})();
