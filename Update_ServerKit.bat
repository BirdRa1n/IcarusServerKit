@echo off
rem Icarus Server Kit - atualiza mod, painel, icones e mapas para a versao mais nova.
rem Coloque este arquivo na pasta do servidor dedicado (a que tem IcarusServer.exe) e de dois cliques.
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -Command "irm https://raw.githubusercontent.com/BirdRa1n/IcarusServerKit/main/setup.ps1 | iex"
pause
