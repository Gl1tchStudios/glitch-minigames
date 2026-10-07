fx_version 'cerulean'
game 'gta5'

author 'Luma in collaboration with Glitch Studios'
description 'Glitch Minigames'
version '2.5.0'

client_script {
    'client/core/client.lua', -- must stay first: wraps every export below (busy lock, XP, perks)
    'client/core/style.lua', -- colour / minigame theme / keybinds theme, per-call overrides
    'client/core/controls.lua', -- controls HUD shown on the left while a game runs

    'client/customMinigames/client.lua',

    'client/circuitBreaker/init.lua',
    'client/circuitBreaker/globals.lua',
    'client/circuitBreaker/map.lua',
    'client/circuitBreaker/portlights.lua',
    'client/circuitBreaker/helper.lua',
    'client/circuitBreaker/generic.lua',
    'client/circuitBreaker/cursor.lua',
    'client/circuitBreaker/circuit.lua',

    'client/dataCrack/dataCrack.lua',

    'client/bruteForce/bruteForce.lua',

    'client/utils/scaleforms.lua',
    'client/fleecaDrilling/fleecaDrilling.lua',
    'client/plasmaDrilling/plasmaDrilling.lua',
}

ui_page 'ui/index.html'

files {
    'client/circuitBreaker/class.lua',
    'ui/index.html',
    'ui/css/style.css',
    'ui/css/themes.css', -- 'device' + 'tablet' visual themes and keybind HUD themes
    'ui/js/jquery-3.6.0.min.js',
    'ui/js/app.js',
    'ui/js/firewallPulse.js',
    'ui/js/backdoorSequence.js',
    'ui/js/rhythm.js',
    'ui/js/keymash.js',
    'ui/js/varHack.js',
    'ui/js/memory.js',
    'ui/js/sequenceMemory.js',    
    'ui/js/verbalMemory.js',
    'ui/js/numberedSequence.js',
    'ui/js/symbolSearch.js',
    'ui/js/pipePressure.js',
    'ui/js/pairs.js',
    'ui/js/memoryColors.js',
    'ui/js/untangle.js',
    'ui/js/fingerprint.js',
    'ui/js/codeCrack.js',
    'ui/js/wordCrack.js',
    'ui/js/balance.js',
    'ui/js/aimTest.js',
    'ui/js/circleClick.js',
    'ui/js/lockpick.js',
    'ui/js/barHit.js',
    'ui/js/skillCheck.js',
    'ui/js/numberUp.js',
    'ui/js/keys.js',
    'ui/js/comboInput.js',
    'ui/js/holdZone.js',
    'ui/js/wireConnect.js',
    'ui/js/simonSays.js',
    'ui/sounds/*.mp3',
    'ui/sounds/songs/*.mp3' -- Going to be used for the rhythm game later down the track
}

shared_scripts {
    'shared/config.lua'
}

server_scripts {
    'server/xp.lua'
}

lua54 'yes'
use_experimental_fxv2_oal 'yes'
