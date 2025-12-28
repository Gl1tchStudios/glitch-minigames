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

// Preset symbol sets
const SYMBOL_PRESETS = {
    symbols: ['◆', '◇', '○', '●', '□', '■', '△', '▲', '▽', '▼', '◈', '◉', '◎', '★', '☆', '✦', '✧', '⬟', '⬢', '⬡', '⬠', '⯃', '⯂', '⬤', '⬣', '⬬', '⬭', '⬮', '⬯', '⌬'],
    letters: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'],
    numbers: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
    dots: ['⠁', '⠂', '⠃', '⠄', '⠅', '⠆', '⠇', '⠈', '⠉', '⠊', '⠋', '⠌', '⠍', '⠎', '⠏', '⠐', '⠑', '⠒', '⠓', '⠔', '⠕', '⠖', '⠗', '⠘', '⠙', '⠚', '⠛', '⠜', '⠝', '⠞'],
    emojis: ['🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⚫', '⚪', '🟤', '💀', '👽', '🤖', '👾', '🎮', '💎', '🔥', '⚡', '💧', '🌟', '🎯', '🔑', '🔒', '💰', '🎲', '🃏', '♠️', '♥️', '♦️', '♣️', '🎪']
};

const symbolSearchState = {
    config: {
        gridSize: 8,
        shiftInterval: 1000,
        timeLimit: 30000,
        minKeyLength: 1,
        maxKeyLength: 1,
        symbolType: 'symbols',
        symbols: SYMBOL_PRESETS.symbols
    },
    grid: [],                    // 2D array of single symbols
    targetKey: [],               // Array of symbols forming the key sequence
    targetStartPosition: { row: 0, col: 0 },  // Starting position of the key sequence
    markerPosition: { row: 0, col: 0 },
    shiftTimer: null,
    gameTimer: null,
    countdownTimer: null,
    timeRemaining: 0,
    gameActive: false,
    keydownHandler: null
};

function startSymbolSearchGame(config = {}) {
    console.log('Initializing Symbol Search Game');
    
    // clear any existing timers
    if (symbolSearchState.shiftTimer) {
        clearInterval(symbolSearchState.shiftTimer);
        symbolSearchState.shiftTimer = null;
    }
    if (symbolSearchState.gameTimer) {
        clearTimeout(symbolSearchState.gameTimer);
        symbolSearchState.gameTimer = null;
    }
    if (symbolSearchState.countdownTimer) {
        clearInterval(symbolSearchState.countdownTimer);
        symbolSearchState.countdownTimer = null;
    }
    
    if (symbolSearchState.keydownHandler) {
        document.removeEventListener('keydown', symbolSearchState.keydownHandler);
    }
    
    symbolSearchState.config = { 
        ...symbolSearchState.config, 
        ...config
    };
    
    if (config.symbols && Array.isArray(config.symbols)) {
        symbolSearchState.config.symbols = config.symbols;
    } else if (config.symbolType && SYMBOL_PRESETS[config.symbolType]) {
        symbolSearchState.config.symbols = SYMBOL_PRESETS[config.symbolType];
    } else {
        symbolSearchState.config.symbols = SYMBOL_PRESETS.symbols;
    }
    
    symbolSearchState.config.minKeyLength = Math.max(1, Math.min(6, symbolSearchState.config.minKeyLength || 1));
    symbolSearchState.config.maxKeyLength = Math.max(1, Math.min(6, symbolSearchState.config.maxKeyLength || 1));
    
    if (symbolSearchState.config.minKeyLength > symbolSearchState.config.maxKeyLength) {
        symbolSearchState.config.minKeyLength = symbolSearchState.config.maxKeyLength;
    }
    
    if (symbolSearchState.config.maxKeyLength > symbolSearchState.config.gridSize) {
        symbolSearchState.config.maxKeyLength = symbolSearchState.config.gridSize;
    }
    if (symbolSearchState.config.minKeyLength > symbolSearchState.config.gridSize) {
        symbolSearchState.config.minKeyLength = symbolSearchState.config.gridSize;
    }
    
    symbolSearchState.gameActive = false;
    symbolSearchState.timeRemaining = symbolSearchState.config.timeLimit;
    
    $('#symbol-search-container').show();
    
    $('.symbol-search-grid').hide();
    $('.symbol-search-target-display').hide();
    $('.symbol-search-splash').show();
    
    updateSymbolSearchUI();
    
    console.log('Splash screen shown, waiting 3 seconds...');
    
    setTimeout(() => {
        console.log('Starting symbol search game...');
        $('.symbol-search-splash').fadeOut(400, () => {
            initializeSymbolSearchGrid();
            $('.symbol-search-grid').fadeIn(400);
            $('.symbol-search-target-display').fadeIn(400, () => {
                startSymbolSearchRound();
            });
        });
    }, 3000);
}

function updateSymbolSearchUI() {
    const seconds = (symbolSearchState.timeRemaining / 1000).toFixed(1);
    $('#symbol-search-timer').text(seconds);
    $('#symbol-search-message').text('Find the START of the target sequence');
}

function initializeSymbolSearchGrid() {
    console.log('Initializing symbol search grid');
    
    const gridContainer = $('.symbol-search-grid');
    gridContainer.empty();
    
    const gridSize = symbolSearchState.config.gridSize;
    gridContainer.css({
        'display': 'grid',
        'grid-template-columns': `repeat(${gridSize}, 1fr)`,
        'grid-template-rows': `repeat(${gridSize}, 1fr)`,
        'gap': '4px',
        'width': '450px',
        'height': '450px',
        'margin': '0 auto'
    });
    
    const symbols = symbolSearchState.config.symbols;
    const minLen = symbolSearchState.config.minKeyLength;
    const maxLen = symbolSearchState.config.maxKeyLength;
    
    const keyLength = Math.floor(Math.random() * (maxLen - minLen + 1)) + minLen;
    
    symbolSearchState.targetKey = [];
    for (let i = 0; i < keyLength; i++) {
        symbolSearchState.targetKey.push(symbols[Math.floor(Math.random() * symbols.length)]);
    }
    
    const targetRow = Math.floor(Math.random() * gridSize);
    const targetCol = Math.floor(Math.random() * gridSize);
    symbolSearchState.targetStartPosition = { row: targetRow, col: targetCol };
    
    symbolSearchState.grid = [];
    for (let row = 0; row < gridSize; row++) {
        symbolSearchState.grid[row] = [];
        for (let col = 0; col < gridSize; col++) {
            symbolSearchState.grid[row][col] = symbols[Math.floor(Math.random() * symbols.length)];
        }
    }
    
    let currentRow = targetRow;
    let currentCol = targetCol;
    for (let i = 0; i < keyLength; i++) {
        symbolSearchState.grid[currentRow][currentCol] = symbolSearchState.targetKey[i];
        currentCol++;
        if (currentCol >= gridSize) {
            currentCol = 0;
            currentRow++;
            if (currentRow >= gridSize) {
                currentRow = 0;
            }
        }
    }
    
    for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
            const cell = $('<div>')
                .addClass('symbol-search-cell')
                .attr('data-row', row)
                .attr('data-col', col)
                .text(symbolSearchState.grid[row][col]);
            
            gridContainer.append(cell);
        }
    }
    
    symbolSearchState.markerPosition = { 
        row: Math.floor(gridSize / 2), 
        col: Math.floor(gridSize / 2) 
    };
    
    $('#symbol-search-target').text(symbolSearchState.targetKey.join(' '));
    
    updateMarkerPosition();
}

function updateMarkerPosition() {
    $('.symbol-search-cell').removeClass('marker marker-sequence');
    
    const { row, col } = symbolSearchState.markerPosition;
    const gridSize = symbolSearchState.config.gridSize;
    const keyLength = symbolSearchState.targetKey.length;
    
    let currentRow = row;
    let currentCol = col;
    for (let i = 0; i < keyLength; i++) {
        const cell = $(`.symbol-search-cell[data-row="${currentRow}"][data-col="${currentCol}"]`);
        if (i === 0) {
            cell.addClass('marker');
        } else {
            cell.addClass('marker-sequence');
        }
        
        currentCol++;
        if (currentCol >= gridSize) {
            currentCol = 0;
            currentRow++;
            if (currentRow >= gridSize) {
                currentRow = 0;
            }
        }
    }
}

function startSymbolSearchRound() {
    console.log('Starting symbol search round');
    
    symbolSearchState.gameActive = true;
    
    symbolSearchState.keydownHandler = handleSymbolSearchKeyPress;
    document.addEventListener('keydown', symbolSearchState.keydownHandler);
    
    symbolSearchState.shiftTimer = setInterval(() => {
        shiftSymbols();
    }, symbolSearchState.config.shiftInterval);
    
    startSymbolSearchTimer();
}

function shiftSymbols() {
    if (!symbolSearchState.gameActive) return;
    
    const gridSize = symbolSearchState.config.gridSize;
    const newGrid = [];
    
    for (let row = 0; row < gridSize; row++) {
        newGrid[row] = [];
        for (let col = 0; col < gridSize; col++) {
            let sourceCol = col + 1;
            let sourceRow = row;
            
            if (sourceCol >= gridSize) {
                sourceCol = 0;
                sourceRow = row + 1;
                
                if (sourceRow >= gridSize) {
                    sourceRow = 0;
                }
            }
            
            newGrid[row][col] = symbolSearchState.grid[sourceRow][sourceCol];
        }
    }
    
    let newTargetRow = symbolSearchState.targetStartPosition.row;
    let newTargetCol = symbolSearchState.targetStartPosition.col - 1;
    
    if (newTargetCol < 0) {
        newTargetCol = gridSize - 1;
        newTargetRow = newTargetRow - 1;
        
        if (newTargetRow < 0) {
            newTargetRow = gridSize - 1;
        }
    }
    
    symbolSearchState.targetStartPosition = { row: newTargetRow, col: newTargetCol };
    symbolSearchState.grid = newGrid;
    
    updateGridDisplay();
}

function updateGridDisplay() {
    const gridSize = symbolSearchState.config.gridSize;
    
    for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
            const cell = $(`.symbol-search-cell[data-row="${row}"][data-col="${col}"]`);
            cell.text(symbolSearchState.grid[row][col]);
        }
    }
    
    updateMarkerPosition();
}

function handleSymbolSearchKeyPress(event) {
    if (!symbolSearchState.gameActive) return;
    
    const gridSize = symbolSearchState.config.gridSize;
    let { row, col } = symbolSearchState.markerPosition;
    
    switch (event.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
            row = Math.max(0, row - 1);
            event.preventDefault();
            break;
        case 'ArrowDown':
        case 's':
        case 'S':
            row = Math.min(gridSize - 1, row + 1);
            event.preventDefault();
            break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
            col = Math.max(0, col - 1);
            event.preventDefault();
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            col = Math.min(gridSize - 1, col + 1);
            event.preventDefault();
            break;
        case 'Enter':
        case ' ':
            event.preventDefault();
            checkSelection();
            return;
        case 'Escape':
            event.preventDefault();
            endSymbolSearchGame(false, 'cancelled');
            return;
    }
    
    symbolSearchState.markerPosition = { row, col };
    updateMarkerPosition();
    
    // move sound tad bit annoying. will need to be changed.
    if (typeof playSoundSafe === 'function') {
        playSoundSafe('sound-click');
    }
}

function checkSelection() {
    if (!symbolSearchState.gameActive) return;
    
    const { row, col } = symbolSearchState.markerPosition;
    const { row: targetRow, col: targetCol } = symbolSearchState.targetStartPosition;
    const gridSize = symbolSearchState.config.gridSize;
    const keyLength = symbolSearchState.targetKey.length;
    
    if (row === targetRow && col === targetCol) {
        console.log('Correct sequence found!');
        
        let currentRow = row;
        let currentCol = col;
        for (let i = 0; i < keyLength; i++) {
            $(`.symbol-search-cell[data-row="${currentRow}"][data-col="${currentCol}"]`).addClass('correct');
            currentCol++;
            if (currentCol >= gridSize) {
                currentCol = 0;
                currentRow++;
                if (currentRow >= gridSize) {
                    currentRow = 0;
                }
            }
        }
        
        if (typeof playSoundSafe === 'function') {
            playSoundSafe('sound-success');
        }
        
        setTimeout(() => {
            endSymbolSearchGame(true, 'success');
        }, 500);
    } else {
        console.log('Wrong position selected!');
        $(`.symbol-search-cell[data-row="${row}"][data-col="${col}"]`).addClass('wrong');
        
        if (typeof playSoundSafe === 'function') {
            playSoundSafe('sound-failure');
        }
        
        setTimeout(() => {
            endSymbolSearchGame(false, 'wrong_selection');
        }, 500);
    }
}

function startSymbolSearchTimer() {
    symbolSearchState.timeRemaining = symbolSearchState.config.timeLimit;
    
    const updateDisplay = () => {
        const seconds = (symbolSearchState.timeRemaining / 1000).toFixed(1);
        $('#symbol-search-timer').text(seconds);
        
        const percentage = (symbolSearchState.timeRemaining / symbolSearchState.config.timeLimit) * 100;
        $('.symbol-search-timer-progress').css('width', percentage + '%');
    };
    
    updateDisplay();
    
    symbolSearchState.countdownTimer = setInterval(() => {
        symbolSearchState.timeRemaining -= 100;
        
        if (symbolSearchState.timeRemaining <= 0) {
            symbolSearchState.timeRemaining = 0;
            updateDisplay();
            endSymbolSearchGame(false, 'timeout');
            return;
        }
        
        updateDisplay();
    }, 100);
    
    symbolSearchState.gameTimer = setTimeout(() => {
        if (symbolSearchState.gameActive) {
            endSymbolSearchGame(false, 'timeout');
        }
    }, symbolSearchState.config.timeLimit);
}

function endSymbolSearchGame(success, reason) {
    console.log(`Symbol Search Game ended: ${success ? 'SUCCESS' : 'FAILED'} - ${reason}`);
    
    symbolSearchState.gameActive = false;
    
    if (symbolSearchState.shiftTimer) {
        clearInterval(symbolSearchState.shiftTimer);
        symbolSearchState.shiftTimer = null;
    }
    if (symbolSearchState.gameTimer) {
        clearTimeout(symbolSearchState.gameTimer);
        symbolSearchState.gameTimer = null;
    }
    if (symbolSearchState.countdownTimer) {
        clearInterval(symbolSearchState.countdownTimer);
        symbolSearchState.countdownTimer = null;
    }
    
    if (symbolSearchState.keydownHandler) {
        document.removeEventListener('keydown', symbolSearchState.keydownHandler);
        symbolSearchState.keydownHandler = null;
    }
    
    if (success) {
        $('#symbol-search-message').text('SEQUENCE FOUND! Access granted.');
    } else {
        switch (reason) {
            case 'timeout':
                $('#symbol-search-message').text('TIME EXPIRED! Access denied.');
                break;
            case 'wrong_selection':
                $('#symbol-search-message').text('WRONG POSITION! Access denied.');
                break;
            default:
                $('#symbol-search-message').text('ACCESS DENIED!');
        }
    }
    
    const { row, col } = symbolSearchState.targetStartPosition;
    const gridSize = symbolSearchState.config.gridSize;
    const keyLength = symbolSearchState.targetKey.length;
    
    let currentRow = row;
    let currentCol = col;
    for (let i = 0; i < keyLength; i++) {
        $(`.symbol-search-cell[data-row="${currentRow}"][data-col="${currentCol}"]`).addClass('target-reveal');
        currentCol++;
        if (currentCol >= gridSize) {
            currentCol = 0;
            currentRow++;
            if (currentRow >= gridSize) {
                currentRow = 0;
            }
        }
    }
    
    setTimeout(() => {
        fetch('https://glitch-minigames/symbolSearchResult', {
            method: 'POST',
            body: JSON.stringify({ success: success, reason: reason })
        });
        
        $('#symbol-search-container').fadeOut(500);
    }, 1000);
}

function closeSymbolSearchGame() {
    symbolSearchState.gameActive = false;
    
    if (symbolSearchState.shiftTimer) {
        clearInterval(symbolSearchState.shiftTimer);
        symbolSearchState.shiftTimer = null;
    }
    if (symbolSearchState.gameTimer) {
        clearTimeout(symbolSearchState.gameTimer);
        symbolSearchState.gameTimer = null;
    }
    if (symbolSearchState.countdownTimer) {
        clearInterval(symbolSearchState.countdownTimer);
        symbolSearchState.countdownTimer = null;
    }
    
    if (symbolSearchState.keydownHandler) {
        document.removeEventListener('keydown', symbolSearchState.keydownHandler);
        symbolSearchState.keydownHandler = null;
    }
    
    $('#symbol-search-container').hide();
    
    fetch('https://glitch-minigames/symbolSearchClose', {
        method: 'POST',
        body: JSON.stringify({})
    });
}

window.startSymbolSearchGame = startSymbolSearchGame;
window.closeSymbolSearchGame = closeSymbolSearchGame;