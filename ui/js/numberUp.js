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

// Number Up Minigame - Click numbers in ascending order before time runs out

let numberUpGame = {
    active: false,
    config: null,
    timerInterval: null,
    timeRemaining: 0,
    nextNumber: 1,
    mistakes: 0,

    start: function(config) {
        console.log('[NumberUp] start() called');
        if (this.active) return;

        this.config = {
            count: config.count || 20,             // how many numbers (1–N)
            timeLimit: config.timeLimit || 30000,  // ms
            gridCols: config.gridCols || 4,        // grid columns
            maxMistakes: config.maxMistakes || 3   // wrong clicks before fail
        };

        this.active = true;
        this.nextNumber = 1;
        this.mistakes = 0;
        this.timeRemaining = this.config.timeLimit;

        const self = this;
        $('#number-up-container').fadeIn(200, function() {
            self.buildGrid();
            self.startTimer();
        });
    },

    buildGrid: function() {
        // Build shuffled number array
        const nums = [];
        for (let i = 1; i <= this.config.count; i++) nums.push(i);
        for (let i = nums.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [nums[i], nums[j]] = [nums[j], nums[i]];
        }

        const $grid = $('#number-up-grid');
        $grid.empty();
        $grid.css('grid-template-columns', 'repeat(' + this.config.gridCols + ', 1fr)');

        const self = this;
        nums.forEach(function(n) {
            const $cell = $('<div></div>')
                .addClass('number-up-cell')
                .attr('data-number', n)
                .text(n)
                .on('click', function() { self.handleClick(n, $(this)); });
            $grid.append($cell);
        });

        this.updateDisplay();
    },

    updateDisplay: function() {
        const remaining = this.config.count - (this.nextNumber - 1);
        $('#number-up-next').text(this.nextNumber > this.config.count ? '—' : this.nextNumber);
        $('#number-up-progress-text').text((this.nextNumber - 1) + ' / ' + this.config.count);
        $('#number-up-mistakes').text(this.mistakes);
        $('#number-up-max-mistakes').text(this.config.maxMistakes);

        // Progress bar fill (completion progress, not timer)
        const pct = ((this.nextNumber - 1) / this.config.count) * 100;
        $('.number-up-progress-fill').css('width', pct + '%');
    },

    handleClick: function(n, $cell) {
        if (!this.active) return;
        if ($cell.hasClass('nu-clicked')) return;

        if (n === this.nextNumber) {
            $cell.addClass('nu-clicked').off('click');
            this.nextNumber++;
            this.updateDisplay();

            if (this.nextNumber > this.config.count) {
                this.endGame(true);
            }
        } else {
            // Wrong number
            this.mistakes++;
            $cell.addClass('nu-wrong');
            const self = this;
            setTimeout(function() { $cell.removeClass('nu-wrong'); }, 350);
            this.updateDisplay();

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
            $('.number-up-timer-progress').css('width', pct + '%');
            if (pct <= 25) $('.number-up-timer-progress').addClass('danger');
            else $('.number-up-timer-progress').removeClass('danger');
            if (self.timeRemaining <= 0) self.endGame(false);
        }, 50);
    },

    endGame: function(success) {
        if (!this.active) return;
        this.active = false;
        clearInterval(this.timerInterval);
        this.timerInterval = null;

        $('#number-up-message').text(success ? 'SEQUENCE COMPLETE' : 'SEQUENCE FAILED');

        const resultData = {
            success: success,
            reached: this.nextNumber - 1,
            total: this.config.count,
            mistakes: this.mistakes
        };

        setTimeout(function() {
            $('#number-up-container').fadeOut(500, function() {
                $.post('https://glitch-minigames/numberUpResult', JSON.stringify(resultData));
            });
        }, 700);
    },

    close: function() {
        if (!this.active) return;
        this.active = false;
        clearInterval(this.timerInterval);
        this.timerInterval = null;
        $('#number-up-container').fadeOut(300);
    }
};

window.numberUpGame = numberUpGame;
