# Builds the release assets used by setup.ps1:
#   dist\IcarusServerKit.zip       panel, mod, extractor, installer/updater scripts
#   dist\IcarusServerKit-data.zip  icons, creature images and map tiles (from panel\public\data)
# Requires cargo (to build the extractor). Run update-data.bat first to refresh panel\public\data.
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$dist = Join-Path $root 'dist'
$stage = Join-Path $dist 'stage\IcarusServerKit'

Push-Location (Join-Path $root 'tools\extractor')
cargo build --release
if ($LASTEXITCODE -ne 0) { throw 'cargo build failed' }
Pop-Location

if (Test-Path $dist) { Remove-Item $dist -Recurse -Force }
New-Item -ItemType Directory -Force "$stage\panel\public", "$stage\tools", "$stage\mod\IcarusServerKit" | Out-Null

Copy-Item "$root\panel\server.js" "$stage\panel\"
Copy-Item "$root\panel\src" "$stage\panel\" -Recurse
Copy-Item "$root\panel\public\index.html" "$stage\panel\public\"
Copy-Item "$root\panel\public\css", "$root\panel\public\js" "$stage\panel\public\" -Recurse
Copy-Item "$root\mod\IcarusServerKit\Scripts" "$stage\mod\IcarusServerKit\" -Recurse
Copy-Item "$root\tools\extractor\target\release\extractor.exe", "$root\tools\mock-mod.js" "$stage\tools\"
Copy-Item "$root\README.md", "$root\LICENSE", "$root\VERSION", "$root\setup.ps1", "$root\update.ps1", "$root\Update_ServerKit.bat" $stage

Compress-Archive (Join-Path $dist 'stage\IcarusServerKit') (Join-Path $dist 'IcarusServerKit.zip')
Remove-Item (Join-Path $dist 'stage') -Recurse -Force
Write-Host 'dist\IcarusServerKit.zip created'

$data = Join-Path $root 'panel\public\data'
if (Test-Path (Join-Path $data 'items.json')) {
    Compress-Archive (Join-Path $data '*') (Join-Path $dist 'IcarusServerKit-data.zip')
    Write-Host 'dist\IcarusServerKit-data.zip created'
} else {
    Write-Warning 'panel\public\data is empty - run update-data.bat to build the data package'
}
