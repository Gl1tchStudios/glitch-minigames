-- Glitch Minigames - controls HUD
--
-- Every minigame shows its controls on the left of the screen while it runs
-- (light keycaps + label, no box). The core wrapper calls ShowControls(name, args)
-- when an export starts and HideControls() when it ends, so each game only needs
-- an entry in GameControls below. Games whose keys come from their arguments
-- (skill check, bar hit, hold zone ...) read them from args.
--
-- Row: { keys = { 'W', 'S' }, label = 'Move drill', cancel = true }
-- Special key names shown as-is: LMB, RMB, MOUSE, SPACE, ENTER, BKSP, ESC, arrows.

local function Upper(list, fallback)
    local out = {}
    for _, k in ipairs(type(list) == 'table' and list or fallback) do out[#out + 1] = tostring(k):upper() end
    return out
end

-- The configured cancel keys (config.CancelKeys) as one row
local function Cancel()
    local keys = {}
    for _, name in ipairs(config.CancelKeys or { 'ESCAPE', 'BACKSPACE' }) do
        if name == 'ESCAPE' then keys[#keys + 1] = 'ESC'
        elseif name == 'BACKSPACE' then keys[#keys + 1] = 'BKSP'
        else keys[#keys + 1] = name end
    end
    return { keys = keys, label = 'Cancel', cancel = true }
end

local ESC = { keys = { 'ESC' }, label = 'Cancel', cancel = true }

GameControls = {
    -- scaleform / Lua games
    StartDrilling = function() return 'Drilling', {
        { keys = { 'W' }, label = 'Drill down' },
        { keys = { 'S' }, label = 'Lift to cool' },
        { keys = { 'E' }, label = 'Speed up' },
        { keys = { 'Q' }, label = 'Slow down' },
        ESC,
    } end,
    StartPlasmaDrilling = function() return 'Plasma drilling', {
        { keys = { 'UP', 'DOWN' }, label = 'Move drill' },
        { keys = { 'LEFT', 'RIGHT' }, label = 'Speed' },
        { keys = { 'ESC', 'BKSP' }, label = 'Cancel', cancel = true },
    } end,
    StartCircuitBreaker = function() return 'Circuit breaker', {
        { keys = { 'W', 'A', 'S', 'D' }, label = 'Steer the signal' },
        { keys = { 'Q' }, label = 'Quit', cancel = true },
    } end,
    StartDataCrack = function() return 'Data crack', {
        { keys = { 'LMB' }, label = 'Lock the column' },
        ESC,
    } end,
    StartBruteForce = function() return 'Brute force', {
        { keys = { 'MOUSE' }, label = 'Aim' },
        { keys = { 'LMB' }, label = 'Select' },
        { keys = { 'RMB' }, label = 'Back' },
    } end,

    -- NUI games
    StartFirewallPulse = function() return 'Firewall pulse', {
        { keys = { 'LMB' }, label = 'Hack inside the safe zone' },
        Cancel(),
    } end,
    StartBackdoorSequence = function() return 'Backdoor sequence', {
        { keys = { 'KEYS' }, label = 'Press the keys shown together' },
        Cancel(),
    } end,
    StartCircuitRhythm = function(args) return 'Circuit rhythm', {
        { keys = Upper(args[2], { 'A', 'S', 'D', 'F' }), label = 'Hit the notes in each lane' },
        Cancel(),
    } end,
    StartSurgeOverride = function(args) return 'Surge override', {
        { keys = Upper(args[1], { 'E' }), label = 'Mash the key shown' },
        Cancel(),
    } end,
    StartVarHack = function() return 'Var hack', {
        { keys = { 'LMB' }, label = 'Click the blocks in order' },
        Cancel(),
    } end,
    StartMemoryGame = function() return 'Memory', {
        { keys = { 'LMB' }, label = 'Click the squares that lit up' },
        Cancel(),
    } end,
    StartSequenceMemoryGame = function() return 'Sequence memory', {
        { keys = { 'LMB' }, label = 'Repeat the sequence' },
        Cancel(),
    } end,
    StartVerbalMemoryGame = function() return 'Verbal memory', {
        { keys = { 'LMB' }, label = 'Seen or new' },
        Cancel(),
    } end,
    StartNumberedSequenceGame = function() return 'Numbered sequence', {
        { keys = { 'LMB' }, label = 'Click the numbers in order' },
        Cancel(),
    } end,
    StartSymbolSearchGame = function() return 'Symbol search', {
        { keys = { 'W', 'A', 'S', 'D' }, label = 'Move the marker' },
        { keys = { 'ENTER', 'SPACE' }, label = 'Select' },
        Cancel(),
    } end,
    StartPipePressureGame = function() return 'Pipe pressure', {
        { keys = { 'LMB' }, label = 'Rotate a pipe' },
        Cancel(),
    } end,
    StartPairsGame = function() return 'Pairs', {
        { keys = { 'LMB' }, label = 'Flip two cards' },
        Cancel(),
    } end,
    StartMemoryColorsGame = function() return 'Memory colours', {
        { keys = { 'TYPE' }, label = 'Type the answer' },
        { keys = { 'ENTER' }, label = 'Submit' },
        Cancel(),
    } end,
    StartUntangleGame = function() return 'Untangle', {
        { keys = { 'LMB' }, label = 'Drag the points' },
        Cancel(),
    } end,
    StartFingerprintGame = function() return 'Fingerprint', {
        { keys = { 'LMB' }, label = 'Spin the rings with the arrows' },
        Cancel(),
    } end,
    StartCodeCrackGame = function() return 'Code crack', {
        { keys = { '0-9' }, label = 'Enter digits' },
        { keys = { 'BKSP' }, label = 'Delete' },
        { keys = { 'ENTER' }, label = 'Try the code' },
        { keys = { 'ESC' }, label = 'Cancel', cancel = true },
    } end,
    StartWordCrackGame = function() return 'Word crack', {
        { keys = { 'A-Z' }, label = 'Type letters' },
        { keys = { 'BKSP' }, label = 'Delete' },
        { keys = { 'ENTER' }, label = 'Try the word' },
        { keys = { 'ESC' }, label = 'Cancel', cancel = true },
    } end,
    StartBalanceGame = function() return 'Balance', {
        { keys = { 'Q' }, label = 'Lean left' },
        { keys = { 'E' }, label = 'Lean right' },
        Cancel(),
    } end,
    StartAimTestGame = function() return 'Aim test', {
        { keys = { 'LMB' }, label = 'Hit the targets' },
        Cancel(),
    } end,
    StartCircleClickGame = function(args) return 'Circle click', {
        { keys = { 'KEY' }, label = 'Press the key shown in the zone' },
        Cancel(),
    } end,
    StartLockpickGame = function() return 'Lockpick', {
        { keys = { 'A', 'D' }, label = 'Turn the pick (or mouse)' },
        { keys = { 'E', 'LMB' }, label = 'Hold to test the pin' },
        Cancel(),
    } end,
    StartBarHitGame = function(args) return 'Bar hit', {
        { keys = Upper({ args[1] }, { 'E' }), label = 'Press in the zone' },
        Cancel(),
    } end,
    StartSkillCheckGame = function(args) return 'Skill check', {
        { keys = Upper(args[1], { 'E', 'F', 'R' }), label = 'Press the key shown in the zone' },
        Cancel(),
    } end,
    StartNumberUpGame = function() return 'Number up', {
        { keys = { 'LMB' }, label = 'Click the numbers lowest first' },
        Cancel(),
    } end,
    StartKeysGame = function() return 'Keys', {
        { keys = { 'A-Z' }, label = 'Type the letters shown' },
        Cancel(),
    } end,
    StartComboInputGame = function() return 'Combo input', {
        { keys = { 'UP', 'DOWN', 'LEFT', 'RIGHT' }, label = 'Enter the combo' },
        Cancel(),
    } end,
    StartHoldZoneGame = function(args) return 'Hold zone', {
        { keys = Upper({ args[1] }, { 'E' }), label = 'Hold, release in the zone' },
        Cancel(),
    } end,
    StartWireConnectGame = function() return 'Wire connect', {
        { keys = { 'LMB' }, label = 'Connect matching wires' },
        Cancel(),
    } end,
    StartSimonSaysGame = function() return 'Simon says', {
        { keys = { 'LMB' }, label = 'Repeat the pattern' },
        Cancel(),
    } end,
}
-- the other circuit breaker entry points
GameControls.runMiniGame = GameControls.StartCircuitBreaker
GameControls.runDefaultMiniGameFromDifficulty = GameControls.StartCircuitBreaker
GameControls.runDefaultRandom = GameControls.StartCircuitBreaker

function ShowControls(name, args)
    local def = GameControls[name]
    if not def then return end
    local ok, title, rows = pcall(def, args or {})
    if not ok or not rows then return end
    SendNUIMessage({ action = 'controlsShow', title = title, rows = rows, hudTheme = Style and Style.hud or 'default' })
end

function HideControls()
    SendNUIMessage({ action = 'controlsHide' })
end
