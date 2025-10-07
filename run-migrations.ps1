# Run Migrations Script
# This script executes both migration files

Write-Host "🚀 Starting database migrations..." -ForegroundColor Cyan
Write-Host ""

# Load environment variables
$env:DATABASE_URL = (Get-Content .env.local | Select-String 'DATABASE_URL=' | ForEach-Object { $_ -replace 'DATABASE_URL="', '' } | ForEach-Object { $_ -replace '"', '' })

Write-Host "📋 Running Migration 1: Room-Level Sensors..." -ForegroundColor Yellow
$result1 = psql $env:DATABASE_URL -f "migration-room-level-sensors-FIXED.sql" 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Migration 1 completed!" -ForegroundColor Green
} else {
    Write-Host "❌ Migration 1 failed!" -ForegroundColor Red
    Write-Host $result1
    exit 1
}

Write-Host ""
Write-Host "📋 Running Migration 2: User Parameters..." -ForegroundColor Yellow
$result2 = psql $env:DATABASE_URL -f "migration-user-parameters-FIXED.sql" 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Migration 2 completed!" -ForegroundColor Green
} else {
    Write-Host "❌ Migration 2 failed!" -ForegroundColor Red
    Write-Host $result2
    exit 1
}

Write-Host ""
Write-Host "🎉 All migrations completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Verifying tables..." -ForegroundColor Cyan
psql $env:DATABASE_URL -c "SELECT COUNT(*) as room_sensors_count FROM room_sensors;"
psql $env:DATABASE_URL -c "SELECT COUNT(*) as user_parameters_count FROM user_parameters;"

Write-Host ""
Write-Host "✨ Database is ready! You can now start your application." -ForegroundColor Green
