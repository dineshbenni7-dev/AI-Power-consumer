# ─────────────────────────────────────────────────────────────
#  WattWise — Push project to GitHub via REST API (no git CLI)
#  Usage:  powershell -ExecutionPolicy Bypass -File push-to-github.ps1
# ─────────────────────────────────────────────────────────────

param(
    [string]$Token = "",        # pass via -Token or be prompted
    [string]$Branch = "main"
)

$OWNER  = "dineshbenni7-dev"
$REPO   = "AI-Power-consumer"
$BASE   = "https://api.github.com/repos/$OWNER/$REPO"

# ── 1. Ask for token if not provided ──────────────────────────
if (-not $Token) {
    $Token = Read-Host "🔑 Enter your GitHub Personal Access Token (ghp_…)"
}
if (-not $Token) { Write-Error "Token required."; exit 1 }

$Headers = @{
    Authorization = "Bearer $Token"
    Accept        = "application/vnd.github+json"
    "X-GitHub-Api-Version" = "2022-11-28"
    "User-Agent"  = "WattWise-PushScript"
}

# ── 2. Verify repo access ──────────────────────────────────────
Write-Host ""
Write-Host "⚡ WattWise — GitHub Push" -ForegroundColor Yellow
Write-Host "   Repo : https://github.com/$OWNER/$REPO" -ForegroundColor Gray
Write-Host "   Branch: $Branch" -ForegroundColor Gray
Write-Host ""

try {
    $repoInfo = Invoke-RestMethod -Uri $BASE -Headers $Headers -Method Get
    Write-Host "✅ Repo access confirmed: $($repoInfo.full_name)" -ForegroundColor Green
} catch {
    Write-Host "❌ Cannot access repo: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Check your PAT has 'repo' scope and the repo exists." -ForegroundColor Gray
    exit 1
}

# ── 3. Ensure branch exists (create from default if needed) ───
$defaultBranch = $repoInfo.default_branch
try {
    Invoke-RestMethod -Uri "$BASE/branches/$Branch" -Headers $Headers -Method Get | Out-Null
    Write-Host "✅ Branch '$Branch' exists" -ForegroundColor Green
} catch {
    Write-Host "📌 Creating branch '$Branch' from '$defaultBranch'…" -ForegroundColor Cyan
    $refData = Invoke-RestMethod -Uri "$BASE/git/refs/heads/$defaultBranch" -Headers $Headers -Method Get
    $sha = $refData.object.sha
    $body = @{ ref = "refs/heads/$Branch"; sha = $sha } | ConvertTo-Json
    try {
        Invoke-RestMethod -Uri "$BASE/git/refs" -Headers $Headers -Method Post -Body $body -ContentType "application/json" | Out-Null
        Write-Host "✅ Branch '$Branch' created" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  Could not create branch (may already exist): $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

# ── 4. Helper: upsert a single file ───────────────────────────
function Push-File {
    param([string]$FilePath, [string]$RepoPath)

    if (-not (Test-Path $FilePath)) {
        Write-Host "  ⚠️  Skipping (not found): $FilePath" -ForegroundColor Yellow
        return
    }

    # Read and base64-encode
    $bytes   = [System.IO.File]::ReadAllBytes((Resolve-Path $FilePath))
    $content = [Convert]::ToBase64String($bytes)
    $message = "Add $RepoPath"

    # Check if file already exists to get its SHA (needed for update)
    $existingSha = $null
    try {
        $existing    = Invoke-RestMethod -Uri "$BASE/contents/$RepoPath`?ref=$Branch" -Headers $Headers -Method Get
        $existingSha = $existing.sha
        $message     = "Update $RepoPath"
    } catch { }

    $body = @{
        message = $message
        content = $content
        branch  = $Branch
    }
    if ($existingSha) { $body.sha = $existingSha }

    try {
        Invoke-RestMethod -Uri "$BASE/contents/$RepoPath" -Headers $Headers -Method Put `
            -Body ($body | ConvertTo-Json -Depth 5) -ContentType "application/json" | Out-Null
        Write-Host "  ✅ $RepoPath" -ForegroundColor Green
    } catch {
        Write-Host "  ❌ $RepoPath — $($_.Exception.Message)" -ForegroundColor Red
    }
}

# ── 5. File manifest ───────────────────────────────────────────
Write-Host ""
Write-Host "📤 Uploading files…" -ForegroundColor Cyan

$files = @(
    @{ local = "README.md";            remote = "README.md" },
    @{ local = "package.json";         remote = "package.json" },
    @{ local = ".env.example";         remote = ".env.example" },
    @{ local = "server.js";            remote = "server.js" },
    @{ local = "setup.ps1";            remote = "setup.ps1" },
    @{ local = "standalone.html";      remote = "standalone.html" },
    @{ local = "public/index.html";    remote = "public/index.html" },
    @{ local = "public/style.css";     remote = "public/style.css" },
    @{ local = "public/app.js";        remote = "public/app.js" }
)

foreach ($f in $files) {
    Push-File -FilePath $f.local -RepoPath $f.remote
}

# ── 6. Done ────────────────────────────────────────────────────
Write-Host ""
Write-Host "🎉 Done! View your repo at:" -ForegroundColor Green
Write-Host "   https://github.com/$OWNER/$REPO/tree/$Branch" -ForegroundColor Yellow
Write-Host ""
