@echo off
cd /d "%~dp0WEB"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0WEB\scripts\quick-start.ps1" -OpenBrowser
if errorlevel 1 pause
