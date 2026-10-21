// -- Glitch Minigames - Wire Connect
// -- Grab a plug on the left, drag the cable across and drop it in the socket of
// -- the same colour on the right. A wrong socket throws the cable back.
// -- Click a plug then a socket works too. Click a plugged cable to pull it out.
// -- 8 cables by default (3-8); jacks and sockets land at random spots every game.

window.wireConnectGame = (function () {

    // Fixed palette
    const PALETTE = ['#f55151', '#4dc0fa', '#4ade80', '#facc15', '#c084fc', '#fb923c', '#f472b6', '#e5e7eb'];
    const SNAP = 30;          // px: how close to a socket a drop has to land

    let config     = {};
    let active     = false;
    let terminals  = [];      // { id, side, colorIdx, color, fx, fy } (fx / fy = 0..1 of the board)
    let wires      = [];      // { from: left id, to: right id }
    let drag       = null;    // { from, x, y, moved } while a cable is in hand
    let selectedId = null;    // click-click mode: picked plug
    let timerInt   = null;
    let timeLeft   = 0;
    let geo        = null;    // { W, H } board size in px
    let $live      = null;    // the SVG path group of the cable in hand

    // --- geometry ------------------------------------------------------------

    function measure() {
        const $board = $('#wc-board');
        geo = { W: $board.width() || 600, H: $board.height() || 420 };
    }

    function anchor(t) {
        return { x: t.fx * geo.W, y: t.fy * geo.H };
    }

    // Random spots in a band of the board, kept apart so nothing overlaps. Left jacks
    // go in the left third, sockets in the right third; the gap shrinks if it can't fit.
    function scatter(count, x0, x1) {
        const pts = [];
        let gap = 62;
        for (let tries = 0; pts.length < count; tries++) {
            if (tries > 400) { gap -= 6; tries = 0; pts.length = 0; }
            const fx = x0 + Math.random() * (x1 - x0), fy = 0.08 + Math.random() * 0.84;
            const ok = pts.every(p => Math.hypot((p.fx - fx) * geo.W, (p.fy - fy) * geo.H) >= gap);
            if (ok) pts.push({ fx, fy });
        }
        return pts;
    }

    // A hanging cable: both ends pull sideways, the middle sags with length.
    function cablePath(x1, y1, x2, y2) {
        const dx = x2 - x1, dist = Math.hypot(dx, y2 - y1);
        const sag = Math.min(70, dist * 0.22);
        const c1x = x1 + Math.max(40, Math.abs(dx) * 0.35), c2x = x2 - Math.max(40, Math.abs(dx) * 0.35) * Math.sign(dx || 1);
        return `M${x1},${y1} C${c1x},${y1 + sag} ${c2x},${y2 + sag} ${x2},${y2}`;
    }

    function cableSvg(d, color, extraCls) {
        const cls = extraCls ? ` class="${extraCls}"` : '';
        return `<g${cls}>
            <path d="${d}" stroke="rgba(0,0,0,0.45)" stroke-width="9" fill="none" stroke-linecap="round" transform="translate(0,3)"/>
            <path d="${d}" stroke="${color}" stroke-width="16" fill="none" stroke-linecap="round" opacity="0.16"/>
            <path d="${d}" stroke="${color}" stroke-width="7" fill="none" stroke-linecap="round"/>
            <path d="${d}" stroke="rgba(255,255,255,0.4)" stroke-width="1.6" fill="none" stroke-linecap="round" transform="translate(0,-1.5)"/>
        </g>`;
    }

    // The plug head at the loose end of a cable.
    function plugSvg(x, y, color) {
        return `<g class="wc-plug-head" transform="translate(${x},${y})">
            <rect x="-11" y="-8" width="16" height="16" rx="3" fill="${color}" stroke="rgba(0,0,0,0.5)" stroke-width="1"/>
            <rect x="5" y="-4" width="8" height="2.6" rx="1" fill="#d6d6d6"/>
            <rect x="5" y="1.4" width="8" height="2.6" rx="1" fill="#d6d6d6"/>
        </g>`;
    }

    // --- board ---------------------------------------------------------------

    function buildBoard() {
        const count  = Math.max(3, Math.min(PALETTE.length, config.wireCount || 8));
        const colors = PALETTE.slice(0, count);
        measure();
        const lp = scatter(count, 0.06, 0.3), rp = scatter(count, 0.7, 0.94);
        const rightOrder = [...Array(count).keys()].sort(() => Math.random() - 0.5);
        terminals = [];
        for (let i = 0; i < count; i++) terminals.push({ id: 'L' + i, side: 'left', colorIdx: i, color: colors[i], fx: lp[i].fx, fy: lp[i].fy });
        for (let i = 0; i < count; i++) terminals.push({ id: 'R' + i, side: 'right', colorIdx: rightOrder[i], color: colors[rightOrder[i]], fx: rp[i].fx, fy: rp[i].fy });
        wires = []; drag = null; selectedId = null;
        renderBoard();
    }

    function renderBoard() {
        const $board = $('#wc-board');
        $board.empty();
        measure();
        const { W, H } = geo;
        const $svg = $(`<svg class="wc-svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"></svg>`);

        // Plugged cables
        let html = '';
        wires.forEach(w => {
            const lT = terminals.find(t => t.id === w.from), rT = terminals.find(t => t.id === w.to);
            if (!lT || !rT) return;
            const a = anchor(lT), b = anchor(rT);
            html += cableSvg(cablePath(a.x, a.y, b.x - 14, b.y), lT.color, w.fresh ? 'wc-cable-in' : '');
            html += plugSvg(b.x - 14, b.y, lT.color);
            w.fresh = false;
        });
        // Loose cables: a short stub hanging off each unplugged left jack
        terminals.filter(t => t.side === 'left').forEach(t => {
            if (wires.some(w => w.from === t.id)) return;
            if (drag && drag.from === t.id) return;
            const a = anchor(t);
            const hx = a.x + 34, hy = a.y + 6;
            html += cableSvg(cablePath(a.x, a.y, hx, hy), t.color, selectedId === t.id ? 'wc-cable-picked' : '');
            html += plugSvg(hx, hy, t.color);
        });
        $svg.html(html + '<g id="wc-live"></g>');
        $board.append($svg);
        $live = $svg.find('#wc-live');

        // Jacks (left) and sockets (right)
        terminals.forEach(t => {
            const a = anchor(t);
            const plugged = wires.some(w => w.from === t.id || w.to === t.id);
            const $el = $(`<div class="wc-term ${t.side === 'left' ? 'wc-jack' : 'wc-socket'} ${plugged ? 'wc-plugged' : ''} ${selectedId === t.id ? 'wc-selected' : ''}"
                data-id="${t.id}" style="left:${a.x}px;top:${a.y}px;--wc-c:${t.color}">
                <span class="wc-label left">${t.colorIdx + 1}</span></div>`);
            // the loose plug head is grabbable too
            $board.append($el);
        });
        if (drag) drawLive();
        updateStatus();
    }

    function drawLive() {
        if (!drag || !$live) return;
        const lT = terminals.find(t => t.id === drag.from);
        const a = anchor(lT);
        const near = socketAt(drag.x, drag.y);
        const end = near ? { x: anchor(near).x - 14, y: anchor(near).y } : { x: drag.x, y: drag.y };
        $live.html(cableSvg(cablePath(a.x, a.y, end.x, end.y), lT.color) + plugSvg(end.x, end.y, lT.color));
        $('#wc-board .wc-socket').removeClass('wc-hover');
        if (near) $(`#wc-board .wc-socket[data-id="${near.id}"]`).addClass('wc-hover');
    }

    function updateStatus() {
        const total = terminals.filter(t => t.side === 'left').length;
        const left = total - wires.length;
        $('#wc-status').text(drag ? 'Drop it in the socket of the same colour'
            : left > 0 ? `Connect ${left} more cable${left > 1 ? 's' : ''}` : 'All connected')
            .toggleClass('wc-status-ok', left === 0);
    }

    // --- hit tests -------------------------------------------------------------

    function boardPoint(e) {
        const r = document.getElementById('wc-board').getBoundingClientRect();
        // the container may be scaled by CSS: map client px to board px
        const sx = geo.W / (r.width || geo.W), sy = geo.H / (r.height || geo.H);
        return { x: (e.clientX - r.left) * sx, y: (e.clientY - r.top) * sy };
    }

    function socketAt(x, y) {
        let best = null, bestD = SNAP;
        terminals.forEach(t => {
            if (t.side !== 'right') return;
            const a = anchor(t);
            const d = Math.hypot(a.x - x, a.y - y);
            if (d < bestD) { best = t; bestD = d; }
        });
        return best;
    }

    // A left jack, or the loose plug hanging off it.
    function jackAt(x, y) {
        let best = null, bestD = 26;
        terminals.forEach(t => {
            if (t.side !== 'left') return;
            const a = anchor(t);
            const plugged = wires.some(w => w.from === t.id);
            const pts = plugged ? [a] : [a, { x: a.x + 34, y: a.y + 6 }];
            pts.forEach(p => { const d = Math.hypot(p.x - x, p.y - y); if (d < bestD) { best = t; bestD = d; } });
        });
        // a plugged cable can also be grabbed at its socket end
        if (!best) {
            const s = socketAt(x, y);
            const w = s && wires.find(w2 => w2.to === s.id);
            if (w) best = terminals.find(t => t.id === w.from);
        }
        return best;
    }

    // --- plugging ----------------------------------------------------------------

    function tryPlug(fromId, socket) {
        const lT = terminals.find(t => t.id === fromId);
        if (!lT || !socket) return false;
        if (lT.colorIdx !== socket.colorIdx) {
            // wrong socket: the cable is thrown back
            playSoundSafe('sound-failure', 0.35);
            const $s = $(`#wc-board .wc-socket[data-id="${socket.id}"]`);
            $s.addClass('wc-reject');
            setTimeout(() => $s.removeClass('wc-reject'), 450);
            $('#wc-status').text('Wrong socket').removeClass('wc-status-ok');
            return false;
        }
        wires = wires.filter(w => w.from !== fromId && w.to !== socket.id);
        wires.push({ from: fromId, to: socket.id, fresh: true });
        playSoundSafe('sound-click');
        return true;
    }

    function unplug(fromId) { wires = wires.filter(w => w.from !== fromId); }

    function onDown(e) {
        if (!active || e.button !== 0) return;
        measure();
        const p = boardPoint(e);
        // click-click: a plug is picked and this press is on a socket
        if (selectedId) {
            const s = socketAt(p.x, p.y);
            if (s) {
                const from = selectedId;
                selectedId = null;
                tryPlug(from, s);
                renderBoard();
                checkWin();
                e.preventDefault();
                return;
            }
        }
        const t = jackAt(p.x, p.y);
        if (!t) { if (selectedId) { selectedId = null; renderBoard(); } return; }
        e.preventDefault();
        const wasPlugged = wires.some(w => w.from === t.id);
        unplug(t.id);
        selectedId = null;
        drag = { from: t.id, x: p.x, y: p.y, sx: p.x, sy: p.y, moved: false, wasPlugged };
        try { document.getElementById('wc-board').setPointerCapture(e.pointerId); } catch (_) { /* not supported */ }
        renderBoard();
    }

    function onMove(e) {
        if (!drag) return;
        const p = boardPoint(e);
        drag.x = Math.max(0, Math.min(geo.W, p.x));
        drag.y = Math.max(0, Math.min(geo.H, p.y));
        if (Math.hypot(drag.x - drag.sx, drag.y - drag.sy) > 6) drag.moved = true;
        drawLive();
        updateStatus();
    }

    function onUp() {
        if (!drag) return;
        const d = drag;
        drag = null;
        if (!d.moved) {
            // a click: pick this plug for click-click mode (a plugged cable just comes out)
            selectedId = d.wasPlugged ? null : d.from;
            renderBoard();
            return;
        }
        const s = socketAt(d.x, d.y);
        if (s) tryPlug(d.from, s);
        renderBoard();
        checkWin();
    }

    function checkWin() {
        const count = terminals.filter(t => t.side === 'left').length;
        if (wires.length < count) return;
        for (const w of wires) {
            const lT = terminals.find(t => t.id === w.from), rT = terminals.find(t => t.id === w.to);
            if (!lT || !rT || lT.colorIdx !== rT.colorIdx) return;
        }
        endGame(true);
    }

    function endGame(success) {
        clearInterval(timerInt);
        active = false; drag = null;
        window.wireConnectGame.active = false;
        const $c = $('#wire-connect-container');
        $c.addClass(success ? 'flash-success' : 'flash-fail');
        playSoundSafe(success ? 'sound-success' : 'sound-failure');
        setTimeout(() => {
            $c.fadeOut(300, function () {
                $.post('https://glitch-minigames/wireConnectResult', JSON.stringify({ success: success }));
            });
        }, 550);
    }

    // --- timer -----------------------------------------------------------------

    function startTimer() {
        $('#wc-time-text').text('');
        $('#wc-timer-fill').css('width', '100%');
        if (!config.timeLimit) return;
        timeLeft = config.timeLimit;
        timerInt = setInterval(() => {
            timeLeft = Math.max(0, timeLeft - 0.1);
            $('#wc-timer-fill').css('width', (timeLeft / config.timeLimit) * 100 + '%');
            $('#wc-time-text').text(Math.ceil(timeLeft) + 's');
            if (timeLeft <= 0) { clearInterval(timerInt); endGame(false); }
        }, 100);
    }

    // pointer handlers live on the board element (it is never replaced, only emptied)
    $(function () {
        const board = document.getElementById('wc-board');
        if (!board) return;
        board.addEventListener('pointerdown', onDown);
        board.addEventListener('pointermove', onMove);
        board.addEventListener('pointerup', onUp);
        board.addEventListener('pointercancel', onUp);
        board.addEventListener('lostpointercapture', onUp);
    });

    // --- public API --------------------------------------------------------------

    return {
        active: false,

        start: function (cfg) {
            config = cfg || {};
            active = true;
            this.active = true;
            clearInterval(timerInt);
            $('#wire-connect-container').show().removeClass('flash-success flash-fail');
            // wait one frame so the board has its size
            requestAnimationFrame(() => { buildBoard(); startTimer(); });
        },

        close: function () {
            active = false; drag = null;
            this.active = false;
            clearInterval(timerInt);
            $('#wire-connect-container').fadeOut(300);
        }
    };

})();
