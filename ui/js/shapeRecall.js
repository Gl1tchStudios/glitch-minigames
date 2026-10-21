// Glitch Minigames - Shape Recall
//
// Memory captcha based on the NoPixel number / shape puzzle. Numbers flash on the
// tiles, the tiles turn into coloured shapes with two words and a number, and the
// player types what the question asks ("enter the shape (2) and shape text (1)").
// Puzzle colours are fixed (they are the puzzle), only the panel follows the theme.
//
// Config (merged + clamped in Lua, StartShapeRecallGame):
//   tiles, columns (0 = auto), rounds, questionsPerRound, questionTypes, answerTime,
//   speedUp, minAnswerTime, numberTime, shrinkTime, maxStrikes, shapes, palette,
//   order ('strict' | 'any'), intro (true | false | list of lines), showAnswerOnFail, title

(function () {
    var K = window.HackKit;

    var PALETTE = {
        black: '#000000', white: '#ffffff', blue: '#1991F9', red: '#8C0C00',
        yellow: '#FFE335', orange: '#FF9900', green: '#46A04F', purple: '#A43AB5'
    };
    var SHAPES = {
        square: function (c) { return '<rect x="14" y="14" width="122" height="122" fill="' + c + '" stroke="#000" stroke-width="1"/>'; },
        triangle: function (c) { return '<polygon points="10 140 75 12 140 140" fill="' + c + '" stroke="#000" stroke-width="1"/>'; },
        rectangle: function (c) { return '<rect x="8" y="38" width="134" height="74" fill="' + c + '" stroke="#000" stroke-width="1"/>'; },
        circle: function (c) { return '<circle cx="75" cy="75" r="64" fill="' + c + '" stroke="#000" stroke-width="1"/>'; },
        diamond: function (c) { return '<polygon points="75 8 142 75 75 142 8 75" fill="' + c + '" stroke="#000" stroke-width="1"/>'; },
        hexagon: function (c) { return '<polygon points="40 14 110 14 144 75 110 136 40 136 6 75" fill="' + c + '" stroke="#000" stroke-width="1"/>'; },
        star: function (c) { return '<polygon points="75 6 92 54 144 56 103 87 118 138 75 108 32 138 47 87 6 56 58 54" fill="' + c + '" stroke="#000" stroke-width="1"/>'; }
    };
    // key -> [question text, answer from a tile]
    var QUESTIONS = {
        background:   ['background colour', function (t) { return t.bg; }],
        shapeColour:  ['shape colour',      function (t) { return t.shapeCol; }],
        textColour:   ['text colour',       function (t) { return t.textCol; }],
        numberColour: ['number colour',     function (t) { return t.numCol; }],
        colourText:   ['colour text',       function (t) { return t.top; }],
        shapeText:    ['shape text',        function (t) { return t.bottom; }],
        shape:        ['shape',             function (t) { return t.shape; }]
    };
    var INTRO = ['Establishing connection', 'Access code flagged', 'Human input required'];

    var cfg = null, S = null, run = null, active = false;

    function listOr(value, allowed, fallback) {
        var out = (Array.isArray(value) ? value : []).map(function (v) { return String(v); })
            .filter(function (v) { return allowed[v] !== undefined; });
        return out.length ? out : fallback.slice();
    }

    function readConfig(c) {
        c = c || {};
        var palette = listOr(c.palette, PALETTE, Object.keys(PALETTE));
        if (palette.length < 5) palette = Object.keys(PALETTE);   // the colour guards need 5
        return {
            tiles: K.clamp(Math.floor(K.num(c.tiles, 4)), 2, 8),
            columns: Math.floor(K.num(c.columns, 0)),
            rounds: K.clamp(Math.floor(K.num(c.rounds, 4)), 1, 10),
            questionsPerRound: K.clamp(Math.floor(K.num(c.questionsPerRound, 2)), 1, 4),
            questionTypes: listOr(c.questionTypes, QUESTIONS, Object.keys(QUESTIONS)),
            answerTime: Math.max(1000, K.num(c.answerTime, 7000)),
            speedUp: Math.max(0, K.num(c.speedUp, 0)),
            minAnswerTime: Math.max(1000, K.num(c.minAnswerTime, 2500)),
            numberTime: Math.max(200, K.num(c.numberTime, 1500)),
            shrinkTime: Math.max(0, K.num(c.shrinkTime, 1500)),
            maxStrikes: K.clamp(Math.floor(K.num(c.maxStrikes, 0)), 0, 5),
            shapes: listOr(c.shapes, SHAPES, ['square', 'triangle', 'rectangle', 'circle']),
            palette: palette,
            order: c.order === 'any' ? 'any' : 'strict',
            intro: c.intro === false ? [] : (Array.isArray(c.intro) ? c.intro.map(String) : INTRO),
            showAnswerOnFail: c.showAnswerOnFail !== false,
            title: c.title ? String(c.title) : 'SHAPE RECALL'
        };
    }

    // ---- puzzle --------------------------------------------------------------
    function makeTile(num) {
        var t = {
            num: num,
            shape: K.sample(cfg.shapes),
            top: K.sample(cfg.palette),
            bottom: K.sample(cfg.shapes),
            bg: K.sample(cfg.palette),
            textCol: K.sample(cfg.palette),
            numCol: K.sample(cfg.palette),
            shapeCol: K.sample(cfg.palette)
        };
        // the NoPixel guards: words never vanish into the tile, the shape never hides anything
        while (t.textCol === t.bg) t.textCol = K.sample(cfg.palette);
        while ([t.bg, t.textCol, t.numCol].indexOf(t.shapeCol) >= 0) t.shapeCol = K.sample(cfg.palette);
        return t;
    }

    function makeQuestion(tiles) {
        var n = cfg.questionsPerRound;
        var types = K.shuffle(cfg.questionTypes), picks = K.shuffle(tiles);
        var parts = [];
        for (var i = 0; i < n; i++) {
            var tile = picks[i % picks.length];
            var type = types[i % types.length];
            parts.push({ type: type, tile: tile, text: QUESTIONS[type][0], answer: QUESTIONS[type][1](tile) });
        }
        return parts;
    }

    function questionHtml(parts) {
        var bits = parts.map(function (p) { return K.esc(p.text) + ' <b>(' + p.tile.num + ')</b>'; });
        var body;
        if (bits.length === 1) body = bits[0];
        else body = bits.slice(0, -1).join(', ') + ' <span class="sr-and">and</span> ' + bits[bits.length - 1];
        return 'Enter the ' + body;
    }

    function words(text) {
        return String(text || '').toLowerCase().split(/[\s,\/]+/).filter(Boolean);
    }

    function isCorrect(typed, parts) {
        var got = words(typed), want = parts.map(function (p) { return p.answer; });
        if (got.length !== want.length) return false;
        if (cfg.order === 'any') { got = got.slice().sort(); want = want.slice().sort(); }
        for (var i = 0; i < want.length; i++) if (got[i] !== want[i]) return false;
        return true;
    }

    function tileSvg(t) {
        function txt(s, c, size, y, font) {
            return '<text x="50%" y="' + y + '%" fill="' + c + '" stroke="#000" stroke-width="1" style="font-size:' + size +
                'px" font-family="' + (font || "'Archivo Black'") + ', sans-serif" dominant-baseline="middle" text-anchor="middle">' + s + '</text>';
        }
        return '<svg viewBox="0 0 150 150" xmlns="http://www.w3.org/2000/svg">' + SHAPES[t.shape](PALETTE[t.shapeCol]) +
            txt(t.top.toUpperCase(), PALETTE[t.textCol], 20, 31) + txt(t.bottom.toUpperCase(), PALETTE[t.textCol], 20, 69) +
            txt(t.num, PALETTE[t.numCol], 62, 51, 'Arial') + '</svg>';
    }

    // ---- drawing -------------------------------------------------------------
    function columns() {
        if (cfg.columns > 0) return Math.min(cfg.columns, cfg.tiles);
        return cfg.tiles <= 4 ? cfg.tiles : Math.ceil(cfg.tiles / 2);
    }

    function drawBoard(mode) {
        var $b = $('#sr-board').css('grid-template-columns', 'repeat(' + columns() + ', auto)').empty();
        S.tiles.forEach(function (t, i) {
            var $t = $('<div class="sr-tile"></div>');
            if (mode === 'blank') $t.addClass('sr-dark');
            else if (mode === 'numbers') $t.addClass('sr-dark').html('<span class="sr-num">' + S.order[i] + '</span>');
            else $t.addClass('sr-flip').css('background', PALETTE[t.bg]).html(tileSvg(t));
            $b.append($t);
        });
    }

    function drawStats() {
        $('#sr-round').text(Math.min(S.round + 1, cfg.rounds) + ' / ' + cfg.rounds);
        $('#sr-strikes').text(K.strikesText(S.strikes, cfg.maxStrikes)).parent().toggle(cfg.maxStrikes > 0);
        var states = K.roundStates(cfg.rounds, S.round, S.badRound);
        K.pips('#sr-pips', states, 'sr-pip');
    }

    // ---- flow ----------------------------------------------------------------
    function intro(i) {
        if (i >= cfg.intro.length) { $('#sr-msg').text(''); startRound(); return; }
        $('#sr-msg').text(cfg.intro[i] + '...');
        K.sound('sound-click');
        run.after(850, function () { intro(i + 1); });
    }

    function startRound() {
        S.phase = 'numbers';
        S.badRound = -1;
        // numbers 1..N in random tile order, fresh tiles every round
        S.order = K.shuffle(Array.apply(null, { length: cfg.tiles }).map(function (_, i) { return i + 1; }));
        S.tiles = S.order.map(function (n) { return makeTile(n); });
        S.parts = makeQuestion(S.tiles);

        K.tag('#sr-tag', 'MEMORISE');
        $('#sr-msg').text('Remember where each number is');
        $('#sr-question').html('<span class="sr-and">Question shows after the numbers</span>');
        $('#sr-answer').addClass('sr-hide');
        $('#sr-input').val('').removeClass('correct incorrect').prop('disabled', true);
        $('#sr-reveal').hide();
        drawBoard('numbers');
        drawStats();

        var total = cfg.numberTime + cfg.shrinkTime, started = Date.now();
        document.getElementById('shape-recall-container').style.setProperty('--sr-shrink', cfg.shrinkTime + 'ms');
        run.after(cfg.numberTime, function () { $('#sr-board .sr-num').addClass('sr-gone'); });
        S.tick = run.every(50, function () { K.timer('#sr-bar', '#sr-time', total - (Date.now() - started), total); });
        run.after(total, function () { run.stop(S.tick); showPuzzle(); });
    }

    function showPuzzle() {
        S.phase = 'answer';
        K.tag('#sr-tag', 'CAPTCHA');
        $('#sr-msg').text('');
        $('#sr-question').html(questionHtml(S.parts));
        drawBoard('puzzle');
        $('#sr-answer').removeClass('sr-hide');
        $('#sr-input').prop('disabled', false).val('').trigger('focus');
        K.sound('sound-buttonPress');

        var total = S.answerTime, started = Date.now(), lastTick = Math.ceil(total / 1000);
        S.tick = run.every(50, function () {
            var left = total - (Date.now() - started);
            K.timer('#sr-bar', '#sr-time', left, total);
            var sec = Math.ceil(left / 1000);
            if (sec < lastTick && sec <= 3 && sec > 0) K.sound('sound-click');   // last-seconds tick
            lastTick = sec;
            if (left <= 0) answer(null);
        });
    }

    function answer(typed) {
        if (!active || S.phase !== 'answer') return;
        S.phase = 'judge';
        run.stop(S.tick);
        $('#sr-input').prop('disabled', true);
        var right = typed !== null && isCorrect(typed, S.parts);

        if (right) {
            $('#sr-input').addClass('correct');
            S.round++;
            S.answerTime = Math.max(cfg.minAnswerTime, S.answerTime - cfg.speedUp);
            drawStats();
            if (S.round >= cfg.rounds) { finish(true); return; }
            K.sound('sound-success');
            $('#sr-msg').removeClass('bad').addClass('good').text('Correct');
            run.after(900, function () { $('#sr-msg').removeClass('good'); startRound(); });
            return;
        }

        S.strikes++;
        S.badRound = S.round;
        drawStats();
        $('#sr-input').addClass('incorrect');
        if (typed === null) $('#sr-input').val('');
        var outOfStrikes = S.strikes > cfg.maxStrikes;
        if (outOfStrikes) {
            K.tag('#sr-tag', 'DENIED');
            $('#sr-msg').addClass('bad').text(typed === null ? 'Out of time' : 'Wrong answer');
            if (cfg.showAnswerOnFail) {
                $('#sr-reveal').html('Answer was <span>' + K.esc(S.parts.map(function (p) { return p.answer; }).join(' ')) + '</span>').show();
                run.after(2500, function () { finish(false); });
            } else {
                finish(false);
            }
            return;
        }
        K.sound('sound-penalty');
        $('#sr-msg').addClass('bad').text((typed === null ? 'Out of time' : 'Wrong answer') + ', new puzzle');
        run.after(1300, function () { $('#sr-msg').removeClass('bad'); startRound(); });
    }

    function finish(success) {
        if (!active) return;
        active = false;
        window.shapeRecallGame.active = false;
        run.stop(S.tick);
        K.sound(success ? 'sound-success' : 'sound-failure');
        K.result('.sr-display', success, success ? 'System bypassed' : 'Access denied');
        run.after(1500, function () {
            $('#shape-recall-container').removeClass('active').fadeOut(300);
            K.post('shapeRecallResult', { success: success, rounds: S.round, strikes: S.strikes });
            run.clear();
        });
    }

    function bind() {
        $('#sr-submit').off('click.sr').on('click.sr', function () { answer($('#sr-input').val()); });
        $('#sr-input').off('keydown.sr').on('keydown.sr', function (e) {
            if (e.key === 'Enter') { e.preventDefault(); answer($(this).val()); }
        });
    }

    function unbind() {
        $('#sr-submit').off('click.sr');
        $('#sr-input').off('keydown.sr');
    }

    var game = window.shapeRecallGame = {
        active: false,
        start: function (config) {
            if (run) run.clear();
            run = K.session();
            cfg = readConfig(config);
            S = { round: 0, strikes: 0, badRound: -1, answerTime: cfg.answerTime, tiles: [], order: [], parts: [] };
            active = true;
            game.active = true;

            $('#sr-title').text(cfg.title);
            $('#sr-msg').removeClass('bad good').text('');
            $('#sr-question').empty();
            $('#sr-answer').addClass('sr-hide');
            $('#sr-reveal').hide();
            $('.sr-display .mc-result').remove();
            $('#shape-recall-container').stop(true, true).addClass('active').css('display', 'flex');
            bind();

            S.tiles = Array.apply(null, { length: cfg.tiles }).map(function () { return {}; });
            drawBoard('blank');
            drawStats();
            K.timer('#sr-bar', '#sr-time', 0, 1);
            K.tag('#sr-tag', 'CAPTCHA');
            intro(0);
        },
        close: function () {
            var was = active;
            active = false;
            game.active = false;
            if (run) { run.clear(); run = null; }
            unbind();
            $('#shape-recall-container').removeClass('active').hide();
            $('#sr-board').empty();
            $('.sr-display .mc-result').remove();
            if (was) K.post('shapeRecallClose', {});
        }
    };

    K.register('startShapeRecall', game);
})();
