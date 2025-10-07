@echo off
REM QBM-HydroNet Qubit Agent Launcher
REM This keeps the agent running persistently

echo ========================================
echo    QBM-HydroNet Qubit Agent
echo ========================================
echo.
echo Starting agent in continuous mode...
echo The agent will automatically handle reconnections.
echo.
echo Press Ctrl+C to stop
echo ========================================
echo.

:restart
node agent.js dev
if %ERRORLEVEL% EQU 0 (
    echo.
    echo Agent exited normally. Restarting in 2 seconds...
    timeout /t 2 /nobreak >nul
    goto restart
) else (
    echo.
    echo Agent crashed. Restarting in 5 seconds...
    timeout /t 5 /nobreak >nul
    goto restart
)
