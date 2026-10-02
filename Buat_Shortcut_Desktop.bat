@echo off
title Membuat Shortcut Desktop...
cd /d "%~dp0"

echo ========================================================
echo        MEMBUAT SHORTCUT DI DESKTOP WINDOWS
echo ========================================================
echo.

powershell -ExecutionPolicy Bypass -File "%~dp0create_shortcut.ps1"
echo.
pause
