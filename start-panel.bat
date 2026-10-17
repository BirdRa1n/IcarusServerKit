@echo off
rem Starts the web panel from the repository checkout (requires Node.js 18+).
cd /d "%~dp0panel"
node server.js
pause
