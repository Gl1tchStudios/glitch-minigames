// -- Glitch Minigames — Wire Connect
// -- Full container: drag coloured wires from left to right terminals without crossing

window.wireConnectGame = (function () {

    // Fixed palette — referenced via --minigame-color-N CSS vars at runtime
    const PALETTE = ['#f55151', '#4dc0fa', '#4ade80', '#facc15', '#c084fc'];

    let config      = {};
    let active      = false;
    let terminals   = []; // { id, side, row, colorIdx }
    let wires       = []; // { from (left id), to (right id) }
    let selectedId  = null; // currently selected left terminal
    let timerInt    = null;
    let timeLeft    = 0;
    let _newWire    = null; // wire to animate on next renderBoard

    // ── board construction ───────────────────────────────────

    function buildBoard() {
        const count    = Math.max(3, Math.min(5, config.wireCount || 4));
        const colors   = PALETTE.slice(0, count);

        // Shuffle right side order
        const rightOrder = [...Array(count).keys()].sort(() => Math.random() - 0.5);

        terminals = [];
        for (let i = 0; i < count; i++) {
            terminals.push({ id: 'L' + i, side: 'left',  row: i, colorIdx: i,            color: colors[i] });
        }
        for (let i = 0; i < count; i++) {
            terminals.push({ id: 'R' + i, side: 'right', row: i, colorIdx: rightOrder[i], color: colors[rightOrder[i]] });
        }

        wires      = [];
        selectedId = null;
        renderBoard();
    }

    // ── rendering ────────────────────────────────────────────

    function renderBoard() {
        const $board = $('#wc-board');
        $board.empty();

        const count  = terminals.filter(t => t.side === 'left').length;
        const W      = $board.width()  || 560;
        const H      = $board.height() || 340;

        const LX     = Math.round(W * 0.12);   // left terminal x
        const RX     = Math.round(W * 0.88);   // right terminal x
        const rowH   = H / count;

        // ─ SVG wires ─
        const $svg = $(`<svg class="wc-svg" style="width:${W}px;height:${H}px;"></svg>`);
        $board.append($svg);

        wires.forEach(w => {
            const lT = terminals.find(t => t.id === w.from);
            const rT = terminals.find(t => t.id === w.to);
            if (!lT || !rT) return;

            const ly        = (lT.row + 0.5) * rowH;
            const ry        = (rT.row + 0.5) * rowH;
            const crossed   = checkCross(w, wires);
            const baseColor = crossed ? '#ff4444' : lT.color;
            const isNew     = _newWire && _newWire.from === w.from && _newWire.to === w.to;
            const cx = W / 2;
            const d  = `M${LX},${ly} C${cx},${ly} ${cx},${ry} ${RX},${ry}`;
            const cls = isNew ? ' class="wc-wire-new"' : '';

            // Outer glow halo
            $svg.append(`<path pathLength="1" d="${d}" stroke="${baseColor}" stroke-width="16"
                fill="none" stroke-linecap="round" opacity="0.18"${cls}/>`);
            // Main cable body
            $svg.append(`<path pathLength="1" d="${d}" stroke="${baseColor}" stroke-width="6"
                fill="none" stroke-linecap="round" opacity="${crossed ? 0.8 : 1}"${cls}/>`);
            // Center highlight sheen
            $svg.append(`<path pathLength="1" d="${d}" stroke="rgba(255,255,255,0.45)" stroke-width="1.5"
                fill="none" stroke-linecap="round"${cls}/>`);
        });
        _newWire = null;

        // ─ terminals ─
        terminals.forEach(t => {
            const isCon   = wires.some(w => w.from === t.id || w.to === t.id);
            const isSel   = selectedId === t.id;
            const x       = t.side === 'left' ? LX : RX;
            const y       = (t.row + 0.5) * rowH;

            const $dot = $(`<div class="wc-dot ${isSel ? 'wc-selected' : ''} ${isCon ? 'wc-connected' : ''}"
                data-id="${t.id}"
                style="left:${x}px;top:${y}px;background:${t.color};
                       border-color:${isSel ? '#fff' : t.color};">
            </div>`);

            if (t.side === 'left') {
                $dot.append(`<span class="wc-label right">${t.colorIdx + 1}</span>`);
            } else {
                $dot.append(`<span class="wc-label left">${t.colorIdx + 1}</span>`);
            }

            $dot.on('click', () => onDotClick(t));
            $board.append($dot);
        });

        // ─ status line ─
        const total      = terminals.filter(t => t.side === 'left').length;
        const done       = wires.length;
        const allCorrect = done === total && wires.every(w => {
            const lT = terminals.find(t => t.id === w.from);
            const rT = terminals.find(t => t.id === w.to);
            return lT && rT && lT.colorIdx === rT.colorIdx;
        });
        $('#wc-status').text(
            done < total
                ? `Connect ${total - done} more wire${total - done > 1 ? 's' : ''}`
                : allCorrect
                    ? 'All connected! ✓'
                    : 'Wrong colours — check your connections'
        ).toggleClass('wc-status-ok', allCorrect);
    }

    function onDotClick(t) {
        if (!active) return;

        if (t.side === 'left') {
            // Select / re-select left terminal
            wires      = wires.filter(w => w.from !== t.id);
            selectedId = (selectedId === t.id) ? null : t.id;
            renderBoard();
        } else {
            if (!selectedId) return;

            // Remove any existing wire to this right terminal or from this left terminal
            wires = wires.filter(w => w.to !== t.id && w.from !== selectedId);
            wires.push({ from: selectedId, to: t.id });
            _newWire   = { from: selectedId, to: t.id };
            selectedId = null;
            renderBoard();
            checkWin();
        }
    }

    // ── win / cross logic ────────────────────────────────────

    // Two straight lines (L→R terminal rows as y-axis) cross if their slopes intersect
    function checkCross(wire, allWires) {
        const lA = terminals.find(t => t.id === wire.from);
        const rA = terminals.find(t => t.id === wire.to);
        if (!lA || !rA) return false;

        for (const w2 of allWires) {
            if (w2 === wire) continue;
            const lB = terminals.find(t => t.id === w2.from);
            const rB = terminals.find(t => t.id === w2.to);
            if (!lB || !rB) continue;
            if (
                (lA.row < lB.row && rA.row > rB.row) ||
                (lA.row > lB.row && rA.row < rB.row)
            ) return true;
        }
        return false;
    }

    function checkWin() {
        const count = terminals.filter(t => t.side === 'left').length;
        if (wires.length < count) return;

        // All left terminals wired to correct colour
        for (const w of wires) {
            const lT = terminals.find(t => t.id === w.from);
            const rT = terminals.find(t => t.id === w.to);
            if (!lT || !rT || lT.colorIdx !== rT.colorIdx) return; // wrong colour
        }

        endGame(true);
    }

    function endGame(success) {
        clearInterval(timerInt);
        active      = false;
        this_active = false;
        window.wireConnectGame.active = false;

        const $c = $('#wire-connect-container');
        $c.addClass(success ? 'flash-success' : 'flash-fail');
        setTimeout(() => {
            $.post('https://glitch-minigames/wireConnectResult', JSON.stringify({ success: success }));
        }, 550);
    }

    // ── timer ─────────────────────────────────────────────────

    function startTimer() {
        if (!config.timeLimit) return;
        timeLeft = config.timeLimit;
        $('#wc-timer-fill').css('width', '100%');

        timerInt = setInterval(() => {
            timeLeft -= 0.1;
            if (timeLeft < 0) timeLeft = 0;
            const pct = (timeLeft / config.timeLimit) * 100;
            $('#wc-timer-fill').css('width', pct + '%');
            $('#wc-time-text').text(Math.ceil(timeLeft) + 's');
            if (timeLeft <= 0) {
                clearInterval(timerInt);
                endGame(false);
            }
        }, 100);
    }

    // ── public API ───────────────────────────────────────────

    return {
        active: false,

        start: function (cfg) {
            config    = cfg || {};
            active    = true;
            this.active = true;

            clearInterval(timerInt);
            $('#wire-connect-container').show().removeClass('flash-success flash-fail');

            // Wait one frame so the board has dimensions
            requestAnimationFrame(() => {
                buildBoard();
                startTimer();
            });
        },

        close: function () {
            active      = false;
            this.active = false;
            clearInterval(timerInt);
            $('#wire-connect-container').fadeOut(300);
        }
    };

})();
