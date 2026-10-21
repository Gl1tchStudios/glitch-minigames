// Glitch Minigames - Memory Diff
//
// Two grids of values, image A and image B. Some cells in B changed. In 'memory'
// mode A is shown for a few seconds and then masked, so the player clicks the
// changes in B from memory (peek key brings A back briefly). In 'side' mode both
// stay on screen, like the NoPixel version.
//
// Config (merged + clamped in Lua, StartMemoryDiffGame):
//   cols, rows, differences, rounds, mode ('memory' | 'side'), memoriseTime, timeLimit,
//   maxStrikes, peeks, peekTime, charset ('hex' | 'digits' | 'letters' | 'symbols'), subtle, title

(function () {
    var K = window.HackKit;
    var LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    var DIGITS = '0123456789';
    var HEX = '0123456789ABCDEF';
    var ASCII_SYMBOLS = ['#', '$', '%', '&', '@', '*', '+', '=', '?', '!', '~', '^', '<', '>', '/', '|'];

    var cfg = null, S = null, run = null, active = false;

    function readConfig(c) {
        c = c || {};
        var cols = K.clamp(Math.floor(K.num(c.cols, 6)), 3, 8), rows = K.clamp(Math.floor(K.num(c.rows, 6)), 3, 8);
        var charset = ['hex', 'digits', 'letters', 'symbols'].indexOf(c.charset) >= 0 ? c.charset : 'hex';
        return {
            cols: cols, rows: rows,
            differences: K.clamp(Math.floor(K.num(c.differences, 4)), 1, Math.min(12, cols * rows - 1)),
            rounds: K.clamp(Math.floor(K.num(c.rounds, 1)), 1, 5),
            mode: c.mode === 'side' ? 'side' : 'memory',
            memoriseTime: Math.max(500, K.num(c.memoriseTime, 5000)),
            timeLimit: Math.max(2000, K.num(c.timeLimit, 20000)),
            maxStrikes: K.clamp(Math.floor(K.num(c.maxStrikes, 2)), 0, 5),
            peeks: K.clamp(Math.floor(K.num(c.peeks, 1)), 0, 5),
            peekTime: Math.max(200, K.num(c.peekTime, 1000)),
            charset: charset,
            subtle: c.subtle === true,
            title: c.title ? String(c.title) : 'MEMORY DIFF'
        };
    }

    // ---- values --------------------------------------------------------------
    function symbols() {
        return (typeof SYMBOL_PRESETS !== 'undefined' && SYMBOL_PRESETS.symbols) ? SYMBOL_PRESETS.symbols : ASCII_SYMBOLS;
    }

    function value() {
        if (cfg.charset === 'symbols') return K.sample(symbols());
        var set = cfg.charset === 'digits' ? DIGITS : cfg.charset === 'letters' ? LETTERS : HEX;
        return set[K.rand(set.length)] + set[K.rand(set.length)];
    }

    function changed(v) {
        var out;
        if (cfg.charset === 'symbols' || !cfg.subtle) {
            do { out = value(); } while (out === v);
            return out;
        }
        // subtle: one of the two characters changes
        var set = cfg.charset === 'digits' ? DIGITS : cfg.charset === 'letters' ? LETTERS : HEX;
        var i = K.rand(2), c;
        do { c = set[K.rand(set.length)]; } while (c === v[i]);
        return i === 0 ? c + v[1] : v[0] + c;
    }

    function makeBoard() {
        var n = cfg.cols * cfg.rows;
        S.A = []; S.B = [];
        for (var i = 0; i < n; i++) S.A.push(value());
        S.B = S.A.slice();
        S.diffs = K.shuffle(Array.apply(null, { length: n }).map(function (_, i) { return i; })).slice(0, cfg.differences);
        S.diffs.forEach(function (k) { S.B[k] = changed(S.A[k]); });
        S.found = [];
    }

    // ---- drawing -------------------------------------------------------------
    function cellHtml(v, cls, k) {
        return '<div class="md-cell ' + cls + '" data-k="' + k + '">' + K.esc(v) + '</div>';
    }

    function draw() {
        var showA = S.phase === 'memorise' || S.peeking || cfg.mode === 'side' || S.phase === 'reveal';
        var showB = S.phase !== 'memorise';
        var a = '', b = '';
        for (var k = 0; k < S.A.length; k++) {
            var isFound = S.found.indexOf(k) >= 0, isDiff = S.diffs.indexOf(k) >= 0;
            var ca = showA ? (isFound ? 'found' : '') : 'masked';
            a += cellHtml(showA ? S.A[k] : '--', ca, k);
            var cb = !showB ? 'locked' : isFound ? 'found' : (S.miss === k ? 'miss' : (S.phase === 'reveal' && isDiff ? 'missed' : ''));
            b += cellHtml(showB ? S.B[k] : '', cb + (showB && S.phase === 'find' ? ' md-pick' : ''), k);
        }
        $('#md-gridA').css('grid-template-columns', 'repeat(' + cfg.cols + ', auto)').html(a).toggleClass('dim', !showA);
        $('#md-gridB').css('grid-template-columns', 'repeat(' + cfg.cols + ', auto)').html(b).toggleClass('dim', !showB);
        drawStats();
    }

    function drawStats() {
        $('#md-found').text(S.found.length + ' / ' + cfg.differences);
        $('#md-strikes').text(K.strikesText(S.strikes, cfg.maxStrikes)).parent().toggle(cfg.maxStrikes > 0);
        $('#md-peeks').text(S.peeks);
        $('#md-peeks-wrap').toggle(cfg.mode === 'memory' && cfg.peeks > 0);
        K.pips('#md-pips', K.roundStates(cfg.rounds, S.round, S.badRound));
    }

    function memBar(left, total, show) {
        $('#md-mem').css('visibility', show ? 'visible' : 'hidden');
        $('#md-mem i').css('width', (total > 0 ? Math.max(0, left / total) * 100 : 0) + '%');
    }

    // ---- flow ----------------------------------------------------------------
    function startBoard() {
        makeBoard();
        S.miss = -1;
        S.badRound = -1;
        if (cfg.mode === 'side') { startFind(); return; }

        S.phase = 'memorise';
        K.tag('#md-tag', 'MEMORISE');
        $('#md-msg').removeClass('bad good').text('Memorise image A');
        draw();
        K.timer('#md-bar', '#md-time', cfg.timeLimit, cfg.timeLimit);
        var started = Date.now();
        S.tick = run.every(50, function () { memBar(cfg.memoriseTime - (Date.now() - started), cfg.memoriseTime, true); });
        run.after(cfg.memoriseTime, function () { run.stop(S.tick); startFind(); });
    }

    function startFind() {
        S.phase = 'find';
        K.tag('#md-tag', 'SCAN');
        $('#md-msg').removeClass('bad good').text(cfg.mode === 'side'
            ? 'Click the values in image B that do not match image A'
            : 'Click every value in image B that changed');
        memBar(0, 1, false);
        draw();
        K.sound('sound-buttonPress');
        S.deadline = Date.now() + cfg.timeLimit;
        S.tick = run.every(50, function () {
            var left = S.deadline - Date.now();
            K.timer('#md-bar', '#md-time', left, cfg.timeLimit);
            if (left <= 0) fail('Out of time');
        });
    }

    function pick(k) {
        if (!active || S.phase !== 'find') return;
        if (S.found.indexOf(k) >= 0) return;
        if (S.diffs.indexOf(k) >= 0) {
            S.found.push(k);
            K.sound('sound-click');
            draw();
            if (S.found.length >= S.diffs.length) boardDone();
            return;
        }
        S.strikes++;
        S.miss = k;
        draw();
        if (S.strikes > cfg.maxStrikes) { S.badRound = S.round; fail('No change there'); return; }
        K.sound('sound-penalty');
        K.tag('#md-tag', 'STRIKE');
        $('#md-msg').addClass('bad').text('No change there');
        run.after(650, function () {
            if (S.phase !== 'find') return;
            S.miss = -1;
            K.tag('#md-tag', 'SCAN');
            $('#md-msg').removeClass('bad');
            draw();
        });
    }

    function boardDone() {
        run.stop(S.tick);
        S.phase = 'done';
        S.round++;
        drawStats();
        if (S.round >= cfg.rounds) { finish(true); return; }
        K.sound('sound-success');
        $('#md-msg').addClass('good').text('Board clear, next image');
        run.after(1000, startBoard);
    }

    function fail(reason) {
        if (S.phase === 'reveal' || !active) return;
        run.stop(S.tick);
        S.phase = 'reveal';
        S.badRound = S.round;
        K.tag('#md-tag', 'DENIED');
        $('#md-msg').addClass('bad').text(reason);
        draw();   // missed changes get outlined
        run.after(2000, function () { finish(false); });
    }

    function peek() {
        if (S.phase !== 'find' || cfg.mode !== 'memory' || S.peeks <= 0 || S.peeking) return;
        S.peeks--;
        S.peeking = true;
        K.sound('sound-buttonPress');
        draw();
        var started = Date.now();
        var t = run.every(50, function () { memBar(cfg.peekTime - (Date.now() - started), cfg.peekTime, true); });
        run.after(cfg.peekTime, function () {
            run.stop(t);
            S.peeking = false;
            memBar(0, 1, false);
            if (S.phase === 'find') draw();
        });
    }

    function finish(success) {
        if (!active) return;
        active = false;
        window.memoryDiffGame.active = false;
        run.stop(S.tick);
        K.sound(success ? 'sound-success' : 'sound-failure');
        K.result('#memory-diff-container .md-boards', success, success ? 'Images matched' : 'Scan failed');
        run.after(1500, function () {
            $('#memory-diff-container').removeClass('active').fadeOut(300);
            K.post('memoryDiffResult', { success: success, boards: S.round, strikes: S.strikes });
            run.clear();
        });
    }

    function bind() {
        $('#md-gridB').off('click.md').on('click.md', '.md-cell', function () { pick(Number($(this).attr('data-k'))); });
        $(document).off('keydown.md').on('keydown.md', function (e) {
            if (e.code === 'Space') { e.preventDefault(); if (!e.originalEvent || !e.originalEvent.repeat) peek(); }
        });
    }

    function unbind() {
        $('#md-gridB').off('click.md');
        $(document).off('keydown.md');
    }

    var game = window.memoryDiffGame = {
        active: false,
        start: function (config) {
            if (run) run.clear();
            run = K.session();
            cfg = readConfig(config);
            S = { round: 0, strikes: 0, peeks: cfg.peeks, peeking: false, badRound: -1, found: [], diffs: [], A: [], B: [], miss: -1, phase: 'idle' };
            active = true;
            game.active = true;
            $('#md-title').text(cfg.title);
            $('#memory-diff-container .mc-result').remove();
            $('#memory-diff-container').stop(true, true).addClass('active').css('display', 'flex');
            bind();
            startBoard();
        },
        close: function () {
            var was = active;
            active = false;
            game.active = false;
            if (run) { run.clear(); run = null; }
            unbind();
            $('#memory-diff-container').removeClass('active').hide();
            $('#md-gridA, #md-gridB').empty();
            $('#memory-diff-container .mc-result').remove();
            if (was) K.post('memoryDiffClose', {});
        }
    };

    K.register('startMemoryDiff', game);
})();
