@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"

echo.
echo Stopping Project Portfolio Dashboard...
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command "$root=[Regex]::Escape((Get-Location).Path);$targets=Get-CimInstance Win32_Process | Where-Object {$_.Name -eq 'node.exe' -and $_.CommandLine -match $root -and ($_.CommandLine -match 'next\s+dev' -or $_.CommandLine -match 'next\\dist' -or $_.CommandLine -match 'npm-cli\.js.*run\s+dev')};if($targets){$targets | ForEach-Object {try{Stop-Process -Id $_.ProcessId -Force -ErrorAction Stop;Write-Output('[OK] Stopped '+$_.Name+' PID '+$_.ProcessId)}catch{}}}else{Write-Output '[INFO] No running processes found.'}"

if exist ".next\dev\lock" (
    del /f /q ".next\dev\lock" >nul 2>&1
    echo [OK] Removed stale lock file.
)

echo.
echo Done.
