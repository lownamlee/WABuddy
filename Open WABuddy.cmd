@echo off
pwsh -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-wabuddy.ps1"
if errorlevel 1 pause
