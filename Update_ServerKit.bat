@echo off
rem Icarus Server Kit - updates the mod, panel, icons and maps to the latest release.
cd /d "%~dp0"
if not exist "%~dp0IcarusServerKit\update.ps1" (
  echo IcarusServerKit\update.ps1 not found. Run the installer from the README once.
  pause
  exit /b 1
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0IcarusServerKit\update.ps1"
pause
