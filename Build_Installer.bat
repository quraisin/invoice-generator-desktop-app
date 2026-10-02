@echo off
title Invoice Master - Generate Installer & Dependencies
echo ========================================================
echo   INVOICE MASTER - REGENERATE NODE_MODULES & DIST EXE
echo   Developer: QuraisEnterprise
echo ========================================================
echo.
echo [1/2] Mengunduh dan menginstal dependensi (node_modules)...
call npm install
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Gagal menginstal dependensi! Pastikan Node.js terpasang di komputer Anda.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [2/2] Mengompilasi aplikasi dan membuat installer EXE di folder /dist...
call npm run build
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Gagal melakukan proses build installer!
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo ========================================================
echo   [SUKSES] Seluruh proses selesai!
echo   Folder /node_modules dan /dist telah berhasil dibuat.
echo   Installer baru tersedia di:
echo   dist\Invoice_Master_Setup_v1.0.1.exe
echo ========================================================
echo.
pause
