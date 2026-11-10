# Third party notices

glitch-minigames is GPL-3.0 (see `LICENSE`). It includes or is based on the work below. The licence status of each upstream repository was checked on GitHub in November 2026.

## Code the games are based on

| Game | Upstream | Licence | Files here |
|---|---|---|---|
| Data Crack | [utkuali/datacrack](https://github.com/utkuali/datacrack) | GPL-3.0 | `client/dataCrack/dataCrack.lua` (rewritten) |
| Circuit Breaker | [BerkieBb/CircuitBreakerMinigame_lua](https://github.com/BerkieBb/CircuitBreakerMinigame_lua), a Lua port of [TimothyDexter/FiveM-CircuitBreakerMinigame](https://github.com/TimothyDexter/FiveM-CircuitBreakerMinigame) | No licence file in either repository | `client/circuitBreaker/` |
| Fleeca Drilling | [MxttDev/M-drilling](https://github.com/MxttDev/M-drilling) | No licence file in the repository | `client/fleecaDrilling/fleecaDrilling.lua` |
| Plasma Drilling | [SezayK/six_atmrobbery](https://github.com/SezayK/six_atmrobbery) | No licence file in the repository | `client/plasmaDrilling/plasmaDrilling.lua` |
| Hacking PC games (ideas only) | [TransitNode/Hacking_PC](https://github.com/TransitNode/Hacking_PC) | No code copied | - |

Each one was reworked here for the busy lock, cleanup, load timeouts, the controls HUD and translations. The authors keep the credit for the original games. A repository without a licence file grants no licence in writing. If you are one of these authors and want your code credited or handled differently, open an issue on the [GitHub repository](https://github.com/Gl1tchStudios/glitch-minigames).

## Bundled files

- jQuery 3.6.0 (`ui/js/jquery-3.6.0.min.js`): MIT licence, copyright OpenJS Foundation and other contributors. The licence header is kept in the file.
- Fonts in `ui/fonts` (Figtree, JetBrains Mono, Chakra Petch, VT323, Barlow Condensed, Archivo Black, Share Tech Mono): SIL Open Font License 1.1, full text in `ui/fonts/OFL.txt`.

## Not bundled

ox_lib is a dependency, loaded from its own resource. It belongs to its authors and keeps its own licence.
