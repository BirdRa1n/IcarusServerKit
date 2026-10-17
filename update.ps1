# Icarus Server Kit - updater (run by Update_ServerKit.bat in the dedicated server folder).
#
# Downloads the latest release package and runs the setup.ps1 it contains. The script is
# executed from a local file on purpose: antivirus heuristics flag "powershell -Command irm | iex"
# command lines (e.g. Microsoft Defender's Trojan:Win32/Commando.A!ml).

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$serverDir = Split-Path $PSScriptRoot -Parent  # <server>\IcarusServerKit\update.ps1 -> <server>
$tmp = Join-Path ([IO.Path]::GetTempPath()) ('isk-update-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory $tmp | Out-Null
try {
    Write-Host 'Downloading the latest Icarus Server Kit...' -ForegroundColor Cyan
    $zip = Join-Path $tmp 'IcarusServerKit.zip'
    Invoke-WebRequest 'https://github.com/BirdRa1n/IcarusServerKit/releases/latest/download/IcarusServerKit.zip' -OutFile $zip -UseBasicParsing
    Expand-Archive $zip (Join-Path $tmp 'kit')
    $setup = Join-Path $tmp 'kit\IcarusServerKit\setup.ps1'
    if (-not (Test-Path $setup)) { throw 'setup.ps1 not found in the release package' }

    $env:ISK_SERVER_DIR = $serverDir
    $env:ISK_LOCAL_KIT = $zip
    & $setup
} finally {
    Remove-Item Env:ISK_LOCAL_KIT -ErrorAction SilentlyContinue
    Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue
}
