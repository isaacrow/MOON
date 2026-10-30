@echo off
chcp 65001 >nul
title Moon Library Suite - Master Launcher
color 0B
echo ===================================================================
echo   Starting Moon Library Suite (Moon Wolf + FOLIO + VuFind)
echo ===================================================================
powershell -NoProfile -ExecutionPolicy Bypass -Command "$script = Join-Path $PSScriptRoot 'start-suite.ps1'; if (-not (Test-Path $script)) { $script = Join-Path (Get-Location) 'start-suite.ps1' }; & $script"
pause
