@echo off
REM ==================================================
REM HYDRO NEXUS - Run Database Migration (Windows)
REM ==================================================

echo.
echo ==========================================
echo HYDRO NEXUS: Room-Level Sensor Migration
echo ==========================================
echo.

REM Check if PostgreSQL tools are in PATH
where psql >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: psql not found in PATH!
    echo.
    echo Please ensure PostgreSQL is installed and psql is in your PATH.
    echo Common locations:
    echo   - C:\Program Files\PostgreSQL\16\bin
    echo   - C:\Program Files\PostgreSQL\15\bin
    echo.
    echo Or run manually in pgAdmin/DBeaver.
    pause
    exit /b 1
)

echo PostgreSQL tools found!
echo.

REM Get database connection details
set /p DB_HOST="Enter database host (default: localhost): "
if "%DB_HOST%"=="" set DB_HOST=localhost

set /p DB_PORT="Enter database port (default: 5432): "
if "%DB_PORT%"=="" set DB_PORT=5432

set /p DB_NAME="Enter database name (default: hydro_nexus): "
if "%DB_NAME%"=="" set DB_NAME=hydro_nexus

set /p DB_USER="Enter database user (default: postgres): "
if "%DB_USER%"=="" set DB_USER=postgres

echo.
echo Connecting to: %DB_USER%@%DB_HOST%:%DB_PORT%/%DB_NAME%
echo.

REM Run migration
echo Running migration...
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -f migration-room-level-sensors.sql

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Migration failed!
    echo Check the error messages above.
    pause
    exit /b 1
)

echo.
echo ==========================================
echo Migration Complete!
echo ==========================================
echo.
echo Next steps:
echo 1. Restart your Next.js server
echo 2. Test: http://localhost:3000/api/sensors/latest
echo 3. Open dashboard and verify room sensors display correctly
echo.

pause
