@echo off
rem Regenera itens, icones e mapas a partir do jogo (rode apos atualizacoes do Icarus).
rem Uso: update-data.bat [pasta do jogo ICARUS]
set GAME=%~1
if "%GAME%"=="" set GAME=%~dp0..\ICARUS
"%~dp0tools\extractor\target\release\extractor.exe" build "%GAME%" "%~dp0panel\public\data"
pause
