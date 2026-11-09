@echo off
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\quick-start.ps1" -OpenBrowser
if errorlevel 1 pause
