// -- Glitch Minigames
// -- Copyright (C) 2024 Glitch
// --
// -- This program is free software: you can redistribute it and/or modify
// -- it under the terms of the GNU General Public License as published by
// -- the Free Software Foundation, either version 3 of the License, or
// -- (at your option) any later version.
// --
// -- This program is distributed in the hope that it will be useful,
// -- but WITHOUT ANY WARRANTY; without even the implied warranty of
// -- MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// -- GNU General Public License for more details.
// --
// -- You should have received a copy of the GNU General Public License
// -- along with this program. If not, see <https://www.gnu.org/licenses/>.

// Keys Minigame - Press the highlighted keys in order before time runs out.
// Reads keys natively (the Lua side gives the NUI keyboard focus) so every
// letter works regardless of keyboard layout or language.

let keysGame = {
    active: false,
    config: null,
    timerInterval: null,
    timeRemaining: 0,
    sequence: [],
    cursor: 0,
    mistakes: 0,
    _onKeyDown: null,

    start: function(config) {
        console.log('[Keys] start() called');
        if (this.active) return;
        config = config || {};

        const pool = (config.letters && config.letters.length)
            ? String(config.letters).toUpperCase()
            : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

        this.config = {
            count: config.count || 18,             // how many letters
            timeLimit: config.timeLimit || 15000,  // ms
            gridCols: config.gridCols || 6,        // grid columns
            maxMistakes: config.maxMistakes || 3,  // wrong presses before fail
            pool: pool
        };

        this.active = true;
        this.cursor = 0;
        this.mistakes = 0;
        this.timeRemaining = this.config.timeLimit;

        const self = this;
        this._onKeyDown = function(e) {
            if (!self.active) return;
            if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
            const key = e.key || '';
            if (key.length !== 1) return; // ignore Escape, Backspace, Tab, etc.
            e.preventDefault();
            self.handleLetter(key.toUpperCase());
        };
        document.addEventListener('keydown', this._onKeyDown);

        $('#keys-game-container').fadeIn(200, function() {
            self.buildGrid();
            self.startTimer();
        });
    },

    buildGrid: function() {
        const pool = this.config.pool;
        this.sequence = [];
        for (let i = 0; i < this.config.count; i++) {
            this.sequence.push(pool.charAt(Math.floor(Math.random() * pool.length)));
        }

        const $grid = $('#keys-game-grid');
        $grid.empty();
        $grid.css('grid-template-columns', 'repeat(' + this.config.gridCols + ', 1fr)');

        this.sequence.forEach(function(letter, idx) {
            $('<div></div>')
                .addClass('keys-game-cell')
                .attr('data-index', idx)
                .text(letter)
                .appendTo($grid);
        });

        this.updateDisplay();
        this.highlight();
    },

    highlight: function() {
        $('.keys-game-cell').removeClass('kg-active');
        if (this.cursor < this.sequence.length) {
            $('.keys-game-cell[data-index="' + this.cursor + '"]').addClass('kg-active');
        }
    },

    updateDisplay: function() {
        $('#keys-game-progress-text').text(this.cursor + ' / ' + this.config.count);
        $('#keys-game-mistakes').text(this.mistakes);
        $('#keys-game-max-mistakes').text(this.config.maxMistakes);
        const pct = (this.cursor / this.config.count) * 100;
        $('.keys-game-progress-fill').css('width', pct + '%');
    },

    handleLetter: function(letter) {
        if (!this.active) return;
        const $cell = $('.keys-game-cell[data-index="' + this.cursor + '"]');

        if (letter === this.sequence[this.cursor]) {
            playSoundSafe('sound-buttonPress');
            $cell.removeClass('kg-active').addClass('kg-done');
            this.cursor++;
            this.updateDisplay();
            if (this.cursor >= this.sequence.length) {
                this.endGame(true);
            } else {
                this.highlight();
            }
        } else {
            playSoundSafe('sound-penalty');
            this.mistakes++;
            this.updateDisplay();
            $cell.addClass('kg-wrong');
            setTimeout(function() { $cell.removeClass('kg-wrong'); }, 300);
            if (this.mistakes >= this.config.maxMistakes) {
                this.endGame(false);
            }
        }
    },

    startTimer: function() {
        const self = this;
        this.timerInterval = setInterval(function() {
            if (!self.active) return;
            self.timeRemaining -= 50;
            const pct = Math.max(0, (self.timeRemaining / self.config.timeLimit) * 100);
            $('.keys-game-timer-progress').css('width', pct + '%');
            if (pct <= 25) $('.keys-game-timer-progress').addClass('danger');
            else $('.keys-game-timer-progress').removeClass('danger');
            if (self.timeRemaining <= 0) self.endGame(false);
        }, 50);
    },

    teardownInput: function() {
        if (this._onKeyDown) {
            document.removeEventListener('keydown', this._onKeyDown);
            this._onKeyDown = null;
        }
    },

    endGame: function(success) {
        if (!this.active) return;
        this.active = false;
        this.teardownInput();
        clearInterval(this.timerInterval);
        this.timerInterval = null;

        playSoundSafe(success ? 'sound-success' : 'sound-failure');
        $('#keys-game-message').text(success ? 'ACCESS GRANTED' : 'ACCESS DENIED');

        const resultData = {
            success: success,
            reached: this.cursor,
            total: this.config.count,
            mistakes: this.mistakes
        };

        setTimeout(function() {
            $('#keys-game-container').fadeOut(500, function() {
                $.post('https://glitch-minigames/keysResult', JSON.stringify(resultData));
            });
        }, 700);
    },

    close: function() {
        if (!this.active) return;
        this.active = false;
        this.teardownInput();
        clearInterval(this.timerInterval);
        this.timerInterval = null;
        $('#keys-game-container').fadeOut(300);
    }
};

window.keysGame = keysGame;
