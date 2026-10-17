# Icarus Server Kit - instalador
#
# Abra o PowerShell NA PASTA DO SERVIDOR DEDICADO e rode:
#   irm https://raw.githubusercontent.com/BirdRa1n/IcarusServerKit/main/setup.ps1 | iex
#
# Opcoes (variaveis de ambiente, definidas antes do comando):
#   $env:ISK_GAME_DIR  = "D:\SteamLibrary\steamapps\common\Icarus"   # pasta do jogo (para icones e mapa)
#   $env:ISK_GAME_DIR  = "none"                                       # nao procurar o jogo: baixa o pacote pronto
#   $env:ISK_SERVER_DIR = "D:\ICARUS Dedicated Server"               # se nao estiver rodando na pasta do servidor
#   $env:ISK_LOCAL_KIT = "C:\caminho\IcarusServerKit.zip"            # instalar de um zip local (sem baixar)
#
# Mensagens sem acentos de proposito: o script e executado via iex no Windows PowerShell 5.1.

& {
    $ErrorActionPreference = 'Stop'
    $ProgressPreference = 'SilentlyContinue'
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

    $Repo = 'BirdRa1n/IcarusServerKit'
    $KitUrl = "https://github.com/$Repo/releases/latest/download/IcarusServerKit.zip"
    $Ue4ssUrl = "https://github.com/$Repo/releases/latest/download/UE4SS.zip"
    $DataUrl = "https://github.com/$Repo/releases/latest/download/IcarusServerKit-data.zip"

    function Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
    function Ok($msg) { Write-Host "    $msg" -ForegroundColor Green }
    function Warn($msg) { Write-Host "    $msg" -ForegroundColor Yellow }

    # ------------------------------------------------------------ server folder
    $ServerDir = if ($env:ISK_SERVER_DIR) { $env:ISK_SERVER_DIR } else { (Get-Location).Path }
    $ServerDir = (Resolve-Path $ServerDir).Path
    $Win64 = Join-Path $ServerDir 'Icarus\Binaries\Win64'
    if (-not (Test-Path (Join-Path $Win64 'IcarusServer-Win64-Shipping.exe'))) {
        Write-Host "Pasta do servidor dedicado do Icarus nao encontrada em:`n  $ServerDir" -ForegroundColor Red
        Write-Host "Abra o PowerShell na pasta do servidor (a que tem IcarusServer.exe) e rode o comando de novo."
        return
    }
    Write-Host "Icarus Server Kit - instalando em $ServerDir" -ForegroundColor White

    if (Get-Process -Name 'IcarusServer-Win64-Shipping' -ErrorAction SilentlyContinue) {
        Write-Host "`nO servidor esta rodando. Feche o servidor e rode o instalador de novo." -ForegroundColor Red
        return
    }

    $Tmp = Join-Path ([IO.Path]::GetTempPath()) ("isk-" + [guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory $Tmp | Out-Null
    try {
        # ------------------------------------------------------------ download kit
        Step 'Baixando o Icarus Server Kit'
        $kitZip = Join-Path $Tmp 'kit.zip'
        if ($env:ISK_LOCAL_KIT) {
            Copy-Item $env:ISK_LOCAL_KIT $kitZip
            Ok "usando $env:ISK_LOCAL_KIT"
        } else {
            Invoke-WebRequest $KitUrl -OutFile $kitZip -UseBasicParsing
            Ok 'ok'
        }
        Expand-Archive $kitZip (Join-Path $Tmp 'kit')
        $Src = Join-Path $Tmp 'kit\IcarusServerKit'

        # ------------------------------------------------------------ kit files
        Step 'Copiando painel e ferramentas'
        $Kit = Join-Path $ServerDir 'IcarusServerKit'
        $cfg = Join-Path $Kit 'panel\config.json'
        $cfgBackup = $null
        if (Test-Path $cfg) { $cfgBackup = [IO.File]::ReadAllText($cfg) }

        # a running panel is closed during the update and reopened at the end
        $panelPort = 8090
        if ($cfgBackup) { try { $p = ($cfgBackup.TrimStart([char]0xFEFF) | ConvertFrom-Json).port; if ($p) { $panelPort = [int]$p } } catch {} }
        $panelWasRunning = $false
        try {
            $owners = Get-NetTCPConnection -LocalPort $panelPort -State Listen -ErrorAction Stop | Select-Object -ExpandProperty OwningProcess -Unique
            foreach ($o in $owners) {
                $proc = Get-Process -Id $o -ErrorAction SilentlyContinue
                if ($proc -and $proc.ProcessName -eq 'node') {
                    Stop-Process -Id $o -Force
                    $panelWasRunning = $true
                }
            }
            if ($panelWasRunning) { Ok "painel em execucao (porta $panelPort) fechado para atualizar" }
        } catch {}
        foreach ($d in 'panel\public\index.html', 'panel\public\app.js', 'panel\public\app.css', 'panel\server.js', 'tools', 'mod', 'README.md') {
            $p = Join-Path $Kit $d
            if (Test-Path $p) { Remove-Item $p -Recurse -Force }
        }
        New-Item -ItemType Directory -Force $Kit | Out-Null
        Copy-Item (Join-Path $Src '*') $Kit -Recurse -Force
        if ($cfgBackup) {
            # UTF-8 without BOM: Set-Content -Encoding UTF8 adds a BOM in Windows PowerShell 5.1 and breaks JSON.parse
            [IO.File]::WriteAllText($cfg, $cfgBackup.TrimStart([char]0xFEFF), (New-Object Text.UTF8Encoding $false))
            Ok 'config.json existente mantido'
        }
        Ok $Kit

        # ------------------------------------------------------------ UE4SS
        Step 'UE4SS (carregador de mods)'
        $Ue4ss = Join-Path $Win64 'ue4ss'
        if ((Test-Path (Join-Path $Ue4ss 'UE4SS.dll')) -and (Test-Path (Join-Path $Win64 'dwmapi.dll'))) {
            Ok 'ja instalado - mantido'
        } else {
            $uz = Join-Path $Tmp 'ue4ss.zip'
            Invoke-WebRequest $Ue4ssUrl -OutFile $uz -UseBasicParsing
            Expand-Archive $uz (Join-Path $Tmp 'ue4ss')
            Copy-Item (Join-Path $Tmp 'ue4ss\dwmapi.dll') $Win64 -Force
            Copy-Item (Join-Path $Tmp 'ue4ss\ue4ss') $Win64 -Recurse -Force
            # the dedicated server does not need UE4SS's sample / keyboard mods
            $txt = Join-Path $Ue4ss 'Mods\mods.txt'
            (Get-Content $txt) -replace '^(CheatManagerEnablerMod|ConsoleCommandsMod|ConsoleEnablerMod|BPML_GenericFunctions|BPModLoaderMod|Keybinds) : 1', '$1 : 0' |
                Set-Content $txt -Encoding Ascii
            Set-Content (Join-Path $Ue4ss 'Mods\mods.json') '[]' -Encoding Ascii
            Ok "instalado em $Ue4ss"
        }

        # ------------------------------------------------------------ mod
        Step 'Mod IcarusServerKit'
        $ModDst = Join-Path $Ue4ss 'Mods\IcarusServerKit\Scripts'
        New-Item -ItemType Directory -Force $ModDst | Out-Null
        Copy-Item (Join-Path $Kit 'mod\IcarusServerKit\Scripts\*.lua') $ModDst -Force

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
        if (Test-Path $json) {
            $parsed = Get-Content $json -Raw | ConvertFrom-Json
            $mods = @($parsed | Where-Object { $_ -and $_.mod_name -ne 'IcarusServerKit' })
        }
        $mods += [pscustomobject]@{ mod_name = 'IcarusServerKit'; mod_enabled = $true }
        ConvertTo-Json -InputObject @($mods) | Set-Content $json -Encoding Ascii
        Ok 'ativado'

        # ------------------------------------------------------------ game data
        Step 'Gerando lista de itens, icones e mapas'
        $pak = 'Icarus\Content\Paks\pakchunk0-WindowsNoEditor.pak'
        $game = $null
        $candidates = @()
        if ($env:ISK_GAME_DIR) { $candidates += $env:ISK_GAME_DIR }
        # folders next to the server (e.g. a copy of the game)
        $candidates += @(Get-ChildItem (Split-Path $ServerDir -Parent) -Directory -ErrorAction SilentlyContinue | ForEach-Object { $_.FullName })
        # Steam libraries
        try {
            $steam = (Get-ItemProperty 'HKCU:\Software\Valve\Steam' -ErrorAction Stop).SteamPath
            $vdf = Join-Path $steam 'steamapps\libraryfolders.vdf'
            $libs = @($steam)
            if (Test-Path $vdf) {
                $libs += Select-String -Path $vdf -Pattern '"path"\s+"([^"]+)"' | ForEach-Object { $_.Matches[0].Groups[1].Value -replace '\\\\', '\' }
            }
            $candidates += $libs | ForEach-Object { Join-Path $_ 'steamapps\common\Icarus' }
        } catch {}
        if ($env:ISK_GAME_DIR -eq 'none') { $candidates = @() }   # force the downloadable data package
        foreach ($c in $candidates) {
            if ($c -and (Test-Path (Join-Path $c $pak))) { $game = (Resolve-Path $c).Path; break }
        }
        $extractor = Join-Path $Kit 'tools\extractor.exe'
        $data = Join-Path $Kit 'panel\public\data'
        $source = $ServerDir
        if ($game) {
            Ok "jogo encontrado em $game"
            $source = $game
        } else {
            # dedicated-server paks carry no textures: fetch the prebuilt icons and map tiles
            Ok 'jogo (cliente) nao encontrado - baixando pacote de icones e mapas (~80 MB)'
            $dz = Join-Path $Tmp 'data.zip'
            try {
                Invoke-WebRequest $DataUrl -OutFile $dz -UseBasicParsing
                New-Item -ItemType Directory -Force $data | Out-Null
                Expand-Archive $dz $data -Force
                Ok 'pacote de dados instalado'
            } catch {
                Warn "Nao foi possivel baixar o pacote de dados: $($_.Exception.Message)"
                Warn 'O painel funcionara sem icones e com o mapa em grade. Defina $env:ISK_GAME_DIR para usar o jogo.'
            }
        }
        # items/maps are always rebuilt from the installed files (matches the server version);
        # images missing from the server paks are taken from the data package
        # the extractor logs to stderr; Windows PowerShell would turn that into errors under 'Stop'
        $ErrorActionPreference = 'Continue'
        & $extractor build $source $data 2>&1 | ForEach-Object { Write-Host "    $_" }
        $code = $LASTEXITCODE
        $ErrorActionPreference = 'Stop'
        if ($code -ne 0) { throw "falha ao gerar os dados do painel (extractor saiu com $code)" }

        # ------------------------------------------------------------ Node.js
        Step 'Node.js'
        $node = Get-Command node -ErrorAction SilentlyContinue
        if (-not $node -and (Test-Path "$env:ProgramFiles\nodejs\node.exe")) { $node = Get-Item "$env:ProgramFiles\nodejs\node.exe" }
        if ($node) {
            Ok "encontrado ($(& node --version 2>$null))"
        } elseif (Get-Command winget -ErrorAction SilentlyContinue) {
            $ans = Read-Host '    Node.js nao encontrado (necessario para o painel). Instalar agora com winget? [S/n]'
            if ($ans -eq '' -or $ans -match '^[sSyY]') {
                winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
            } else {
                Warn 'Instale o Node.js 18+ manualmente: https://nodejs.org'
            }
        } else {
            Warn 'Node.js nao encontrado. Instale o Node.js 18+ : https://nodejs.org'
        }

        # ------------------------------------------------------------ launchers
        $bat = Join-Path $ServerDir 'Start_Panel.bat'
        Set-Content $bat "@echo off`r`nrem Icarus Server Kit - painel web`r`ncd /d `"%~dp0IcarusServerKit\panel`"`r`nif exist `"%ProgramFiles%\nodejs\node.exe`" (`"%ProgramFiles%\nodejs\node.exe`" server.js) else (node server.js)`r`npause`r`n" -Encoding Ascii
        $upd = Join-Path $ServerDir 'Update_ServerKit.bat'
        Set-Content $upd "@echo off`r`nrem Icarus Server Kit - atualiza mod, painel, icones e mapas para a versao mais nova`r`ncd /d `"%~dp0`"`r`npowershell -NoProfile -ExecutionPolicy Bypass -Command `"irm https://raw.githubusercontent.com/$Repo/main/setup.ps1 | iex`"`r`npause`r`n" -Encoding Ascii

        $kitVersion = ''
        $vf = Join-Path $Kit 'VERSION'
        if (Test-Path $vf) { $kitVersion = ' ' + (Get-Content $vf -Raw).Trim() }
        Write-Host ''
        Write-Host "Icarus Server Kit$kitVersion instalado!" -ForegroundColor Green
        Write-Host '  1. Inicie o servidor normalmente (Start_Server.bat)'
        Write-Host '  2. Rode Start_Panel.bat (na primeira vez ele mostra a senha do usuario admin)'
        Write-Host "  3. Abra http://localhost:$panelPort  (se ja estava aberto: Ctrl+F5)"
        Write-Host '  Para atualizar no futuro: Update_ServerKit.bat'
        if ($panelWasRunning) {
            Start-Process -FilePath $bat -WorkingDirectory $ServerDir
            Ok 'painel reaberto em outra janela'
        }
    } finally {
        Remove-Item $Tmp -Recurse -Force -ErrorAction SilentlyContinue
    }
}
