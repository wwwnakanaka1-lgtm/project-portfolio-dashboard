@echo off
setlocal enabledelayedexpansion
title Project Portfolio Dashboard
cd /d "%~dp0"

:: Find available port starting from 3002
set PORT=3002
set MAX_PORT=3010

:check_port
netstat -an | findstr ":!PORT! " | findstr "LISTENING" >nul 2>&1
if !errorlevel!==0 (
    echo Port !PORT! is in use, trying next...
    set /a PORT+=1
    if !PORT! gtr !MAX_PORT! (
        echo Error: No available port found between 3002 and !MAX_PORT!
        pause
        exit /b 1
    )
    goto check_port
)

echo.
echo Starting Project Portfolio Dashboard...
echo.
echo http://localhost:!PORT!
echo.
start http://localhost:!PORT!
npm run dev -- -p !PORT!
