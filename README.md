# Icarus Server Kit

A web admin panel and server mod for **Icarus dedicated servers**, in the spirit of
[7DaysToDie-ServerKit](https://github.com/IceCoffee1024/7DaysToDie-ServerKit).

- **Live world map** (Olympus, Styx, Prometheus, Elysium and the outposts) with every player's position and heading
- **Players**: health, stamina, food, water and oxygen bars, level, XP, ping, idle time
- **Teleport**: click the map → "Teleport *player* here" (ground height is resolved in-game), by coordinates, to another player, bring one or everyone
- **Inventory** with game icons (quickbar, backpack, equipment, envirosuit); click a slot to remove items
- **Item catalog**: 3,000+ items with icons, categories and search; give any quantity
- **Creatures**: bestiary catalog with images; spawn any amount at random points around a player
- **Character**: heal, set stats, give XP, kill, clear inventory
- **World**: time of day, clear weather, save the world now, server-wide message, console command, diagnostics
- **Rules**: kick idle players, a minimum-players countdown so nobody progresses alone, exempt players, bans
- **Live log**: chat, joins/leaves, admin actions, rule actions
- **10 languages** — every language the game ships (English, Português, Español, Français, Deutsch, Русский, 日本語, 한국어, 简体中文, 繁體中文). Item, creature and map names come from the game's own translations.

## How it works

```
Browser ──HTTP/SSE──► panel (Node.js, no dependencies) ◄──files──► Lua mod (UE4SS) inside IcarusServer
                      port 8090                         ipc/        ue4ss/Mods/IcarusServerKit
```

| Folder | What it is |
|---|---|
| `mod/IcarusServerKit` | [UE4SS](https://github.com/UE4SS-RE/RE-UE4SS) Lua mod. Runs inside `IcarusServer-Win64-Shipping.exe` and calls the game's own functions. Every second it publishes the server state and evaluates the rules; every 250 ms it runs panel commands. |
| `panel` | Web panel: login, live updates (server-sent events), settings. |
| `tools/extractor` | Rust tool that reads the game `.pak` files (Oodle/Zlib) and builds `panel/public/data`: item and creature catalogs, icons, map tiles and translations. |

The mod and the panel talk through files in `ue4ss/Mods/IcarusServerKit/ipc` (UE4SS Lua has no sockets). Rules, bans
and exemptions live in `ue4ss/Mods/IcarusServerKit/settings.json`, which the panel edits and the mod reloads.

## Install

1. **Stop the dedicated server.**
2. Open PowerShell **in the dedicated server folder** (the one with `IcarusServer.exe`). In Explorer: Shift + right-click → "Open PowerShell window here".
3. Run:
   ```powershell
   irm https://raw.githubusercontent.com/BirdRa1n/IcarusServerKit/main/setup.ps1 | iex
   ```
4. Start the server as usual, then run **`Start_Panel.bat`** (created in the server folder). The first run prints the
   `admin` password.
5. Open `http://localhost:8090`.

The installer:
- downloads the kit into `<server>\IcarusServerKit`;
- installs UE4SS into `Icarus\Binaries\Win64` (keeps an existing UE4SS);
- copies and enables the mod;
- looks for the **Icarus game client** (Steam libraries, folders next to the server) and builds the item list, icons and
  maps from it. Dedicated-server files contain no textures, so without the client it downloads the prebuilt icon and map
  package (`IcarusServerKit-data.zip`, ~80 MB). Item lists are always rebuilt from the installed server, so they match
  its version;
- offers to install Node.js with `winget` when it is missing;
- creates `Start_Panel.bat` and `Update_ServerKit.bat`.

Options (set before running the command):
```powershell
$env:ISK_GAME_DIR = "E:\SteamLibrary\steamapps\common\Icarus"   # game folder, if not found automatically
# $env:ISK_GAME_DIR = "none"                                    # skip the game: use the icon/map package
```

## Update

Stop the server and double-click **`Update_ServerKit.bat`** in the server folder. It downloads the latest release and
reinstalls the mod, panel, icons and maps. `config.json` (panel users) and `settings.json` (rules, bans) are kept.
If the panel was running it is closed and reopened; reload the browser with **Ctrl+F5**.

> Installs older than v2.0.0 have an `Update_ServerKit.bat` that Microsoft Defender blocks
> (`Trojan:Win32/Commando.A!ml`, a heuristic on `powershell -Command irm … | iex` command lines). Run the install
> command above once; it replaces the updater with one that runs a local script instead.

## Rules

| Rule | Behaviour |
|---|---|
| **Inactivity kick** | A player that neither moves nor chats for *N* minutes is warned (*M* minutes before) and then kicked. |
| **Minimum players** | While fewer than *P* players are online, a countdown runs with a warning every few minutes. When it ends everyone is kicked, so nobody keeps progressing alone. It resets as soon as enough players are online. |
| **Exempt players** | Never kicked by the two rules above (e.g. admins). |
| **Bans** | Banned players are kicked as soon as they join. |

In-game warnings are server messages; their text is editable in the panel (`{name}`, `{minutes}`, `{players}` placeholders).

## Panel configuration (`IcarusServerKit/panel/config.json`)

```json
{
  "port": 8090,
  "host": "0.0.0.0",
  "users": [
    { "name": "admin", "password": "...", "role": "admin" },
    { "name": "moderator", "password": "...", "role": "viewer" }
  ]
}
```

`viewer` users can see the map, players and inventories but cannot change anything. The panel serves plain HTTP: to
reach it from outside your network use a VPN (e.g. WireGuard) instead of exposing the port.

## Troubleshooting

- **"Mod offline" in the panel** — the server is not running, or UE4SS did not load the mod. Check
  `Icarus\Binaries\Win64\ue4ss\UE4SS.log` for `[IcarusServerKit] loaded`.
- **A command fails after a game update** — open *World → Diagnostics → Test mod*: it reports which game systems the mod
  can reach.
- **No icons / grid map** — the icon and map package was not installed. Run `Update_ServerKit.bat`.
- **Panel does not start: invalid config.json** — fix the JSON shown in the error (a UTF-8 BOM is accepted).

## Development

- `node tools/mock-mod.js <dir>` simulates the mod (moving players, inventories, rule countdown). Point a panel at it with
  `ISK_CONFIG=<config.json with "ipcDir": "<dir>">`.
- `dev/CXXHeaderDump/` (not in git) holds the reflection dump of the server, generated by UE4SS — the reference for
  class and function names used by the mod.
- `update-data.bat [game folder]` rebuilds `panel/public/data`; `build-release.ps1` builds the release assets.
- Mod layout: `main.lua` (loop), `isk/ipc.lua`, `isk/settings.lua`, `isk/game.lua` (game access), `isk/commands.lua`,
  `isk/rules.lua`.

## Credits

Icarus and its artwork are © RocketWerkz. Icons, creature images and map tiles are extracted from the game for display in
the panel only. UE4SS is MIT-licensed. This project is MIT-licensed.
