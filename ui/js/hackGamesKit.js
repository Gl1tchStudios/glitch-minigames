// Glitch Minigames - hack games pack kit
//
// Shared helpers for Shape Recall, Memory Diff, Traceroute and Carrier Tune
// (css/hackGames.css). Each game registers itself in window.hackGames under its
// NUI start action, so app.js routes 'startShapeRecall' etc. with one branch and
// closes them all on forceClose.

window.hackGames = window.hackGames || {};

window.HackKit = (function () {
    // A run's timers. clear() drops every pending timeout / interval / frame, and
    // callbacks that were already queued check alive() so a closed game never acts.
    function session() {
        var timeouts = [], intervals = [], frames = [], dead = false;
        return {
            alive: function () { return !dead; },
            after: function (ms, fn) {
                var id = setTimeout(function () { if (!dead) fn(); }, ms);
                timeouts.push(id);
                return id;
            },
            every: function (ms, fn) {
                var id = setInterval(function () { if (!dead) fn(); }, ms);
                intervals.push(id);
                return id;
            },
            frame: function (fn) {
                var id = requestAnimationFrame(function (t) { if (!dead) fn(t); });
                frames.push(id);
                return id;
            },
            stop: function (id) { clearTimeout(id); clearInterval(id); },
            clear: function () {
                dead = true;
                timeouts.forEach(clearTimeout);
                intervals.forEach(clearInterval);
                frames.forEach(cancelAnimationFrame);
                timeouts = []; intervals = []; frames = [];
            }
        };
    }

    function post(name, data) {
        $.post('https://glitch-minigames/' + name, JSON.stringify(data || {}));
    }

    function sound(id) {
        if (typeof playSoundSafe === 'function') playSoundSafe(id);
    }

    // "[LABEL]" subtitle; the device / tablet themes read data-label
    function tag(el, label) {
        $(el).text('[' + label + ']').attr('data-label', label);
    }

    // states: array of '', 'done', 'now', 'bad'
    function pips(el, states, cls) {
        cls = cls || 'ng-pip';
        $(el).html(states.map(function (s) { return '<i class="' + cls + ' ' + s + '"></i>'; }).join(''));
    }

    // round pips: done before index, now at index, the rest empty
    function roundStates(total, index, badIndex) {
        var out = [];
        for (var i = 0; i < total; i++) {
            if (i === badIndex) out.push('bad');
            else if (i < index) out.push('done');
            else if (i === index) out.push('now');
            else out.push('');
        }
        return out;
    }

    // timer bar + seconds text; adds .danger under 25% like the other games
    function timer(barEl, textEl, left, total) {
        var pct = total > 0 ? Math.max(0, Math.min(100, (left / total) * 100)) : 0;
        $(barEl).css('width', pct + '%').toggleClass('danger', pct < 25);
        if (textEl) $(textEl).text((Math.max(0, left) / 1000).toFixed(1));
    }

    // PASSED / FAILED overlay (the shared .mc-result look, themed in every visual theme)
    function result(host, success, text) {
        $(host).find('.mc-result').remove();
        $('<div class="mc-result ' + (success ? 'success' : 'failure') + '"></div>').text(text).appendTo(host);
    }

    function strikesText(used, max) {
        return used + ' / ' + max;
    }

    function rand(n) { return Math.floor(Math.random() * n); }
    function sample(list) { return list[rand(list.length)]; }
    function shuffle(list) {
        var a = list.slice();
        for (var i = a.length - 1; i > 0; i--) { var j = rand(i + 1); var t = a[i]; a[i] = a[j]; a[j] = t; }
        return a;
    }
    function hex2() { return ('0' + rand(256).toString(16).toUpperCase()).slice(-2); }
    function num(v, def) { v = Number(v); return isFinite(v) ? v : def; }
    function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
    function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; }); }

    function register(action, game) {
        window.hackGames[action] = game;
    }

    return {
        session: session, post: post, sound: sound, tag: tag, pips: pips, roundStates: roundStates,
        timer: timer, result: result, strikesText: strikesText,
        rand: rand, sample: sample, shuffle: shuffle, hex2: hex2, num: num, clamp: clamp, esc: esc,
        register: register
    };
})();
