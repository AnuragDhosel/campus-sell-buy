# Day 2 Auth Test Script
# Run this from the project root: powershell -File test_auth.ps1
$base = "http://localhost:5000"
$jsonHeader = @{ "Content-Type" = "application/json" }

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " Campus Marketplace - Auth Test Suite   " -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# ─── TEST 1: SIGNUP ───────────────────────────────────────────────────────────
Write-Host "TEST 1: POST /api/auth/signup" -ForegroundColor Yellow
$signupBody = @{ name = "Anurag Test"; email = "anurag@test.com"; password = "secret123" } | ConvertTo-Json

try {
    $r1 = Invoke-RestMethod -Uri "$base/api/auth/signup" -Method POST -Headers $jsonHeader -Body $signupBody
    Write-Host "  Status : 201 Created" -ForegroundColor Green
    Write-Host "  Message: $($r1.message)"
    Write-Host "  Token  : $($r1.token.Substring(0,30))..." -ForegroundColor Gray
    $token = $r1.token
} catch {
    $code = $_.Exception.Response.StatusCode.value__
    Write-Host "  Status : $code (User may already exist - running login next)" -ForegroundColor DarkYellow
}

# ─── TEST 2: LOGIN ────────────────────────────────────────────────────────────
Write-Host "`nTEST 2: POST /api/auth/login" -ForegroundColor Yellow
$loginBody = @{ email = "anurag@test.com"; password = "secret123" } | ConvertTo-Json

try {
    $r2 = Invoke-RestMethod -Uri "$base/api/auth/login" -Method POST -Headers $jsonHeader -Body $loginBody
    Write-Host "  Status : 200 OK" -ForegroundColor Green
    Write-Host "  Message: $($r2.message)"
    Write-Host "  User   : $($r2.user.name) | Role: $($r2.user.role)"
    Write-Host "  Token  : $($r2.token.Substring(0,30))..." -ForegroundColor Gray
    $token = $r2.token
} catch {
    Write-Host "  FAILED : $($_.Exception.Message)" -ForegroundColor Red
}

# ─── TEST 3: PROTECTED ROUTE (valid token) ────────────────────────────────────
Write-Host "`nTEST 3: GET /api/test-profile (with valid token)" -ForegroundColor Yellow
if ($token) {
    $authHeader = @{ "Authorization" = "Bearer $token" }
    try {
        $r3 = Invoke-RestMethod -Uri "$base/api/test-profile" -Method GET -Headers $authHeader
        Write-Host "  Status : 200 OK" -ForegroundColor Green
        Write-Host "  Message: $($r3.message)"
        Write-Host "  User ID: $($r3.user._id)"
    } catch {
        Write-Host "  FAILED : $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "  SKIPPED: No token available" -ForegroundColor DarkYellow
}

# ─── TEST 4: PROTECTED ROUTE (no token) ──────────────────────────────────────
Write-Host "`nTEST 4: GET /api/test-profile (NO token - expect 401)" -ForegroundColor Yellow
try {
    Invoke-RestMethod -Uri "$base/api/test-profile" -Method GET
    Write-Host "  FAIL: Should have returned 401!" -ForegroundColor Red
} catch {
    $code = $_.Exception.Response.StatusCode.value__
    Write-Host "  Status : $code $(if ($code -eq 401) {'✅ PASS - Unauthorized as expected'} else {'❌ UNEXPECTED'})" -ForegroundColor $(if ($code -eq 401) { "Green" } else { "Red" })
}

# ─── TEST 5: WRONG PASSWORD (expect 401) ─────────────────────────────────────
Write-Host "`nTEST 5: POST /api/auth/login (wrong password - expect 401)" -ForegroundColor Yellow
$wrongBody = @{ email = "anurag@test.com"; password = "WRONGPASSWORD" } | ConvertTo-Json
try {
    Invoke-RestMethod -Uri "$base/api/auth/login" -Method POST -Headers $jsonHeader -Body $wrongBody
    Write-Host "  FAIL: Should have returned 401!" -ForegroundColor Red
} catch {
    $code = $_.Exception.Response.StatusCode.value__
    Write-Host "  Status : $code $(if ($code -eq 401) {'✅ PASS - Unauthorized as expected'} else {'❌ UNEXPECTED'})" -ForegroundColor $(if ($code -eq 401) { "Green" } else { "Red" })
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " Tests Complete!                        " -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan
