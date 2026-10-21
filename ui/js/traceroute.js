// Glitch Minigames - Traceroute
//
// A grid of network nodes joined by links. Hop from SRC to DST one linked node at
// a time (click, or arrow keys / WASD) inside a hop budget and a TTL. Stepping on
// an IDS node is an intrusion: a strike, and a new board. Boards are checked before
// they are shown so a clean route always exists.
//
// Config (merged + clamped in Lua, StartTracerouteGame):
//   cols, rows, ids, extraLinks, traces, maxHops, ttl, maxStrikes, hiddenIds,
//   idsMove (ms, 0 = still), allowBacktrack, labels, title

(function () {
    var K = window.HackKit;
    var W = 580, H = 330;

    var cfg = null, S = null, run = null, active = false;

    function readConfig(c) {
        c = c || {};
        var cols = K.clamp(Math.floor(K.num(c.cols, 10)), 5, 14), rows = K.clamp(Math.floor(K.num(c.rows, 6)), 3, 8);
        return {
            cols: cols, rows: rows,
            ids: K.clamp(Math.floor(K.num(c.ids, 8)), 0, Math.min(25, Math.floor(cols * rows / 3))),
            extraLinks: K.clamp(K.num(c.extraLinks, 0.3), 0, 1),
            traces: K.clamp(Math.floor(K.num(c.traces, 1)), 1, 5),
            maxHops: K.clamp(Math.floor(K.num(c.maxHops, 25)), 5, 60),
            ttl: Math.max(3000, K.num(c.ttl, 30000)),
            maxStrikes: K.clamp(Math.floor(K.num(c.maxStrikes, 0)), 0, 5),
            hiddenIds: c.hiddenIds === true,
            idsMove: Math.max(0, K.num(c.idsMove, 0)),
            allowBacktrack: c.allowBacktrack !== false,
            labels: c.labels !== false,
            title: c.title ? String(c.title) : 'TRACEROUTE'
        };
    }

    // ---- board ---------------------------------------------------------------
    function col(n) { return n % cfg.cols; }
    function row(n) { return Math.floor(n / cfg.cols); }
    function X(n) { return 34 + col(n) * ((W - 68) / (cfg.cols - 1)); }
    function Y(n) { return 26 + row(n) * ((H - 52) / (cfg.rows - 1)); }

    function gridNeighbours(n) {
        var c = col(n), r = row(n), o = [];
        if (c > 0) o.push(n - 1);
        if (c < cfg.cols - 1) o.push(n + 1);
        if (r > 0) o.push(n - cfg.cols);
        if (r < cfg.rows - 1) o.push(n + cfg.cols);
        return o;
    }

    function linked(a, b) { return S.adj[a].indexOf(b) >= 0; }

    // shortest clean route from `from` to DST, avoiding `ids`; null when there is none
    function route(from, ids) {
        var prev = {}, seen = {}, q = [from];
        seen[from] = true;
        while (q.length) {
            var u = q.shift();
            if (u === S.dst) break;
            S.adj[u].forEach(function (v) {
                if (!seen[v] && ids.indexOf(v) < 0) { seen[v] = true; prev[v] = u; q.push(v); }
            });
        }
        if (!seen[S.dst]) return null;
        var path = [S.dst];
        while (path[0] !== from) path.unshift(prev[path[0]]);
        return path;
    }

    function buildBoard() {
        var total = cfg.cols * cfg.rows;
        S.src = (cfg.rows - 1) * cfg.cols;   // bottom left
        S.dst = total - 1;                   // bottom right
        var minLen = cfg.cols + 1;
        for (var attempt = 0; attempt < 60; attempt++) {
            S.adj = []; S.links = [];
            for (var i = 0; i < total; i++) S.adj.push([]);
            var link = function (a, b) { if (!linked(a, b)) { S.adj[a].push(b); S.adj[b].push(a); S.links.push([a, b]); } };
            // random maze: every node reachable
            var seen = {}, stack = [S.src];
            seen[S.src] = true;
            while (stack.length) {
                var cur = stack[stack.length - 1];
                var opts = gridNeighbours(cur).filter(function (n) { return !seen[n]; });
                if (!opts.length) { stack.pop(); continue; }
                var nx = K.sample(opts);
                seen[nx] = true; link(cur, nx); stack.push(nx);
            }
            for (var n = 0; n < total; n++) {
                gridNeighbours(n).forEach(function (m) { if (m > n && Math.random() < cfg.extraLinks) link(n, m); });
            }
            // IDS: never on SRC / DST or right next to SRC
            var banned = [S.src, S.dst].concat(S.adj[S.src]);
            var pool = K.shuffle(Array.apply(null, { length: total }).map(function (_, k) { return k; }))
                .filter(function (k) { return banned.indexOf(k) < 0; });
            S.ids = pool.slice(0, cfg.ids);
            var clean = route(S.src, S.ids);
            // late attempts relax the length rule so a board always comes out
            if (clean && (clean.length >= minLen || attempt > 40)) { S.best = clean.length - 1; break; }
        }
        if (!route(S.src, S.ids)) S.ids = [];   // safety net, never ship an impossible board
        S.best = route(S.src, S.ids).length - 1;
        S.maxHops = Math.max(cfg.maxHops, S.best + 2);
        S.label = [];
        for (var k = 0; k < total; k++) S.label.push(K.hex2());
        S.label[S.src] = 'SRC'; S.label[S.dst] = 'DST';
        S.route = [S.src];
        S.hops = 0;
        S.hit = -1;
    }

    function revealed(n) {
        if (!cfg.hiddenIds || S.phase === 'over') return true;
        return S.route.some(function (r) { return r === n || linked(r, n); });
    }

    // ---- drawing -------------------------------------------------------------
    function draw() {
        var cur = S.route[S.route.length - 1];
        var next = S.phase === 'route' ? S.adj[cur].filter(function (n) { return n === S.route[S.route.length - 2] ? cfg.allowBacktrack : S.route.indexOf(n) < 0; }) : [];
        var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg">';
        S.links.forEach(function (l) {
            svg += '<line class="tr-link" x1="' + X(l[0]) + '" y1="' + Y(l[0]) + '" x2="' + X(l[1]) + '" y2="' + Y(l[1]) + '"/>';
        });
        if (S.hit >= 0) svg += '<circle class="tr-pulse" cx="' + X(S.hit) + '" cy="' + Y(S.hit) + '" r="26"/>';
        svg += '<polyline class="tr-route" points="' + S.route.map(function (n) { return X(n) + ',' + Y(n); }).join(' ') + '"/>';
        for (var n = 0; n < S.adj.length; n++) {
            var x = X(n), y = Y(n), isIds = S.ids.indexOf(n) >= 0 && revealed(n), lbl = S.label[n], lc = 'tr-lbl';
            if (isIds) {
                svg += '<rect class="tr-ids' + (n === S.hit ? ' hit' : '') + '" x="' + (x - 8) + '" y="' + (y - 8) + '" width="16" height="16" transform="rotate(45 ' + x + ' ' + y + ')"/>';
                lbl = 'IDS'; lc += ' ids';
            } else if (n === S.src) {
                svg += '<rect class="tr-src" x="' + (x - 7) + '" y="' + (y - 7) + '" width="14" height="14" rx="2"/>'; lc += ' end';
            } else if (n === S.dst) {
                svg += '<rect class="tr-dst" x="' + (x - 7) + '" y="' + (y - 7) + '" width="14" height="14" rx="2"/>'; lc += ' end';
            } else {
                var cls = 'tr-node' + (S.route.indexOf(n) >= 0 ? ' on' : '') + (next.indexOf(n) >= 0 ? ' next' : '');
                svg += '<rect class="' + cls + '" x="' + (x - 6) + '" y="' + (y - 6) + '" width="12" height="12" rx="2"/>';
            }
            if (n === cur && S.hit < 0) svg += '<circle class="tr-ring" cx="' + x + '" cy="' + y + '" r="12"/>';
            if (cfg.labels || isIds || n === S.src || n === S.dst) svg += '<text class="' + lc + '" x="' + x + '" y="' + (y - 13) + '">' + lbl + '</text>';
            svg += '<circle class="tr-hit' + (next.indexOf(n) >= 0 ? ' tr-can' : '') + '" data-n="' + n + '" cx="' + x + '" cy="' + y + '" r="15"/>';
        }
        $('#tr-board').html(svg + '</svg>');
        drawSide();
    }

    function drawSide() {
        $('#tr-hops-big').text(S.hops + ' / ' + S.maxHops);
        var dots = '', cols = Math.max(7, Math.ceil(Math.sqrt(S.maxHops * 1.6)));
        for (var h = 0; h < S.maxHops; h++) dots += '<i class="' + (h < S.hops ? 'used' : '') + '"></i>';
        $('#tr-hop-grid').css('grid-template-columns', 'repeat(' + cols + ', 10px)').html(dots);
        var names = S.route.map(function (n) { return n === S.hit ? 'IDS' : S.label[n]; });
        if (names.length > 9) names = ['...'].concat(names.slice(-8));
        $('#tr-route').text(names.join(' > '));
        $('#tr-round').text(Math.min(S.trace + 1, cfg.traces) + ' / ' + cfg.traces);
        $('#tr-strikes').text(K.strikesText(S.strikes, cfg.maxStrikes)).parent().toggle(cfg.maxStrikes > 0);
        K.pips('#tr-pips', K.roundStates(cfg.traces, S.trace, S.badTrace));
    }

    function alertBox(text, good) {
        $('#tr-board .tr-alert').remove();
        if (text) $('<div class="tr-alert' + (good ? ' good' : '') + '"></div>').text(text).appendTo('#tr-board');
    }

    // ---- flow ----------------------------------------------------------------
    function startBoard() {
        S.phase = 'route';
        S.badTrace = -1;
        buildBoard();
        alertBox('');
        K.tag('#tr-tag', cfg.hiddenIds ? 'BLIND' : 'ROUTING');
        $('#tr-msg').removeClass('bad good').text(cfg.hiddenIds ? 'IDS only show up next to your route' : 'Click a linked node to hop to it. Avoid IDS.');
        draw();
        K.sound('sound-buttonPress');
        S.deadline = Date.now() + cfg.ttl;
        S.tick = run.every(50, function () {
            var left = S.deadline - Date.now();
            K.timer('#tr-bar', '#tr-time', left, cfg.ttl);
            $('#tr-ttl').css('width', Math.max(0, left / cfg.ttl * 100) + '%');
            if (left <= 0) lose('TTL expired', 'EXPIRED');
        });
        if (cfg.idsMove > 0) S.mover = run.every(cfg.idsMove, moveIds);
    }

    function hop(n) {
        if (!active || S.phase !== 'route') return;
        var cur = S.route[S.route.length - 1];
        if (n === cur || !linked(cur, n)) return;
        var at = S.route.indexOf(n);
        if (at >= 0) {
            if (!cfg.allowBacktrack || at !== S.route.length - 2) return;
            S.route.pop();
        } else {
            S.route.push(n);
        }
        S.hops++;
        K.sound('sound-click');

        if (S.ids.indexOf(n) >= 0) { intrusion(n); return; }
        if (n === S.dst) { traceDone(); return; }
        draw();
        if (S.hops >= S.maxHops) lose('Out of hops', 'DROPPED');
    }

    function intrusion(n) {
        S.phase = 'over';
        S.hit = n;
        stopBoard();
        S.strikes++;
        S.badTrace = S.trace;
        draw();
        alertBox('INTRUSION DETECTED');
        K.tag('#tr-tag', 'BLOCKED');
        if (S.strikes > cfg.maxStrikes) {
            $('#tr-msg').addClass('bad').text('Route burned');
            run.after(1600, function () { finish(false); });
            return;
        }
        K.sound('sound-penalty');
        $('#tr-msg').addClass('bad').text('Route burned. New trace in 2 seconds');
        run.after(2000, startBoard);
    }

    function traceDone() {
        S.phase = 'over';
        stopBoard();
        S.trace++;
        draw();
        alertBox('ROUTE ESTABLISHED', true);
        if (S.trace >= cfg.traces) { finish(true); return; }
        K.sound('sound-success');
        $('#tr-msg').addClass('good').text('Trace ' + S.trace + ' of ' + cfg.traces + ' done, next board loading');
        run.after(1500, startBoard);
    }

    function lose(reason, label) {
        if (S.phase !== 'route') return;
        S.phase = 'over';
        stopBoard();
        S.badTrace = S.trace;
        draw();
        K.tag('#tr-tag', label);
        $('#tr-msg').addClass('bad').text(reason);
        run.after(1200, function () { finish(false); });
    }

    function stopBoard() {
        run.stop(S.tick);
        if (S.mover) { run.stop(S.mover); S.mover = null; }
    }

    // IDS jump to new nodes, never onto the route, next to the current node, or the last way through
    function moveIds() {
        if (S.phase !== 'route') return;
        var cur = S.route[S.route.length - 1];
        var total = cfg.cols * cfg.rows;
        S.ids = S.ids.map(function (old, idx) {
            for (var t = 0; t < 8; t++) {
                var n = K.rand(total);
                if (n === S.src || n === S.dst || S.route.indexOf(n) >= 0 || linked(cur, n) || S.ids.indexOf(n) >= 0) continue;
                var trial = S.ids.slice();
                trial[idx] = n;
                if (route(cur, trial)) return n;
            }
            return old;
        });
        draw();
    }

    function finish(success) {
        if (!active) return;
        active = false;
        window.tracerouteGame.active = false;
        stopBoard();
        K.sound(success ? 'sound-success' : 'sound-failure');
        run.after(1500, function () {
            $('#traceroute-container').removeClass('active').fadeOut(300);
            K.post('tracerouteResult', { success: success, traces: S.trace, strikes: S.strikes });
            run.clear();
        });
    }

    // arrow keys / WASD hop toward that side if a link goes there
    var DIRS = { ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowRight: [1, 0], KeyD: [1, 0], ArrowUp: [0, -1], KeyW: [0, -1], ArrowDown: [0, 1], KeyS: [0, 1] };

    function bind() {
        $('#tr-board').off('click.tr').on('click.tr', '.tr-hit', function () { hop(Number($(this).attr('data-n'))); });
        $(document).off('keydown.tr').on('keydown.tr', function (e) {
            var d = DIRS[e.code];
            if (!d || !active || S.phase !== 'route') return;
            e.preventDefault();
            var cur = S.route[S.route.length - 1], c = col(cur) + d[0], r = row(cur) + d[1];
            if (c < 0 || r < 0 || c >= cfg.cols || r >= cfg.rows) return;
            hop(r * cfg.cols + c);
        });
    }

    function unbind() {
        $('#tr-board').off('click.tr');
        $(document).off('keydown.tr');
    }

    var game = window.tracerouteGame = {
        active: false,
        start: function (config) {
            if (run) run.clear();
            run = K.session();
            cfg = readConfig(config);
            S = { trace: 0, strikes: 0, badTrace: -1, route: [], ids: [], adj: [], links: [], label: [], hops: 0, hit: -1, phase: 'idle' };
            active = true;
            game.active = true;
            $('#tr-title').text(cfg.title);
            $('#traceroute-container').stop(true, true).addClass('active').css('display', 'flex');
            bind();
            startBoard();
        },
        close: function () {
            var was = active;
            active = false;
            game.active = false;
            if (run) { run.clear(); run = null; }
            unbind();
            $('#traceroute-container').removeClass('active').hide();
            $('#tr-board').empty();
            if (was) K.post('tracerouteClose', {});
        }
    };

    K.register('startTraceroute', game);
})();
