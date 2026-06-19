# Glunity Development Bootstrapper
# Installs dependencies with legacy peer deps and runs all services concurrently.

Write-Host "==================================================" -ForegroundColor Green
Write-Host "   GLUNITY SYSTEM DEVELOPMENT BOOTSTRAPPER        " -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
Write-Host ""

Write-Host "[1/2] Syncing and installing project dependencies..." -ForegroundColor Cyan
npm install --legacy-peer-deps

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error: npm install failed! Please resolve dependency conflicts." -ForegroundColor Red
    Exit $LASTEXITCODE
}

Write-Host ""
Write-Host "[2/2] Launching services concurrently..." -ForegroundColor Cyan
Write-Host "API (Blue) | Messaging (Green) | Mobile Expo (Magenta)" -ForegroundColor Gray
Write-Host "Press Ctrl+C to stop all services cleanly." -ForegroundColor Yellow
Write-Host ""

npm run dev
