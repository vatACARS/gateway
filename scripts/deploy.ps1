# --- vatACARS Build & Deploy ---
Set-Location "$PSScriptRoot\.."
$projectName = "vatacars"

try {
    Write-Host "[!] Resetting SpacetimeDB host..." -ForegroundColor Yellow
    Get-Process "spacetimedb" -ErrorAction SilentlyContinue | Stop-Process -Force
    Start-Sleep -Seconds 2

    Write-Host "[+] Starting fresh background host..." -ForegroundColor Cyan
    Start-Process -FilePath "spacetime" -ArgumentList "start" -WindowStyle Hidden
    Start-Sleep -Seconds 5 

    Write-Host "[+] Publishing Rust module..." -ForegroundColor Cyan
    & spacetime publish $projectName
}
catch {
    Write-Host "[-] A script error occurred." -ForegroundColor Red
}
finally {
    Write-Host "[!] Cleaning up background processes..." -ForegroundColor Yellow
    Get-Process "spacetimedb" -ErrorAction SilentlyContinue | Stop-Process -Force
    Write-Host "[X] All locks released." -ForegroundColor Green
}

# Generate C# SDK (only if the publish succeeded)
if ($LASTEXITCODE -eq 0) {
    Write-Host "[+] Generating C# SDK..." -ForegroundColor Cyan
    if (!(Test-Path "./autogen")) { New-Item -ItemType Directory -Path "./autogen" }
    & spacetime generate --lang csharp --out-dir ./autogen
}