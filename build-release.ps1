# Monta dist\IcarusServerKit.zip (asset da release usado pelo setup.ps1).
# Requer: cargo (para compilar o extrator).
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$dist = Join-Path $root 'dist'
$stage = Join-Path $dist 'stage\IcarusServerKit'

Push-Location (Join-Path $root 'tools\extractor')
cargo build --release
if ($LASTEXITCODE -ne 0) { throw 'cargo build falhou' }
Pop-Location

if (Test-Path $dist) { Remove-Item $dist -Recurse -Force }
New-Item -ItemType Directory -Force "$stage\panel\public", "$stage\tools", "$stage\mod\IcarusServerKit\Scripts" | Out-Null
Copy-Item "$root\panel\server.js" "$stage\panel\"
Copy-Item "$root\panel\public\index.html", "$root\panel\public\app.js", "$root\panel\public\app.css" "$stage\panel\public\"
Copy-Item "$root\mod\IcarusServerKit\Scripts\*.lua" "$stage\mod\IcarusServerKit\Scripts\"
Copy-Item "$root\tools\extractor\target\release\extractor.exe", "$root\tools\mock-mod.js" "$stage\tools\"
Copy-Item "$root\README.md", "$root\LICENSE" $stage

Compress-Archive (Join-Path $dist 'stage\IcarusServerKit') (Join-Path $dist 'IcarusServerKit.zip')
Remove-Item (Join-Path $dist 'stage') -Recurse -Force
Write-Host "dist\IcarusServerKit.zip criado"
