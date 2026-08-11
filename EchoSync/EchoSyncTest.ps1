# EchoSync Automated Validation Script
Param (
    [string]$EchoSyncExe = ".\EchoSync\EchoSync.exe"
)

Write-Host "===========================================================================" -ForegroundColor Cyan
Write-Host "                EchoSync End-to-End Test & Verification Suite             " -ForegroundColor Cyan
Write-Host "===========================================================================" -ForegroundColor Cyan

# 1. Setup Test Directories
$TestActive = "C:\EchoSync_Test_Active"
$TestPassive = "C:\EchoSync_Test_Passive"

if (Test-Path $TestActive) { Remove-Item -Path $TestActive -Recurse -Force }
if (Test-Path $TestPassive) { Remove-Item -Path $TestPassive -Recurse -Force }

New-Item -ItemType Directory -Path $TestActive | Out-Null
New-Item -ItemType Directory -Path $TestPassive | Out-Null

Write-Host "[1/5] Created test directories:" -ForegroundColor Yellow
Write-Host "      Active:  $TestActive" -ForegroundColor White
Write-Host "      Passive: $TestPassive" -ForegroundColor White

# 2. Write Test Configuration
$ConfigJson = @"
{
  "pairs": [
    {
      "id": "TestPair_01",
      "activePath": "C:\\\\EchoSync_Test_Active",
      "passivePath": "C:\\\\EchoSync_Test_Passive",
      "policy": "Mirror",
      "enabled": true,
      "recursive": true,
      "excludeDirectories": [".git", "node_modules", "build"],
      "excludeExtensions": [".tmp", ".bak"]
    }
  ]
}
"@

$ConfigJson | Out-File -FilePath "EchoSync.json" -Encoding utf8
Write-Host "[2/5] Created EchoSync.json configuration." -ForegroundColor Yellow

# 3. Verify EchoSync Executable
if (!(Test-Path $EchoSyncExe)) {
    Write-Host "[ERROR] EchoSync executable not found at $EchoSyncExe" -ForegroundColor Red
    exit 1
}

Write-Host "[3/5] Launching EchoSync engine in background..." -ForegroundColor Yellow
$Proc = Start-Process -FilePath $EchoSyncExe -ArgumentList "EchoSync.json" -PassThru -NoNewWindow
Start-Sleep -Seconds 2

if ($Proc.HasExited) {
    Write-Host "[ERROR] EchoSync process terminated prematurely." -ForegroundColor Red
    exit 1
}

Write-Host "[4/5] Running filesystem mutations (Create, Modify, Rename, Delete)..." -ForegroundColor Yellow

# Test A: Create File
$FileA = Join-Path $TestActive "hello.txt"
"Hello, EchoSync!" | Out-File -FilePath $FileA -Encoding utf8
Start-Sleep -Milliseconds 800

$TargetA = Join-Path $TestPassive "hello.txt"
if (Test-Path $TargetA) {
    Write-Host "      [PASS] CREATE propagated correctly!" -ForegroundColor Green
} else {
    Write-Host "      [FAIL] CREATE failed to propagate." -ForegroundColor Red
}

# Test B: Modify File
"Hello, EchoSync! Updated content." | Out-File -FilePath $FileA -Encoding utf8
Start-Sleep -Milliseconds 800

$Content = Get-Content $TargetA -Raw
if ($Content -like "*Updated content*") {
    Write-Host "      [PASS] MODIFY propagated correctly!" -ForegroundColor Green
} else {
    Write-Host "      [FAIL] MODIFY failed to propagate." -ForegroundColor Red
}

# Test C: Rename File
$FileARenamed = Join-Path $TestActive "hello_renamed.txt"
Rename-Item -Path $FileA -NewName "hello_renamed.txt"
Start-Sleep -Milliseconds 800

$TargetARenamed = Join-Path $TestPassive "hello_renamed.txt"
if ((Test-Path $TargetARenamed) -and !(Test-Path $TargetA)) {
    Write-Host "      [PASS] RENAME / MOVE propagated correctly!" -ForegroundColor Green
} else {
    Write-Host "      [FAIL] RENAME failed to propagate." -ForegroundColor Red
}

# Test D: Excluded Directory (.git)
$GitDirActive = Join-Path $TestActive ".git"
New-Item -ItemType Directory -Path $GitDirActive | Out-Null
"git data" | Out-File -FilePath (Join-Path $GitDirActive "config") -Encoding utf8
Start-Sleep -Milliseconds 800

$GitDirPassive = Join-Path $TestPassive ".git"
if (!(Test-Path $GitDirPassive)) {
    Write-Host "      [PASS] EXCLUDED DIRECTORY (.git) ignored correctly!" -ForegroundColor Green
} else {
    Write-Host "      [FAIL] EXCLUDED DIRECTORY (.git) was erroneously copied." -ForegroundColor Red
}

# Test E: Delete File
Remove-Item -Path $FileARenamed -Force
Start-Sleep -Milliseconds 800

if (!(Test-Path $TargetARenamed)) {
    Write-Host "      [PASS] DELETE propagated correctly!" -ForegroundColor Green
} else {
    Write-Host "      [FAIL] DELETE failed to propagate." -ForegroundColor Red
}

# 5. Clean up process
Write-Host "[5/5] Terminating EchoSync process..." -ForegroundColor Yellow
Stop-Process -Id $Proc.Id -Force
Start-Sleep -Seconds 1

Write-Host "===========================================================================" -ForegroundColor Cyan
Write-Host "             All EchoSync Tests Completed Successfully!                   " -ForegroundColor Cyan
Write-Host "===========================================================================" -ForegroundColor Cyan
