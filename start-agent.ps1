# QBM-HydroNet Agent Manager
# Quick script to manage your Qubit voice agent

Write-Host "🤖 QBM-HydroNet Agent Manager" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan
Write-Host ""

# Check if agent is already running
$existingAgent = Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*node.exe*" }

if ($existingAgent) {
    Write-Host "⚠️  Node process(es) already running:" -ForegroundColor Yellow
    $existingAgent | ForEach-Object {
        Write-Host "   PID: $($_.Id) | CPU: $($_.CPU)s" -ForegroundColor Yellow
    }
    Write-Host ""
    
    $choice = Read-Host "Stop existing process(es) and restart? (Y/N)"
    if ($choice -eq "Y" -or $choice -eq "y") {
        Write-Host "🛑 Stopping existing node processes..." -ForegroundColor Red
        Stop-Process -Name node -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
        Write-Host "✅ Processes stopped" -ForegroundColor Green
    } else {
        Write-Host "❌ Cancelled. Exiting..." -ForegroundColor Red
        exit
    }
}

Write-Host ""
Write-Host "🚀 Starting Qubit Agent..." -ForegroundColor Green
Write-Host "   Room: qbm-hydronet-voice" -ForegroundColor Gray
Write-Host "   Model: gemini-2.0-flash-exp (FREE)" -ForegroundColor Gray
Write-Host "   Features: PAW monitoring, AMF tracking, Bioregenerative control" -ForegroundColor Gray
Write-Host ""
Write-Host "💡 Tip: Agent will stay alive for multiple connections!" -ForegroundColor Cyan
Write-Host "   You can open/close the dialog multiple times without restarting." -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop the agent" -ForegroundColor Yellow
Write-Host "==============================" -ForegroundColor Cyan
Write-Host ""

# Start the agent
node agent.js dev
