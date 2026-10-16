@echo off
title Diario della Pressione - Avvia per iPhone (Safari Wi-Fi)
cd /d "%~dp0"
node scripts/serve-iphone.mjs
pause
