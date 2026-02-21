# Hydro-Nexus Cleanup Script
# This script removes unnecessary documentation and temporary files

Write-Host "Starting Hydro-Nexus Cleanup..." -ForegroundColor Cyan

# Create a backup list of files to be deleted
$filesToDelete = @()

# 1. Remove excessive documentation (keep only essential ones)
$essentialDocs = @(
    "README.md",
    "BUILD_FIXES.md",
    "VERCEL_DEPLOYMENT.md",
    "USER_DATA_PERSISTENCE.md",
    "QUBIT_AGRICULTURAL_INTELLIGENCE.md",
    "CLEANUP_RECOMMENDATION.md"
)

Write-Host "`nChecking documentation files..." -ForegroundColor Yellow
$allMdFiles = Get-ChildItem -Path . -Filter "*.md" -File
foreach ($file in $allMdFiles) {
    if ($essentialDocs -notcontains $file.Name) {
        $filesToDelete += $file.FullName
        Write-Host "  - Will remove: $($file.Name)" -ForegroundColor Gray
    }
}

# 2. Remove temporary/test directories
$tempDirs = @(
    "jules-scratch",
    "KMS"
)

Write-Host "`nChecking temporary directories..." -ForegroundColor Yellow
foreach ($dir in $tempDirs) {
    if (Test-Path $dir) {
        Write-Host "  - Will remove directory: $dir" -ForegroundColor Gray
        $filesToDelete += (Get-Item $dir).FullName
    }
}

# 3. Remove duplicate migration files (keep only FIXED versions)
$migrationFilesToRemove = @(
    "migration-room-level-sensors.sql",
    "migration-user-parameters.sql",
    "run-migration.bat",
    "run-migration.sql",
    "run-migrations.ps1",
    "schema-updated.sql",
    "supabase-setup-extensions.sql",
    "supabase-simple-verify.sql",
    "supabase-verify-setup.sql",
    "timescale-complete-fix.sql",
    "update-to-exotic-crops.sql",
    "verify-database.sql"
)

Write-Host "`nChecking migration files..." -ForegroundColor Yellow
foreach ($file in $migrationFilesToRemove) {
    if (Test-Path $file) {
        Write-Host "  - Will remove: $file" -ForegroundColor Gray
        $filesToDelete += (Get-Item $file).FullName
    }
}

# 4. Remove batch/shell scripts that are redundant
$scriptsToRemove = @(
    "start-agent-loop.bat",
    "start-agent.ps1",
    "check-models.js"
)

Write-Host "`nChecking script files..." -ForegroundColor Yellow
foreach ($file in $scriptsToRemove) {
    if (Test-Path $file) {
        Write-Host "  - Will remove: $file" -ForegroundColor Gray
        $filesToDelete += (Get-Item $file).FullName
    }
}

# 5. Remove unused config/temp files
$miscToRemove = @(
    ".eslintrc.json",
    "et --hard e45a4b9",
    "tsconfig.tsbuildinfo",
    "esp32-hydroponic-system.ino"
)

Write-Host "`nChecking miscellaneous files..." -ForegroundColor Yellow
foreach ($file in $miscToRemove) {
    if (Test-Path $file) {
        Write-Host "  - Will remove: $file" -ForegroundColor Gray
        $filesToDelete += (Get-Item $file).FullName
    }
}

# Display summary
Write-Host "`nSummary:" -ForegroundColor Cyan
Write-Host "  Total files/directories to remove: $($filesToDelete.Count)" -ForegroundColor White

# Ask for confirmation
Write-Host "`nWARNING: This will permanently delete $($filesToDelete.Count) items!" -ForegroundColor Red
$confirmation = Read-Host "Do you want to proceed? (yes/no)"

if ($confirmation -eq "yes") {
    Write-Host "`nDeleting files..." -ForegroundColor Yellow
    
    foreach ($item in $filesToDelete) {
        try {
            if (Test-Path $item -PathType Container) {
                Remove-Item -Path $item -Recurse -Force
                Write-Host "  [OK] Deleted directory: $(Split-Path $item -Leaf)" -ForegroundColor Green
            } else {
                Remove-Item -Path $item -Force
                Write-Host "  [OK] Deleted file: $(Split-Path $item -Leaf)" -ForegroundColor Green
            }
        } catch {
            Write-Host "  [FAIL] Failed to delete: $(Split-Path $item -Leaf) - $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    
    Write-Host "`nCleanup complete!" -ForegroundColor Green
    Write-Host "Your project is now cleaner and ready for deployment." -ForegroundColor Cyan
} else {
    Write-Host "`nCleanup cancelled." -ForegroundColor Yellow
}
