@echo off
title DocuChain Local Server
echo ==========================================================
echo   DocuChain Web3 Document Verification System
echo ==========================================================
echo Starting local HTTP server on http://localhost:3000/ ...
cd /d "%~dp0"
start http://localhost:3000/
python -m http.server 3000 --directory frontend
if errorlevel 1 (
    echo.
    echo If python is not recognized, run using VS Code Live Server
    echo or npx serve frontend
    pause
)
