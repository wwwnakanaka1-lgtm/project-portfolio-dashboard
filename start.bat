@echo off
setlocal enabledelayedexpansion
title [Next.js] Portfolio Dashboard - :3002
cd /d "%~dp0"

:: Find available port starting from 3002
set PORT=3002
:find_port
netstat -ano 2>nul | findstr ":!PORT! " | findstr "LISTENING" >nul 2>&1
if !errorlevel!==0 (
    echo [WARN] Port !PORT! is in use, trying next...
    set /a PORT+=1
    goto :find_port
)

title [Next.js] Portfolio Dashboard - :!PORT!
echo.
echo Starting Project Portfolio Dashboard...
echo.
echo http://localhost:!PORT!
echo.
start http://localhost:!PORT!
npm run dev -- -p !PORT!
