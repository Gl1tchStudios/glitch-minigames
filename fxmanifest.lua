fx_version 'cerulean'
game 'gta5'
lua54 'yes'
use_experimental_fxv2_oal 'yes'

name 'glitch-minigames'
author 'Glitch Studios'
description '38 hacking, memory, skill and drilling minigames, one export each, with a shared busy lock, themes, a controls HUD and optional XP and perks'
version '2.6.1'
repository 'https://github.com/Gl1tchStudios/glitch-minigames'

-- Required: ox_lib.
-- Optional, all checked at run time: glitch-xpSystem (hacking XP and perks; the server
-- also reads qbx_core, qb-core or es_extended for the hourly XP cap), glitch-uiElements
-- (keycap controls HUD), glitch-notifications (result and perk popups), glitch-poolcleaning
-- (net event reports). The ox_lib skill check redirect needs a small patch in ox_lib
-- itself. See README.md.
dependencies {
    'ox_lib',
}

shared_scripts {
    '@ox_lib/init.lua',
    'shared/config.lua',
}

client_scripts {
    'client/core/client.lua', -- must stay first: wraps every export below (busy lock, XP, perks)
    'client/core/style.lua', -- colour / minigame theme / keybinds theme, per-call overrides
    'client/core/controls.lua', -- controls HUD shown on the left while a game runs

    'client/customMinigames/client.lua',

    'client/circuitBreaker/init.lua', -- CircuitBreaker table + class loader, before the other circuit files
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

    'client/core/cleanup.lua', -- resource stop cleanup (props, freeze, NUI focus), keep last
}

server_script '@glitch-poolcleaning/guard/server.lua' -- glitch-poolcleaning net event guard (keep first)
server_scripts {
    'server/guard.lua', -- optional glitch-poolcleaning net event reports (before xp.lua)
    'server/xp.lua',
}

ui_page 'ui/index.html'

files {
    'client/circuitBreaker/class.lua', -- loaded by client/circuitBreaker/init.lua
    'ui/index.html',
    'ui/css/style.css',
    'ui/css/themes.css', -- 'device' + 'tablet' visual themes and keybind HUD themes
    'ui/css/hackGames.css', -- shape recall, memory diff, traceroute, carrier tune
    'ui/fonts/fonts.css', -- bundled fonts (SIL OFL, see ui/fonts/OFL.txt): no request to Google
    'ui/fonts/*.woff2',
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
    'ui/js/hackGamesKit.js',
    'ui/js/shapeRecall.js',
    'ui/js/memoryDiff.js',
    'ui/js/traceroute.js',
    'ui/js/carrierTune.js',
    'ui/sounds/*.mp3',
}

-- The resource is GPL-3.0 and ships open. If you package it through Tebex anyway,
-- keep these files readable so owners can edit them.
escrow_ignore {
    'shared/config.lua',
    'server/guard.lua',
}
