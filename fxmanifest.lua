fx_version 'cerulean'
game 'gta5'

author 'Luma in collaboration with Glitch Studios'
description 'Glitch Minigames'
version '1.0.4'

client_script {
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
    'ui/js/app.js',
    'ui/js/rhythm.js',
    'ui/js/keymash.js',    
    'ui/js/varHack.js',
    'ui/js/memory.js',
    'ui/js/sequenceMemory.js',
    'ui/js/verbalMemory.js',
    'ui/sounds/*.mp3',
    'ui/sounds/songs/*.mp3' -- Going to be used for the rhythm game later down the track
}

shared_scripts {
    'shared/config.lua'
}

lua54 'yes'
use_experimental_fxv2_oal 'yes'