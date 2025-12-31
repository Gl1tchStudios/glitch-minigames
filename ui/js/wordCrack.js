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

// word crack minigame
var WordCrack = (function() {
    var active = false;
    var timeLimit = 120000;
    var timeRemaining = 0;
    var timerInterval = null;
    var correctWord = '';
    var currentInput = [];
    var wordLength = 5;
    var maxAttempts = 6;
    var attempts = 0;
    var attemptHistory = [];

    // list of 5 letter words to pick from
    var wordList = [
        'ADMIN', 'ALARM', 'ALERT', 'BLOCK', 'BRAKE', 'BREAK', 'BURST', 'CABLE', 'CACHE',
        'CHAIN', 'CHAOS', 'CHASE', 'CHEAP', 'CHECK', 'CHIEF', 'CHORD', 'CLAIM', 'CLASH',
        'CLASS', 'CLEAN', 'CLEAR', 'CLICK', 'CLIMB', 'CLOCK', 'CLONE', 'CLOSE', 'CLOUD',
        'COACH', 'COAST', 'CODER', 'CORPS', 'COULD', 'COUNT', 'COURT', 'COVER', 'CRACK',
        'CRAFT', 'CRASH', 'CRAZY', 'CREAM', 'CRIME', 'CRISP', 'CROSS', 'CROWD', 'CROWN',
        'CRUEL', 'CRUSH', 'CRYPT', 'CYBER', 'CYCLE', 'DANCE', 'DEATH', 'DEBUG', 'DECAY',
        'DECOY', 'DELTA', 'DENSE', 'DEPOT', 'DEPTH', 'DRAFT', 'DRAIN', 'DRAMA', 'DRANK',
        'DREAM', 'DRESS', 'DRIFT', 'DRILL', 'DRINK', 'DRIVE', 'DROIT', 'DRONE', 'DROWN',
        'EJECT', 'ELITE', 'EMAIL', 'EMPTY', 'ENEMY', 'ENJOY', 'ENTER', 'ENTRY', 'EQUAL',
        'ERROR', 'EVENT', 'EXACT', 'EXCEL', 'EXIST', 'EXTRA', 'FAITH', 'FALSE', 'FAULT',
        'FEVER', 'FIBER', 'FIELD', 'FIFTH', 'FIGHT', 'FINAL', 'FIRST', 'FIXED', 'FLAME',
        'FLASH', 'FLASK', 'FLESH', 'FLOAT', 'FLOOD', 'FLOOR', 'FLOUR', 'FLUID', 'FLUSH',
        'FOCUS', 'FORCE', 'FORGE', 'FORUM', 'FOUND', 'FRAME', 'FRANK', 'FRAUD', 'FRESH',
        'FRONT', 'FRUIT', 'GAMMA', 'GHOST', 'GIANT', 'GIVEN', 'GLASS', 'GLEAM', 'GLIDE',
        'GLOBE', 'GLOOM', 'GLORY', 'GLYPH', 'GRACE', 'GRADE', 'GRAIN', 'GRAND', 'GRANT',
        'GRAPH', 'GRASP', 'GRASS', 'GRAVE', 'GREAT', 'GREEN', 'GRIND', 'GROSS', 'GROUP',
        'GUARD', 'GUESS', 'GUEST', 'GUIDE', 'GUILD', 'GUILT', 'HASTE', 'HAVEN', 'HEART',
        'HEIST', 'HENCE', 'HORSE', 'HOTEL', 'HOURS', 'HOUSE', 'HUMAN', 'HYPER', 'IDEAL',
        'IMAGE', 'INDEX', 'INNER', 'INPUT', 'INTEL', 'INTER', 'ISSUE', 'JOINT', 'JUDGE',
        'JUICE', 'KNIFE', 'KNOCK', 'KNOWN', 'LABEL', 'LABOR', 'LASER', 'LATCH', 'LATER',
        'LAUGH', 'LAYER', 'LEARN', 'LEASE', 'LEAVE', 'LEGAL', 'LEMON', 'LEVEL', 'LEVER',
        'LIGHT', 'LIMIT', 'LINUX', 'LIVER', 'LOBBY', 'LOCAL', 'LODGE', 'LOGIC', 'LOGIN',
        'LOOSE', 'LOWER', 'LOYAL', 'LUCKY', 'LUNCH', 'LYING', 'MACRO', 'MAGIC', 'MAJOR',
        'MAKER', 'MARCH', 'MARRY', 'MATCH', 'MAYOR', 'MEDIA', 'MERCY', 'MERGE', 'MERIT',
        'METAL', 'METER', 'MICRO', 'MIGHT', 'MINOR', 'MINUS', 'MIXED', 'MODEL', 'MODEM',
        'MONEY', 'MONTH', 'MORAL', 'MOTOR', 'MOUNT', 'MOUSE', 'MOUTH', 'MOVIE', 'MULTI',
        'MUSIC', 'NAIVE', 'NAKED', 'NERVE', 'NEVER', 'NIGHT', 'NINTH', 'NOBLE', 'NOISE',
        'NORTH', 'NOTED', 'NOVEL', 'NURSE', 'OCCUR', 'OCEAN', 'OFFER', 'OFTEN', 'OMEGA',
        'ONION', 'ONSET', 'OPERA', 'ORBIT', 'ORDER', 'OTHER', 'OUGHT', 'OUTER', 'OWNER',
        'OXIDE', 'OZONE', 'PAINT', 'PANEL', 'PANIC', 'PAPER', 'PARTY', 'PASTA', 'PATCH',
        'PAUSE', 'PEACE', 'PEARL', 'PENNY', 'PHASE', 'PHONE', 'PHOTO', 'PIANO', 'PIECE',
        'PILOT', 'PINCH', 'PITCH', 'PIXEL', 'PLACE', 'PLAIN', 'PLANE', 'PLANT', 'PLATE',
        'PLAZA', 'PLEAD', 'POINT', 'POLAR', 'POUND', 'POWER', 'PRESS', 'PRICE', 'PRIDE',
        'PRIME', 'PRINT', 'PRIOR', 'PRIZE', 'PROBE', 'PROOF', 'PROSE', 'PROUD', 'PROVE',
        'PROXY', 'PULSE', 'PUNCH', 'PUPIL', 'PURSE', 'QUEEN', 'QUERY', 'QUEST', 'QUEUE',
        'QUICK', 'QUIET', 'QUOTA', 'QUOTE', 'RADAR', 'RADIO', 'RAISE', 'RALLY', 'RANGE',
        'RAPID', 'RATIO', 'REACH', 'REACT', 'REALM', 'REBEL', 'REFER', 'REIGN', 'RELAY',
        'REMIT', 'RENAL', 'RENEW', 'REPAY', 'REPLY', 'RESET', 'RIDER', 'RIDGE', 'RIFLE',
        'RIGHT', 'RIGID', 'RISKY', 'RIVAL', 'RIVER', 'ROBOT', 'ROCKY', 'ROGUE', 'ROMAN',
        'ROUGH', 'ROUND', 'ROUTE', 'ROYAL', 'RUGBY', 'RULED', 'RURAL', 'SADLY', 'SAINT',
        'SALAD', 'SALON', 'SANDY', 'SATAN', 'SAUCE', 'SCALE', 'SCARE', 'SCENE', 'SCENT',
        'SCOPE', 'SCORE', 'SCOUT', 'SCRAP', 'SERVE', 'SETUP', 'SEVEN', 'SHADE', 'SHAFT',
        'SHAKE', 'SHALL', 'SHAME', 'SHAPE', 'SHARE', 'SHARK', 'SHARP', 'SHEEP', 'SHEER',
        'SHEET', 'SHELF', 'SHELL', 'SHIFT', 'SHINE', 'SHIRT', 'SHOCK', 'SHOOT', 'SHORE',
        'SHORT', 'SHOUT', 'SHOWN', 'SIGHT', 'SIGMA', 'SIGN', 'SILLY', 'SINCE', 'SIXTH',
        'SIXTY', 'SIZED', 'SKILL', 'SKIRT', 'SKULL', 'SLATE', 'SLAVE', 'SLEEP', 'SLICE',
        'SLIDE', 'SLOPE', 'SMALL', 'SMART', 'SMELL', 'SMILE', 'SMITH', 'SMOKE', 'SNAKE',
        'SOLID', 'SOLVE', 'SORRY', 'SOUND', 'SOUTH', 'SPACE', 'SPARE', 'SPARK', 'SPAWN',
        'SPEAK', 'SPEAR', 'SPEED', 'SPELL', 'SPEND', 'SPICE', 'SPINE', 'SPLIT', 'SPOKE',
        'SPORT', 'SPOOF', 'SPRAY', 'SQUAD', 'STACK', 'STAFF', 'STAGE', 'STAIN', 'STAKE',
        'STALE', 'STAMP', 'STAND', 'STARK', 'START', 'STATE', 'STAYS', 'STEAD', 'STEAL',
        'STEAM', 'STEEL', 'STEEP', 'STEER', 'STERN', 'STICK', 'STIFF', 'STILL', 'STOCK',
        'STONE', 'STOOD', 'STORE', 'STORM', 'STORY', 'STOVE', 'STRIP', 'STUCK', 'STUDY',
        'STUFF', 'STYLE', 'SUGAR', 'SUITE', 'SUNNY', 'SUPER', 'SURGE', 'SWAMP', 'SWEAR',
        'SWEAT', 'SWEEP', 'SWEET', 'SWEPT', 'SWIFT', 'SWING', 'SWORD', 'SYNTH', 'TABLE',
        'TAKEN', 'TASTE', 'TEACH', 'TEETH', 'TEMPO', 'TENSE', 'TENTH', 'TERMS', 'TERRA',
        'TERRY', 'TEXAS', 'THANK', 'THEFT', 'THEIR', 'THEME', 'THERE', 'THESE', 'THICK',
        'THIEF', 'THING', 'THINK', 'THIRD', 'THOSE', 'THREE', 'THREW', 'THROW', 'THUMB',
        'TIGER', 'TIGHT', 'TIMES', 'TIRED', 'TITLE', 'TODAY', 'TOKEN', 'TONAL', 'TOOTH',
        'TOPIC', 'TOTAL', 'TOUCH', 'TOUGH', 'TOWER', 'TOXIC', 'TRACE', 'TRACK', 'TRADE',
        'TRAIL', 'TRAIN', 'TRAIT', 'TRASH', 'TREAT', 'TREND', 'TRIAL', 'TRIBE', 'TRICK',
        'TRIED', 'TROOP', 'TRUCK', 'TRULY', 'TRUMP', 'TRUNK', 'TRUST', 'TRUTH', 'TUMOR',
        'TUNER', 'TWIST', 'ULTRA', 'UNCLE', 'UNDER', 'UNIFY', 'UNION', 'UNITE', 'UNITY',
        'UNTIL', 'UPPER', 'UPSET', 'URBAN', 'USAGE', 'USUAL', 'VALID', 'VALUE', 'VAULT',
        'VENOM', 'VENUE', 'VERSE', 'VIDEO', 'VIGOR', 'VINYL', 'VIRAL', 'VIRUS', 'VISIT',
        'VITAL', 'VIVID', 'VOCAL', 'VOICE', 'VOTER', 'WAGON', 'WASTE', 'WATCH', 'WATER',
        'WAVED', 'WEIGH', 'WEIRD', 'WHEAT', 'WHEEL', 'WHERE', 'WHICH', 'WHILE', 'WHITE',
        'WHOLE', 'WHOSE', 'WIDTH', 'WIRED', 'WITCH', 'WOMAN', 'WOODS', 'WORLD', 'WORRY',
        'WORSE', 'WORST', 'WORTH', 'WOULD', 'WOUND', 'WRATH', 'WRECK', 'WRIST', 'WRITE',
        'WRONG', 'WROTE', 'XENON', 'YACHT', 'YIELD', 'YOUNG', 'YOUTH', 'ZEBRA', 'ZONAL'
    ];

    // how many letters and attempts u get
    function start(config) {
        if (active) return;
        
        config = config || {};
        timeLimit = config.timeLimit || 120000;
        wordLength = config.wordLength || 5;
        maxAttempts = config.maxAttempts || 6;
        
        active = true;
        timeRemaining = timeLimit;
        attempts = 0;
        attemptHistory = [];
        currentInput = [];
        
        // pick a random word from the list
        correctWord = wordList[Math.floor(Math.random() * wordList.length)];
        
        console.log('word to crack mate:', correctWord);
        
        createDisplay();
        setupEventListeners();
        startTimer();
        
        $('#word-crack-container').addClass('active').show();
    }

    function createDisplay() {
        var $display = $('.word-crack-display');
        $display.empty();
        
        var $instruction = $('<div class="word-crack-instruction">Guess the ' + wordLength + '-letter word. Green = correct, Yellow = wrong spot, Red = not in word</div>');
        $display.append($instruction);
        
        var $inputArea = $('<div class="word-crack-input-area"></div>');
        var $letters = $('<div class="word-crack-letters"></div>');
        
        for (var i = 0; i < wordLength; i++) {
            $letters.append('<div class="word-crack-letter" data-index="' + i + '"></div>');
        }
        $inputArea.append($letters);
        
        var $buttons = $('<div class="word-crack-buttons"></div>');
        $buttons.append('<button class="word-crack-btn guess-btn" id="guess-btn">GUESS</button>');
        $buttons.append('<button class="word-crack-btn delete-btn" id="word-delete-btn">DELETE</button>');
        $inputArea.append($buttons);
        
        $display.append($inputArea);
        
        var $history = $('<div class="word-crack-history"></div>');
        $history.append('<div class="word-crack-history-title">Attempts: <span id="word-attempts">0</span>/' + maxAttempts + '</div>');
        $history.append('<div class="word-crack-history-list" id="word-history-list"></div>');
        $display.append($history);
        
        updateLetterDisplay();
    }

    function updateLetterDisplay() {
        $('.word-crack-letter').each(function(index) {
            var $letter = $(this);
            if (currentInput[index] !== undefined) {
                $letter.text(currentInput[index]);
                $letter.addClass('filled');
            } else {
                $letter.text('');
                $letter.removeClass('filled');
            }

            $letter.removeClass('correct wrong-position not-in-word');
        });
    }

    function setupEventListeners() {
        $(document).off('keydown.wordcrack').on('keydown.wordcrack', function(e) {
            if (!active) return;
            
            var key = e.key.toUpperCase();
            
            // letter keys a-z
            if (/^[A-Z]$/.test(key)) {
                addLetter(key);
                e.preventDefault();
            }
            // backspace to delete
            else if (e.key === 'Backspace') {
                deleteLetter();
                e.preventDefault();
            }
            // enter to guess
            else if (e.key === 'Enter') {
                attemptGuess();
                e.preventDefault();
            }
        });
        
        $(document).off('click.wordcrack-guess').on('click.wordcrack-guess', '#guess-btn', function() {
            if (!active) return;
            attemptGuess();
        });
        
        $(document).off('click.wordcrack-delete').on('click.wordcrack-delete', '#word-delete-btn', function() {
            if (!active) return;
            deleteLetter();
        });
    }

    function addLetter(letter) {
        if (currentInput.length >= wordLength) return;
        
        currentInput.push(letter);
        playSound('sound-click');
        updateLetterDisplay();
    }

    function deleteLetter() {
        if (currentInput.length === 0) return;
        
        currentInput.pop();
        playSound('sound-click');
        updateLetterDisplay();
    }

    function attemptGuess() {
        if (currentInput.length !== wordLength) {
            playSound('sound-penalty');

            $('.word-crack-input-area').addClass('shake');
            setTimeout(function() {
                $('.word-crack-input-area').removeClass('shake');
            }, 500);
            return;
        }
        
        attempts++;
        $('#word-attempts').text(attempts);
        
        var guessWord = currentInput.join('');
        
        var results = evaluateGuess(currentInput, correctWord.split(''));
        
        var allCorrect = results.every(function(r) { return r === 'correct'; });
        
        if (allCorrect) {
            showResultOnLetters(results);
            playSound('sound-success');
            setTimeout(function() {
                endGame(true);
            }, 1000);
            return;
        }
        
        addToHistory(currentInput.slice(), results);
        
        showResultOnLetters(results);
        
        playSound('sound-buttonPress');
        
        if (attempts >= maxAttempts) {
            setTimeout(function() {
                endGame(false);
            }, 1500);
            return;
        }
        
        setTimeout(function() {
            currentInput = [];
            updateLetterDisplay();
        }, 1000);
    }

    function evaluateGuess(guess, word) {
        var results = [];
        var wordCopy = word.slice();
        var guessCopy = guess.slice();
        
        for (var i = 0; i < wordLength; i++) {
            if (guessCopy[i] === wordCopy[i]) {
                results[i] = 'correct';
                wordCopy[i] = null;
                guessCopy[i] = null;
            }
        }
        
        for (var i = 0; i < wordLength; i++) {
            if (guessCopy[i] === null) continue;
            
            var foundIndex = wordCopy.indexOf(guessCopy[i]);
            if (foundIndex !== -1) {
                results[i] = 'wrong-position';
                wordCopy[foundIndex] = null;
            } else {
                results[i] = 'not-in-word';
            }
        }
        
        return results;
    }

    function showResultOnLetters(results) {
        $('.word-crack-letter').each(function(index) {
            var $letter = $(this);
            $letter.removeClass('correct wrong-position not-in-word');
            $letter.addClass(results[index]);
        });
    }

    function addToHistory(guess, results) {
        var $list = $('#word-history-list');
        var $entry = $('<div class="word-crack-history-entry"></div>');
        
        for (var i = 0; i < guess.length; i++) {
            var $letter = $('<span class="word-crack-history-letter ' + results[i] + '">' + guess[i] + '</span>');
            $entry.append($letter);
        }
        
        $list.prepend($entry);
        
        if ($list.children().length > 5) {
            $list.children().last().remove();
        }
    }

    function startTimer() {
        if (timerInterval) clearInterval(timerInterval);
        
        var startTime = Date.now();
        var $progress = $('.word-crack-timer-progress');
        var $timerText = $('#word-crack-timer');
        
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
        
        $(document).off('keydown.wordcrack');
        
        var $result = $('<div class="word-crack-result ' + (success ? 'success' : 'failure') + '">' + 
            (success ? 'WORD CRACKED' : 'LOCKOUT - WORD: ' + correctWord) + '</div>');
        $('.word-crack-display').append($result);
        
        playSound(success ? 'sound-success' : 'sound-failure');
        
        setTimeout(function() {
            $.post('https://glitch-minigames/wordCrackResult', JSON.stringify({ 
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
        
        $(document).off('keydown.wordcrack');
        $(document).off('click.wordcrack-guess');
        $(document).off('click.wordcrack-delete');
        
        $('.word-crack-result').remove();
        
        $('#word-crack-container').removeClass('active').fadeOut(300, function() {
            $.post('https://glitch-minigames/wordCrackClose', JSON.stringify({}));
        });
    }

    function playSound(soundId) {
        var sound = document.getElementById(soundId);
        if (sound) {
            sound.currentTime = 0;
            sound.play().catch(function() {});
        }
    }

    window.wordCrackFunctions = {
        start: start,
        close: close
    };

    return {
        start: start,
        close: close
    };
})();
