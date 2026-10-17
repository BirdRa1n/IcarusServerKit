# Icarus Server Kit - installer
#
# Open PowerShell IN THE DEDICATED SERVER FOLDER and run:
#   irm https://raw.githubusercontent.com/BirdRa1n/IcarusServerKit/main/setup.ps1 | iex
# Afterwards, update with Update_ServerKit.bat (created in the server folder).
#
# Options (environment variables, set before running):
#   $env:ISK_GAME_DIR   = "D:\SteamLibrary\steamapps\common\Icarus"  # game client folder (icons and map)
#   $env:ISK_GAME_DIR   = "none"                                      # do not look for the game: use the data package
#   $env:ISK_SERVER_DIR = "D:\ICARUS Dedicated Server"               # when not running inside the server folder
#   $env:ISK_LOCAL_KIT  = "C:\path\IcarusServerKit.zip"              # install from a local package
#
# Messages are ASCII on purpose: the script runs through iex in Windows PowerShell 5.1.

& {
    $ErrorActionPreference = 'Stop'
    $ProgressPreference = 'SilentlyContinue'
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

    $Repo = 'BirdRa1n/IcarusServerKit'
    $Release = "https://github.com/$Repo/releases/latest/download"

    function Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
    function Ok($msg) { Write-Host "    $msg" -ForegroundColor Green }
    function Warn($msg) { Write-Host "    $msg" -ForegroundColor Yellow }
    function Write-Utf8($path, $text) { [IO.File]::WriteAllText($path, $text, (New-Object Text.UTF8Encoding $false)) }

    # ------------------------------------------------------------ server folder
    $ServerDir = if ($env:ISK_SERVER_DIR) { $env:ISK_SERVER_DIR } else { (Get-Location).Path }
    $ServerDir = (Resolve-Path $ServerDir).Path
    $Win64 = Join-Path $ServerDir 'Icarus\Binaries\Win64'
    if (-not (Test-Path (Join-Path $Win64 'IcarusServer-Win64-Shipping.exe'))) {
        Write-Host "Icarus dedicated server not found in:`n  $ServerDir" -ForegroundColor Red
        Write-Host 'Open PowerShell in the server folder (the one with IcarusServer.exe) and run the command again.'
        return
    }
    Write-Host "Icarus Server Kit - installing into $ServerDir" -ForegroundColor White
    if (Get-Process -Name 'IcarusServer-Win64-Shipping' -ErrorAction SilentlyContinue) {
        Write-Host "`nThe server is running. Close it and run the installer again." -ForegroundColor Red
        return
    }

    $Tmp = Join-Path ([IO.Path]::GetTempPath()) ('isk-' + [guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory $Tmp | Out-Null
    try {
        # ------------------------------------------------------------ package
        Step 'Downloading Icarus Server Kit'
        $kitZip = Join-Path $Tmp 'kit.zip'
        if ($env:ISK_LOCAL_KIT) {
            Copy-Item $env:ISK_LOCAL_KIT $kitZip
            Ok "using $env:ISK_LOCAL_KIT"
        } else {
            Invoke-WebRequest "$Release/IcarusServerKit.zip" -OutFile $kitZip -UseBasicParsing
            Ok 'done'
        }
        Expand-Archive $kitZip (Join-Path $Tmp 'kit')
        $Src = Join-Path $Tmp 'kit\IcarusServerKit'

        # ------------------------------------------------------------ panel + tools
        Step 'Installing panel and tools'
        $Kit = Join-Path $ServerDir 'IcarusServerKit'
        $cfg = Join-Path $Kit 'panel\config.json'
        $cfgText = if (Test-Path $cfg) { [IO.File]::ReadAllText($cfg).TrimStart([char]0xFEFF) } else { $null }

        # a running panel is closed during the update and reopened at the end
        $panelPort = 8090
        if ($cfgText) { try { $p = ($cfgText | ConvertFrom-Json).port; if ($p) { $panelPort = [int]$p } } catch {} }
        $panelWasRunning = $false
        try {
            foreach ($o in (Get-NetTCPConnection -LocalPort $panelPort -State Listen -ErrorAction Stop | Select-Object -ExpandProperty OwningProcess -Unique)) {
                $proc = Get-Process -Id $o -ErrorAction SilentlyContinue
                if ($proc -and $proc.ProcessName -eq 'node') {
                    Stop-Process -Id $o -Force
                    $panelWasRunning = $true
                }
            }
            if ($panelWasRunning) { Ok "closed the running panel (port $panelPort)" }
        } catch {}

        # replace program files; keep config.json and the generated data
        foreach ($d in 'panel\server.js', 'panel\src', 'panel\public\index.html', 'panel\public\css', 'panel\public\js',
                       'panel\public\app.js', 'panel\public\app.css', 'tools', 'mod', 'README.md') {
            $p = Join-Path $Kit $d
            if (Test-Path $p) { Remove-Item $p -Recurse -Force }
        }
        New-Item -ItemType Directory -Force $Kit | Out-Null
        Copy-Item (Join-Path $Src '*') $Kit -Recurse -Force
        if ($cfgText) {
            Write-Utf8 $cfg $cfgText # UTF-8 without BOM (Node's JSON.parse rejects a BOM)
            Ok 'kept the existing config.json'
        }
        Ok $Kit

        # ------------------------------------------------------------ UE4SS
        Step 'UE4SS (mod loader)'
        $Ue4ss = Join-Path $Win64 'ue4ss'
        if ((Test-Path (Join-Path $Ue4ss 'UE4SS.dll')) -and (Test-Path (Join-Path $Win64 'dwmapi.dll'))) {
            Ok 'already installed - kept'
        } else {
            $uz = Join-Path $Tmp 'ue4ss.zip'
            Invoke-WebRequest "$Release/UE4SS.zip" -OutFile $uz -UseBasicParsing
            Expand-Archive $uz (Join-Path $Tmp 'ue4ss')
            Copy-Item (Join-Path $Tmp 'ue4ss\dwmapi.dll') $Win64 -Force
            Copy-Item (Join-Path $Tmp 'ue4ss\ue4ss') $Win64 -Recurse -Force
            # a dedicated server does not need UE4SS's sample / keyboard mods
            $txt = Join-Path $Ue4ss 'Mods\mods.txt'
            (Get-Content $txt) -replace '^(CheatManagerEnablerMod|ConsoleCommandsMod|ConsoleEnablerMod|BPML_GenericFunctions|BPModLoaderMod|Keybinds) : 1', '$1 : 0' |
                Set-Content $txt -Encoding Ascii
            Set-Content (Join-Path $Ue4ss 'Mods\mods.json') '[]' -Encoding Ascii
            Ok "installed into $Ue4ss"
        }

        # ------------------------------------------------------------ mod
        Step 'IcarusServerKit mod'
        $ModDir = Join-Path $Ue4ss 'Mods\IcarusServerKit'
        $Scripts = Join-Path $ModDir 'Scripts'
        if (Test-Path $Scripts) { Remove-Item $Scripts -Recurse -Force } # settings.json and ipc/ live outside Scripts
        New-Item -ItemType Directory -Force $Scripts | Out-Null
        Copy-Item (Join-Path $Kit 'mod\IcarusServerKit\Scripts\*') $Scripts -Recurse -Force

        $txt = Join-Path $Ue4ss 'Mods\mods.txt'
        $lines = @(Get-Content $txt | Where-Object { $_ -notmatch '^\s*IcarusServerKit\s*:' })
        $kb = -1
        for ($i = 0; $i -lt $lines.Count; $i++) { if ($lines[$i] -match 'Built-in keybinds') { $kb = $i; break } }
        if ($kb -ge 0) {
            $before = if ($kb -gt 0) { $lines[0..($kb - 1)] } else { @() }
            $lines = @($before) + 'IcarusServerKit : 1' + @($lines[$kb..($lines.Count - 1)])
        } else { $lines += 'IcarusServerKit : 1' }
        $lines | Set-Content $txt -Encoding Ascii

        $json = Join-Path $Ue4ss 'Mods\mods.json'
        $mods = @()
        if (Test-Path $json) { $mods = @((Get-Content $json -Raw | ConvertFrom-Json) | Where-Object { $_ -and $_.mod_name -ne 'IcarusServerKit' }) }
        $mods += [pscustomobject]@{ mod_name = 'IcarusServerKit'; mod_enabled = $true }
        ConvertTo-Json -InputObject @($mods) | Set-Content $json -Encoding Ascii
        Ok 'enabled'

        # ------------------------------------------------------------ game data
        Step 'Building item list, icons and maps'
        $pak = 'Icarus\Content\Paks\pakchunk0-WindowsNoEditor.pak'
        $candidates = @()
        if ($env:ISK_GAME_DIR) { $candidates += $env:ISK_GAME_DIR }
        $candidates += @(Get-ChildItem (Split-Path $ServerDir -Parent) -Directory -ErrorAction SilentlyContinue | ForEach-Object { $_.FullName })
        try {
            $steam = (Get-ItemProperty 'HKCU:\Software\Valve\Steam' -ErrorAction Stop).SteamPath
            $vdf = Join-Path $steam 'steamapps\libraryfolders.vdf'
            $libs = @($steam)
            if (Test-Path $vdf) { $libs += Select-String -Path $vdf -Pattern '"path"\s+"([^"]+)"' | ForEach-Object { $_.Matches[0].Groups[1].Value -replace '\\\\', '\' } }
            $candidates += $libs | ForEach-Object { Join-Path $_ 'steamapps\common\Icarus' }
        } catch {}
        if ($env:ISK_GAME_DIR -eq 'none') { $candidates = @() }
        $game = $candidates | Where-Object { $_ -and (Test-Path (Join-Path $_ $pak)) } | Select-Object -First 1

        $extractor = Join-Path $Kit 'tools\extractor.exe'
        $data = Join-Path $Kit 'panel\public\data'
        $source = $ServerDir
        if ($game) {
            $source = (Resolve-Path $game).Path
            Ok "game found in $source"
        } else {
            # dedicated-server paks carry no textures: fetch the prebuilt icons and map tiles
            Ok 'game client not found - downloading the icon and map package (~80 MB)'
            try {
                $dz = Join-Path $Tmp 'data.zip'
                Invoke-WebRequest "$Release/IcarusServerKit-data.zip" -OutFile $dz -UseBasicParsing
                New-Item -ItemType Directory -Force $data | Out-Null
                Expand-Archive $dz $data -Force
                Ok 'data package installed'
            } catch {
                Warn "Could not download the data package: $($_.Exception.Message)"
                Warn 'The panel will work without icons and with a grid map. Set $env:ISK_GAME_DIR to use the game files.'
            }
        }
        # item lists are always rebuilt from the installed files so they match the server version;
        # images missing from the server paks are taken from the data package.
        # The extractor logs to stderr, which Windows PowerShell would turn into errors under 'Stop'.
        $ErrorActionPreference = 'Continue'
        & $extractor build $source $data 2>&1 | ForEach-Object { Write-Host "    $_" }
        $code = $LASTEXITCODE
        $ErrorActionPreference = 'Stop'
        if ($code -ne 0) { throw "failed to build the panel data (extractor exited with $code)" }

        # ------------------------------------------------------------ Node.js
        Step 'Node.js'
        $node = Get-Command node -ErrorAction SilentlyContinue
        if (-not $node -and (Test-Path "$env:ProgramFiles\nodejs\node.exe")) { $node = Get-Item "$env:ProgramFiles\nodejs\node.exe" }
        if ($node) {
            Ok "found ($(& $node.Source --version 2>$null))"
        } elseif (Get-Command winget -ErrorAction SilentlyContinue) {
            $ans = Read-Host '    Node.js was not found (the panel needs it). Install it now with winget? [Y/n]'
            if ($ans -eq '' -or $ans -match '^[yYsS]') {
                winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
            } else { Warn 'Install Node.js 18+ from https://nodejs.org' }
        } else { Warn 'Node.js was not found. Install Node.js 18+ from https://nodejs.org' }

        # ------------------------------------------------------------ launchers
        $bat = Join-Path $ServerDir 'Start_Panel.bat'
        Set-Content $bat "@echo off`r`nrem Icarus Server Kit - web panel`r`ncd /d `"%~dp0IcarusServerKit\panel`"`r`nif exist `"%ProgramFiles%\nodejs\node.exe`" (`"%ProgramFiles%\nodejs\node.exe`" server.js) else (node server.js)`r`npause`r`n" -Encoding Ascii
        Copy-Item (Join-Path $Kit 'Update_ServerKit.bat') (Join-Path $ServerDir 'Update_ServerKit.bat') -Force

        $version = if (Test-Path (Join-Path $Kit 'VERSION')) { ' ' + (Get-Content (Join-Path $Kit 'VERSION') -Raw).Trim() } else { '' }
        Write-Host ''
        Write-Host "Icarus Server Kit$version installed!" -ForegroundColor Green
        Write-Host '  1. Start the server as usual (Start_Server.bat)'
        Write-Host '  2. Run Start_Panel.bat (the first run prints the admin password)'
        Write-Host "  3. Open http://localhost:$panelPort  (if it was already open: Ctrl+F5)"
        Write-Host '  To update later: Update_ServerKit.bat'
        if ($panelWasRunning) {
            Start-Process -FilePath $bat -WorkingDirectory $ServerDir
            Ok 'panel reopened in a new window'
        }
    } finally {
        Remove-Item $Tmp -Recurse -Force -ErrorAction SilentlyContinue
    }
}
