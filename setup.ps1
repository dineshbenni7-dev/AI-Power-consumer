# WattWise — Quick Setup Script
# Run: powershell -ExecutionPolicy Bypass -File setup.ps1

Write-Host ""
Write-Host "⚡ WattWise — Electricity Consumption AI Agent" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════" -ForegroundColor DarkGray
Write-Host ""

# 1. Check Node.js
$nodeVersion = & node --version 2>$null
if (-not $?) {
    Write-Host "❌ Node.js is not installed." -ForegroundColor Red
    Write-Host "   Download from: https://nodejs.org (LTS version)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "💡 Alternative: Open standalone.html directly in your browser — no Node required!" -ForegroundColor Cyan
    exit 1
}
Write-Host "✅ Node.js $nodeVersion found" -ForegroundColor Green

# 2. Create .env from example
if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "✅ Created .env file" -ForegroundColor Green
} else {
    Write-Host "✅ .env already exists" -ForegroundColor Green
}

# 3. Ask for API key
$currentKey = (Get-Content ".env" | Where-Object { $_ -match "GROQ_API_KEY=" }) -replace "GROQ_API_KEY=",""
if ($currentKey -eq "your_groq_api_key_here" -or $currentKey -eq "") {
    Write-Host ""
    $key = Read-Host "🔑 Enter your Groq API key (gsk_…)"
    if ($key -ne "") {
        (Get-Content ".env") -replace "GROQ_API_KEY=.*", "GROQ_API_KEY=$key" | Set-Content ".env"
        Write-Host "✅ API key saved to .env" -ForegroundColor Green
    }
}

# 4. Install dependencies
Write-Host ""
Write-Host "📦 Installing dependencies…" -ForegroundColor Cyan
& npm install
if (-not $?) { Write-Host "❌ npm install failed" -ForegroundColor Red; exit 1 }
Write-Host "✅ Dependencies installed" -ForegroundColor Green

# 5. Start server
Write-Host ""
Write-Host "🚀 Starting WattWise server…" -ForegroundColor Cyan
Write-Host "   Open: http://localhost:3000" -ForegroundColor Yellow
Write-Host "   Press Ctrl+C to stop" -ForegroundColor Gray
Write-Host ""
& node server.js
