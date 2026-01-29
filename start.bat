@echo off
title Project Portfolio Dashboard
cd /d "%~dp0"
echo Starting Project Portfolio Dashboard...
echo.
echo http://localhost:3002
echo.
start http://localhost:3002
npm run dev -- -p 3002
