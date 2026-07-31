@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0verify-release.ps1" %*
exit /b %errorlevel%
