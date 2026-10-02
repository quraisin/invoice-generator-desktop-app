@echo off
title Membuka Sistem Generator Invoice Desktop...
cd /d "%~dp0"

echo ========================================================
echo        MEMULAI APLIKASI INVOICE DESKTOP
echo ========================================================
echo.

if not exist "node_modules" (
    echo Menginstal dependensi awal...
    call npm install
)

echo Membuka aplikasi...
start "" npx electron .
exit
