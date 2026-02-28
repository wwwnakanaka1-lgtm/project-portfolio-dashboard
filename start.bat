@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"

echo.
echo ============================================
echo   Project Portfolio Dashboard
echo ============================================
echo.

rem --- Stop old processes for this project ---
powershell -NoProfile -ExecutionPolicy Bypass -Command "$root=[Regex]::Escape((Get-Location).Path);Get-CimInstance Win32_Process | Where-Object {$_.Name -eq 'node.exe' -and $_.CommandLine -match $root -and ($_.CommandLine -match 'next\s+dev' -or $_.CommandLine -match 'next\\dist' -or $_.CommandLine -match 'npm-cli\.js.*run\s+dev')} | ForEach-Object {try{Stop-Process -Id $_.ProcessId -Force -ErrorAction Stop;Write-Output('[INFO] Stopped '+$_.Name+' PID '+$_.ProcessId)}catch{}}"

rem --- Remove stale Next.js lock ---
if exist ".next\dev\lock" (
    echo [INFO] Removing stale Next.js lock...
    del /f /q ".next\dev\lock" >nul 2>&1
)

rem --- Find available port starting from 3002 ---
set "PORT=3002"
:find_port
netstat -ano 2>nul | findstr "LISTENING" | findstr ":!PORT! " >nul 2>&1
if !errorlevel!==0 (
    echo [WARN] Port !PORT! is in use, trying next...
    set /a PORT+=1
    goto :find_port
)

title [Next.js] Portfolio Dashboard - :!PORT!
echo [INFO] Starting on port !PORT!...
echo.
echo   Dashboard: http://localhost:!PORT!
echo.

rem --- Open browser after short delay (wait for server) ---
start /b cmd /c "ping -n 4 127.0.0.1 >nul 2>&1 && start http://localhost:!PORT!"

npm run dev -- -p !PORT!
