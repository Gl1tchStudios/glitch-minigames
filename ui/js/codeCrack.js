// code crack minigame yeah nah guess the pin code and the colours tell ya if youre right
var CodeCrack = (function() {
    var active = false;
    var timeLimit = 60000;
    var timeRemaining = 0;
    var timerInterval = null;
    var correctPin = [];
    var currentInput = [];
    var digitCount = 4;
    var maxAttempts = 6;
    var attempts = 0;
    var attemptHistory = [];

    // how many digits and attempts ya get
    function start(config) {
        if (active) return;
        
        config = config || {};
        timeLimit = config.timeLimit || 60000;
        digitCount = config.digitCount || 4;
        maxAttempts = config.maxAttempts || 6;
        
        active = true;
        timeRemaining = timeLimit;
        attempts = 0;
        attemptHistory = [];
        currentInput = [];
        
        // make a random pin to crack
        correctPin = [];
        for (var i = 0; i < digitCount; i++) {
            correctPin.push(Math.floor(Math.random() * 10));
        }
        
        console.log('pin to crack mate:', correctPin.join('')); // for testing ya know
        
        createDisplay();
        setupEventListeners();
        startTimer();
        
        $('#code-crack-container').addClass('active').show();
    }

    function createDisplay() {
        var $display = $('.code-crack-display');
        $display.empty();
        
        var $instruction = $('<div class="code-crack-instruction">Enter numbers to crack the PIN. Green = correct, Yellow = wrong position, Red = not in PIN</div>');
        $display.append($instruction);
        
        // where u type the digits
        var $inputArea = $('<div class="code-crack-input-area"></div>');
        var $digits = $('<div class="code-crack-digits"></div>');
        
        for (var i = 0; i < digitCount; i++) {
            $digits.append('<div class="code-crack-digit" data-index="' + i + '"></div>');
        }
        $inputArea.append($digits);
        
        // crack and delete buttons
        var $buttons = $('<div class="code-crack-buttons"></div>');
        $buttons.append('<button class="code-crack-btn crack-btn" id="crack-btn">CRACK</button>');
        $buttons.append('<button class="code-crack-btn delete-btn" id="delete-btn">DELETE</button>');
        $inputArea.append($buttons);
        
        $display.append($inputArea);
        
        var $history = $('<div class="code-crack-history"></div>');
        $history.append('<div class="code-crack-history-title">Attempts: <span id="crack-attempts">0</span>/' + maxAttempts + '</div>');
        $history.append('<div class="code-crack-history-list" id="crack-history-list"></div>');
        $display.append($history);
        
        updateDigitDisplay();
    }

    function updateDigitDisplay() {
        $('.code-crack-digit').each(function(index) {
            var $digit = $(this);
            if (currentInput[index] !== undefined) {
                $digit.text(currentInput[index]);
                $digit.addClass('filled');
            } else {
                $digit.text('');
                $digit.removeClass('filled');
            }

            $digit.removeClass('correct wrong-position not-in-pin');
        });
    }

    function setupEventListeners() {
        $(document).off('keydown.codecrack').on('keydown.codecrack', function(e) {
            if (!active) return;
            
            var key = e.key;
            
            // number keys 0-9
            if (/^[0-9]$/.test(key)) {
                addDigit(parseInt(key));
                e.preventDefault();
            }
            // backspace to delete
            else if (key === 'Backspace') {
                deleteDigit();
                e.preventDefault();
            }
            // enter to crack it
            else if (key === 'Enter') {
                attemptCrack();
                e.preventDefault();
            }
        });
        
        // button clicks
        $(document).off('click.codecrack-crack').on('click.codecrack-crack', '#crack-btn', function() {
            if (!active) return;
            attemptCrack();
        });
        
        $(document).off('click.codecrack-delete').on('click.codecrack-delete', '#delete-btn', function() {
            if (!active) return;
            deleteDigit();
        });
    }

    function addDigit(num) {
        if (currentInput.length >= digitCount) return;
        
        currentInput.push(num);
        playSound('sound-click');
        updateDigitDisplay();
    }

    function deleteDigit() {
        if (currentInput.length === 0) return;
        
        currentInput.pop();
        playSound('sound-click');
        updateDigitDisplay();
    }

    function attemptCrack() {
        if (currentInput.length !== digitCount) {
            playSound('sound-penalty');

            $('.code-crack-input-area').addClass('shake');
            setTimeout(function() {
                $('.code-crack-input-area').removeClass('shake');
            }, 500);
            return;
        }
        
        attempts++;
        $('#crack-attempts').text(attempts);
        
        var results = evaluateGuess(currentInput, correctPin);
        
        var allCorrect = results.every(function(r) { return r === 'correct'; });
        
        if (allCorrect) {
            showResultOnDigits(results);
            playSound('sound-success');
            setTimeout(function() {
                endGame(true);
            }, 1000);
            return;
        }
        
        addToHistory(currentInput.slice(), results);
        
        showResultOnDigits(results);
        
        playSound('sound-buttonPress');
        
        if (attempts >= maxAttempts) {
            setTimeout(function() {
                endGame(false);
            }, 1500);
            return;
        }
        
        setTimeout(function() {
            currentInput = [];
            updateDigitDisplay();
        }, 1000);
    }

    function evaluateGuess(guess, pin) {
        var results = [];
        var pinCopy = pin.slice();
        var guessCopy = guess.slice();
        
        for (var i = 0; i < digitCount; i++) {
            if (guessCopy[i] === pinCopy[i]) {
                results[i] = 'correct';
                pinCopy[i] = null;
                guessCopy[i] = null;
            }
        }
        
        for (var i = 0; i < digitCount; i++) {
            if (guessCopy[i] === null) continue;
            
            var foundIndex = pinCopy.indexOf(guessCopy[i]);
            if (foundIndex !== -1) {
                results[i] = 'wrong-position';
                pinCopy[foundIndex] = null;
            } else {
                results[i] = 'not-in-pin';
            }
        }
        
        return results;
    }

    function showResultOnDigits(results) {
        $('.code-crack-digit').each(function(index) {
            var $digit = $(this);
            $digit.removeClass('correct wrong-position not-in-pin');
            $digit.addClass(results[index]);
        });
    }

    function addToHistory(guess, results) {
        var $list = $('#crack-history-list');
        var $entry = $('<div class="code-crack-history-entry"></div>');
        
        for (var i = 0; i < guess.length; i++) {
            var $digit = $('<span class="code-crack-history-digit ' + results[i] + '">' + guess[i] + '</span>');
            $entry.append($digit);
        }
        
        $list.prepend($entry);
        
        if ($list.children().length > 5) {
            $list.children().last().remove();
        }
    }

    function startTimer() {
        if (timerInterval) clearInterval(timerInterval);
        
        var startTime = Date.now();
        var $progress = $('.code-crack-timer-progress');
        var $timerText = $('#code-crack-timer');
        
        timerInterval = setInterval(function() {
            if (!active) {
                clearInterval(timerInterval);
                return;
            }
            
            var elapsed = Date.now() - startTime;
            timeRemaining = Math.max(0, timeLimit - elapsed);
            
            var percent = (timeRemaining / timeLimit) * 100;
            $progress.css('width', percent + '%');
            
            if (percent <= 20) {
                $progress.addClass('danger');
            } else {
                $progress.removeClass('danger');
            }
            
            $timerText.text((timeRemaining / 1000).toFixed(1));
            
            if (timeRemaining <= 0) {
                clearInterval(timerInterval);
                endGame(false);
            }
        }, 50);
    }

    function endGame(success) {
        if (!active) return;
        active = false;
        
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        
        $(document).off('keydown.codecrack');
        
        var $result = $('<div class="code-crack-result ' + (success ? 'success' : 'failure') + '">' + 
            (success ? 'CODE CRACKED' : 'LOCKOUT - PIN: ' + correctPin.join('')) + '</div>');
        $('.code-crack-display').append($result);
        
        playSound(success ? 'sound-success' : 'sound-failure');
        
        setTimeout(function() {
            $.post('https://glitch-minigames/codeCrackResult', JSON.stringify({ 
                success: success,
                attempts: attempts
            }));
            close();
        }, 2000);
    }

    function close() {
        active = false;
        
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        
        $(document).off('keydown.codecrack');
        $(document).off('click.codecrack-crack');
        $(document).off('click.codecrack-delete');
        
        $('.code-crack-result').remove();
        
        $('#code-crack-container').removeClass('active').fadeOut(300, function() {
            $.post('https://glitch-minigames/codeCrackClose', JSON.stringify({}));
        });
    }

    function playSound(soundId) {
        var sound = document.getElementById(soundId);
        if (sound) {
            sound.currentTime = 0;
            sound.play().catch(function() {});
        }
    }

    window.codeCrackFunctions = {
        start: start,
        close: close
    };

    return {
        start: start,
        close: close
    };
})();
