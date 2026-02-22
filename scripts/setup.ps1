# --- vatACARS Dependency Installer ---
$ErrorActionPreference = "Stop"

Write-Host "--- Checking vatACARS Dependencies ---" -ForegroundColor Cyan

# 1. Check/Install Rust
if (!(Get-Command rustc -ErrorAction SilentlyContinue)) {
    Write-Host "Rust not found. Installing via rustup..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri "https://static.rust-lang.org/rustup/dist/i386-pc-windows-msvc/rustup-init.exe" -OutFile "rustup-init.exe"
    .\rustup-init.exe -y --default-toolchain stable --profile minimal
    Remove-Item .\rustup-init.exe
    # Update current session path
    $env:Path += ";$env:USERPROFILE\.cargo\bin"
} else {
    Write-Host "Rust is already installed." -ForegroundColor Green
}

# 2. Add Wasm Target
Write-Host "Adding Wasm target..." -ForegroundColor Cyan
& rustup target add wasm32-unknown-unknown

# 3. Check/Install SpacetimeDB CLI
if (!(Get-Command spacetime -ErrorAction SilentlyContinue)) {
    Write-Host "SpacetimeDB CLI not found. Installing..." -ForegroundColor Yellow
    iwr https://install.spacetimedb.com | iex
    # Fixed Path Concatenation
    $stPath = "$($env:USERPROFILE)\.spacetimedb\bin"
    $env:Path += ";$stPath"
} else {
    Write-Host "SpacetimeDB CLI is already installed." -ForegroundColor Green
}

Write-Host "--- Setup Complete! PLEASE RESTART VS CODE ---" -ForegroundColor Green