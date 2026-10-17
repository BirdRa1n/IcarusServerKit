@echo off
rem Rebuilds panel\public\data (items, creatures, icons, maps, translations) from the game files.
rem Usage: update-data.bat [Icarus game folder]   (default: ..\ICARUS)
set GAME=%~1
if "%GAME%"=="" set GAME=%~dp0..\ICARUS
"%~dp0tools\extractor\target\release\extractor.exe" build "%GAME%" "%~dp0panel\public\data"
pause
