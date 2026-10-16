@echo off
title Diario della Pressione - Server Locale PWA
cd /d "%~dp0"
echo ===================================================
echo   Diario della Pressione Arteriosa (Web App PWA)
echo ===================================================
echo.
echo Avvio della Web App su http://localhost:3000 ...
start "" "http://localhost:3000"
call "C:\Program Files\nodejs\npm.cmd" run preview
pause
