@echo off
cd /d "%~dp0"
py -3 run_cms.py %*
if errorlevel 1 pause
