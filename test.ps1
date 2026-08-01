<#
.SYNOPSIS
    Enterprise System & Directory Analytics Engine (SYNONYM EDITION)
.DESCRIPTION
    Full system with file code allotment, catalog, and synonym-based narration variation.
#>

[CmdletBinding()]
param(
    [Parameter(Position = 0, ValueFromPipeline = $true)]
    [ValidateNotNullOrEmpty()]
    [string]$Path = (Get-Location).Path,

    [Parameter(Position = 1)]
    [string]$Music,

    [Switch]$NoMusic,

    [ValidateRange(5, 500)]
    [int]$MaxDisplayRows = 50
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# ---------- Crash Handler ----------
$script:ErrorLogFile = Join-Path $PSScriptRoot "error_log.txt"
function Write-CrashLog {
    param([string]$Message, [Exception]$Exception)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] $Message`n$($Exception.ToString())`n`n"
    Add-Content -Path $script:ErrorLogFile -Value $logEntry -Encoding UTF8
}

$global:ErrorActionPreference = 'Stop'
trap {
    Write-CrashLog -Message "Unhandled exception" -Exception $_
    Write-Host "`n[CRASH] An unexpected error occurred. Details logged to $script:ErrorLogFile" -ForegroundColor Red
    if ($script:musicPlayer) { Stop-AudioSession }
    exit 1
}
# ----------------------------------

$script:ENGINE_VERSION = "v10.0-SYNONYM"
$script:EngineState = @{
    AudioProcess      = $null
    AudioPlaying      = $false
    AudioTrack        = "VOID / MUTED"
    DevMode           = $false
    FloatingBar       = $true
    NarratorData      = $null
    ConversationData  = $null
    SynonymData       = $null
    LastScan          = $null
    ChatHistory       = @()
    FileCatalog       = @{}
    CodeCounter       = 0
    ConversationContext = @{
        topic        = $null
        lastIntent   = $null
        lastQuestion = $null
        userFrustration = 0
        sessionDepth = 0
        followUpCount = 0
    }
    UserProfile = @{
        name        = $null
        preferences = @{}
        interactionCount = 0
    }
}

# =============================================================================
# AUDIO & SPEECH FUNCTIONS
# =============================================================================

function Invoke-SystemSound {
    param(
        [ValidateSet('Beep', 'Success', 'Warning', 'Error', 'Toggle', 'Chat', 'Thinking', 'TaskComplete')]
        [string]$Type
    )
    if ($NoMusic) { return }
    try {
        switch ($Type) {
            'Success' { [Console]::Beep(523, 80); [Console]::Beep(659, 80); [Console]::Beep(784, 100) }
            'Warning' { [Console]::Beep(440, 120); [Console]::Beep(349, 120) }
            'Error'   { [Console]::Beep(150, 200) }
            'Toggle'  { [Console]::Beep(800, 50) }
            'Chat'    { [Console]::Beep(600, 60); Start-Sleep -Milliseconds 50; [Console]::Beep(800, 60) }
            'Thinking' { [Console]::Beep(300, 40); Start-Sleep -Milliseconds 30; [Console]::Beep(400, 40); Start-Sleep -Milliseconds 30; [Console]::Beep(500, 40) }
            'TaskComplete' { [Console]::Beep(523, 80); [Console]::Beep(659, 80); [Console]::Beep(784, 100); Start-Sleep -Milliseconds 100; [Console]::Beep(1047, 150) }
            Default   { [Console]::Beep(600, 60) }
        }
    } catch {}
}

function Invoke-SpeechText {
    param([string]$SpeechText, [int]$Rate = 0)
    if ([string]::IsNullOrWhiteSpace($SpeechText)) { return }
    try {
        $voice = New-Object -ComObject SAPI.SpVoice
        $voice.Volume = 100
        $voice.Rate = $Rate
        [void]$voice.Speak($SpeechText, 0)
        [System.Runtime.InteropServices.Marshal]::ReleaseComObject($voice) | Out-Null
    } catch {}
}

# =============================================================================
# DATA LOADERS
# =============================================================================

function Import-NarratorData {
    $scriptDir = if ($PSScriptRoot) { $PSScriptRoot } else { (Get-Location).Path }
    $dataFile = Join-Path $scriptDir "narrator_data.json"
    if (Test-Path -LiteralPath $dataFile) {
        try {
            $rawJson = Get-Content -LiteralPath $dataFile -Raw -Encoding UTF8
            $script:EngineState.NarratorData = $rawJson | ConvertFrom-Json
            Write-Host "  [NARRATOR] Loaded voice data library." -ForegroundColor Green
        } catch {
            Write-Host "  [NARRATOR ERROR] Failed to parse narrator_data.json: $_" -ForegroundColor Red
            Invoke-SystemSound -Type Error
        }
    } else {
        Write-Host "  [NARRATOR WARNING] narrator_data.json not found." -ForegroundColor Yellow
    }
}

function Import-ConversationData {
    $scriptDir = if ($PSScriptRoot) { $PSScriptRoot } else { (Get-Location).Path }
    $convFile = Join-Path $scriptDir "conversation_commands.json"
    if (Test-Path -LiteralPath $convFile) {
        try {
            Write-Host "  Loading conversation database..." -ForegroundColor DarkGray
            $rawJson = Get-Content -LiteralPath $convFile -Raw -Encoding UTF8
            $script:EngineState.ConversationData = $rawJson | ConvertFrom-Json
            $intentCount = $script:EngineState.ConversationData.intents.PSObject.Properties.Name.Count
            Write-Host "  [CHATBOT] Loaded $intentCount intents." -ForegroundColor Green
        } catch {
            Write-Host "  [CHATBOT ERROR] Failed to parse conversation_commands.json." -ForegroundColor Red
            $script:EngineState.ConversationData = $null
            Invoke-SystemSound -Type Error
        }
    } else {
        Write-Host "  [CHATBOT WARNING] conversation_commands.json not found." -ForegroundColor Yellow
        $script:EngineState.ConversationData = $null
    }
}

function Import-SynonymData {
    $scriptDir = if ($PSScriptRoot) { $PSScriptRoot } else { (Get-Location).Path }
    $synFile = Join-Path $scriptDir "synonyms.json"
    if (Test-Path -LiteralPath $synFile) {
        try {
            Write-Host "  Loading synonym database..." -ForegroundColor DarkGray
            $rawJson = Get-Content -LiteralPath $synFile -Raw -Encoding UTF8
            $script:EngineState.SynonymData = $rawJson | ConvertFrom-Json
            $synCount = $script:EngineState.SynonymData.synonym_map.PSObject.Properties.Name.Count
            Write-Host "  [SYNONYM] Loaded $synCount synonym groups." -ForegroundColor Green
        } catch {
            Write-Host "  [SYNONYM ERROR] Failed to parse synonyms.json." -ForegroundColor Red
            $script:EngineState.SynonymData = $null
            Invoke-SystemSound -Type Error
        }
    } else {
        Write-Host "  [SYNONYM WARNING] synonyms.json not found." -ForegroundColor Yellow
        $script:EngineState.SynonymData = $null
    }
}

# =============================================================================
# VLC AUDIO SUBSYSTEM
# =============================================================================

function Get-VlcPath {
    $possiblePaths = @(
        "C:\Program Files\VideoLAN\VLC\vlc.exe",
        "C:\Program Files (x86)\VideoLAN\VLC\vlc.exe",
        "$env:LOCALAPPDATA\Programs\VideoLAN\VLC\vlc.exe"
    )
    foreach ($path in $possiblePaths) {
        if (Test-Path -LiteralPath $path) { return $path }
    }
    $vlcCmd = Get-Command "vlc.exe" -ErrorAction SilentlyContinue
    if ($vlcCmd) { return $vlcCmd.Source }
    return $null
}

function Start-AudioSession {
    param([string]$FilePath)
    if ($NoMusic) { return }
    if ([string]::IsNullOrWhiteSpace($FilePath)) { return }
    if (-not (Test-Path -LiteralPath $FilePath -PathType Leaf)) {
        Write-Host "  [AUDIO] Asset unmapped: '$FilePath'" -ForegroundColor Yellow
        Start-Sleep -Seconds 1
        return
    }
    $vlcExe = Get-VlcPath
    if ($null -eq $vlcExe) {
        Write-Host "  [AUDIO WARNING] VLC Media Player not found." -ForegroundColor Yellow
        Start-Sleep -Seconds 2
        return
    }
    $resolvedPath = (Resolve-Path -LiteralPath $FilePath).Path
    try {
        $vlcArgs = @("-I", "dummy", "--loop", "--gain=0.65", "--no-video", "`"$resolvedPath`"")
        $procInfo = New-Object System.Diagnostics.ProcessStartInfo
        $procInfo.FileName = $vlcExe
        $procInfo.Arguments = $vlcArgs -join " "
        $procInfo.WindowStyle = [System.Diagnostics.ProcessWindowStyle]::Hidden
        $procInfo.CreateNoWindow = $true
        $procInfo.UseShellExecute = $false
        $process = [System.Diagnostics.Process]::Start($procInfo)
        $script:EngineState.AudioProcess = $process
        $script:EngineState.AudioPlaying = $true
        $script:EngineState.AudioTrack = Split-Path -Leaf $resolvedPath
    } catch {
        Write-Host "  [AUDIO EXCEPTION] VLC failed to start: $_" -ForegroundColor DarkRed
    }
}

function Stop-AudioSession {
    if ($null -ne $script:EngineState.AudioProcess) {
        try {
            if (-not $script:EngineState.AudioProcess.HasExited) {
                $script:EngineState.AudioProcess.Kill()
                $script:EngineState.AudioProcess.Dispose()
            }
        } catch {}
        $script:EngineState.AudioProcess = $null
        $script:EngineState.AudioPlaying = $false
    }
}

# =============================================================================
# UI COMPONENTS
# =============================================================================

function Show-FloatingBar {
    if (-not $script:EngineState.FloatingBar) { return }
    $statusStr = if ($script:EngineState.AudioPlaying) { "♫ [VLC] " + $script:EngineState.AudioTrack } else { "x ACOUSTIC SILENCE" }
    $devStr    = if ($script:EngineState.DevMode) { "DIAG: ACTIVE" } else { "DIAG: STABLE" }
    Write-Host "  ┌──────────────────────────────────────────────────────────────────────────┐" -ForegroundColor DarkGray
    Write-Host ("  │ CODESPACE: {0,-32} │ HUD: {1,-12} │ ENGINE: {2,-5} │" -f $statusStr, $devStr, $script:ENGINE_VERSION) -ForegroundColor Cyan
    Write-Host "  └──────────────────────────────────────────────────────────────────────────┘" -ForegroundColor DarkGray
    Write-Host ""
}

function Show-DevDashboard {
    if (-not $script:EngineState.DevMode) { return }
    $mem = [System.GC]::GetTotalMemory($false) / 1MB
    $proc = [System.Diagnostics.Process]::GetCurrentProcess()
    Write-Host "  ╔══ [ SYSTEM DIAGNOSTICS // Telemetry Core ] ══════════════════════════════╗" -ForegroundColor DarkMagenta
    Write-Host ("  ║  > Shell Architecture : {0,-44} ║" -f ("PowerShell v" + $PSVersionTable.PSVersion)) -ForegroundColor Magenta
    Write-Host ("  ║  > Process ID         : {0,-44} ║" -f $proc.Id) -ForegroundColor Magenta
    Write-Host ("  ║  > Managed Heap Memory: {0,-44} ║" -f ("{0:N2} MB" -f $mem)) -ForegroundColor Magenta
    Write-Host ("  ║  > Physical WorkingSet: {0,-44} ║" -f ("{0:N2} MB" -f ($proc.WorkingSet64 / 1MB))) -ForegroundColor Magenta
    Write-Host "  ╚══════════════════════════════════════════════════════════════════════════╝" -ForegroundColor DarkMagenta
    Write-Host ""
}

# =============================================================================
# SYNONYM REPLACEMENT ENGINE
# =============================================================================

function Invoke-SynonymReplacement {
    param([string]$Text, [float]$ReplaceProbability = 0.15)
    
    if ($null -eq $script:EngineState.SynonymData) { return $Text }
    $synMap = $script:EngineState.SynonymData.synonym_map
    if ($null -eq $synMap) { return $Text }
    
    $words = $Text -split ' '
    $newWords = @()
    foreach ($word in $words) {
        $cleanWord = $word -replace '[^a-zA-Z]', ''
        $punctuation = $word -replace '[a-zA-Z]', ''
        if ($cleanWord.Length -gt 2 -and $synMap.PSObject.Properties.Name -contains $cleanWord) {
            if ((Get-Random -Minimum 0 -Maximum 1) -lt $ReplaceProbability) {
                $synonyms = $synMap.$cleanWord
                if ($synonyms -and $synonyms.Count -gt 0) {
                    $newWord = $synonyms | Get-Random
                    $newWords += $newWord + $punctuation
                    continue
                }
            }
        }
        $newWords += $word
    }
    return $newWords -join ' '
}

# =============================================================================
# NARRATOR FUNCTIONS
# =============================================================================

function Get-FormattedByteSize {
    param([long]$Bytes)
    if ($Bytes -ge 1GB) { return "{0:N2} GB" -f ($Bytes / 1GB) }
    if ($Bytes -ge 1MB) { return "{0:N2} MB" -f ($Bytes / 1MB) }
    if ($Bytes -ge 1KB) { return "{0:N2} KB" -f ($Bytes / 1KB) }
    return "$Bytes B"
}

function New-HumanNarration {
    param([System.IO.FileInfo]$File, [int]$LineCount)
    $ext = $File.Extension.ToLower()
    if ([string]::IsNullOrWhiteSpace($ext)) { $ext = "default" }
    $data = $script:EngineState.NarratorData
    if ($null -eq $data) {
        $script = "Now inspecting $($File.Name). It has $LineCount lines of code and data."
        return @{ Fact = "Every byte is stored securely."; SpeechScript = $script; ExtensionDesc = "Generic file node" }
    }
    $intro = $data.intro_phrases | Get-Random
    $extDesc = if ($data.extension_narratives.PSObject.Properties[$ext]) { $data.extension_narratives.$ext } else { $data.extension_narratives.default }
    $sizeCategory = if ($File.Length -lt 100) { "pico" } elseif ($File.Length -lt 1KB) { "nano" } elseif ($File.Length -lt 10KB) { "micro" } elseif ($File.Length -lt 100KB) { "compact" } elseif ($File.Length -lt 1MB) { "moderate" } elseif ($File.Length -lt 10MB) { "standard" } elseif ($File.Length -lt 100MB) { "heavy" } else { "very_large" }
    $sizeDesc = $data.size_descriptions.$sizeCategory
    $triviaList = if ($data.trivia_database.PSObject.Properties[$ext]) { $data.trivia_database.$ext } else { $data.trivia_database.default }
    $selectedFact = $triviaList | Get-Random
    $outro = $data.outro_phrases | Get-Random

    $baseScript = "$intro This file is named $($File.Name). $extDesc $sizeDesc It contains $LineCount lines in total. $selectedFact $outro"
    
    # Apply synonym replacement for variety
    $variedScript = Invoke-SynonymReplacement -Text $baseScript -ReplaceProbability 0.2

    return @{
        Fact          = $selectedFact
        SpeechScript  = $variedScript
        ExtensionDesc = $extDesc
    }
}

# =============================================================================
# FILE CODE ALLOTMENT SYSTEM
# =============================================================================

function Invoke-FileCodeAllotment {
    param([string]$TargetDirectory, [string]$CatalogPath = "file_catalog.json")
    
    Write-Host ""
    Write-Host "  ╔══════════════════════════════════════════════════════════════════════════╗" -ForegroundColor DarkBlue
    Write-Host "  ║                    ██████  FILE CODE ALLOTMENT  ██████                  ║" -ForegroundColor Cyan
    Write-Host "  ╚══════════════════════════════════════════════════════════════════════════╝" -ForegroundColor DarkBlue
    Write-Host ""
    Write-Host "  Assigning unique codes to every file in the directory..." -ForegroundColor Gray
    Write-Host ""

    $resolvedDirectory = (Resolve-Path -LiteralPath $TargetDirectory).Path.TrimEnd('\', '/')
    $files = Get-ChildItem -LiteralPath $resolvedDirectory -File -Recurse -Force -ErrorAction SilentlyContinue
    
    if ($files.Count -eq 0) {
        Write-Host "  [ERROR] No files found in the directory." -ForegroundColor Red
        Invoke-SystemSound -Type Error
        return
    }

    $catalog = @{}
    if (Test-Path -LiteralPath $CatalogPath) {
        try {
            $json = Get-Content -LiteralPath $CatalogPath -Raw -Encoding UTF8
            $catalog = $json | ConvertFrom-Json
            Write-Host "  [INFO] Loaded existing catalog with $($catalog.PSObject.Properties.Name.Count) entries." -ForegroundColor Green
        } catch {}
    }

    Write-Host "  Processing $($files.Count) files..." -ForegroundColor Gray

    $spinners = @('⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏')
    $extMap = @{}
    $assignedCount = 0
    $updatedCatalog = @{}
    $rootPath = $resolvedDirectory

    foreach ($file in $files) {
        $spinIdx = $assignedCount % $spinners.Length
        Write-Host "`r   [$($spinners[$spinIdx])] Assigning codes to files... ($($assignedCount + 1)/$($files.Count))" -NoNewline -ForegroundColor Cyan

        $relativePath = $file.FullName.Substring($rootPath.Length).TrimStart('\', '/')
        $ext = if ($file.Extension) { $file.Extension.TrimStart('.').ToUpper() } else { "NOEXT" }
        
        $prefix = if ($ext -eq "NOEXT") { "NEX" } elseif ($ext.Length -ge 3) { $ext.Substring(0, 3) } else { $ext.PadRight(3, 'X') }
        
        $hash = Get-FileHash -Path $file.FullName -Algorithm MD5 -ErrorAction SilentlyContinue
        $hashShort = if ($hash) { $hash.Hash.Substring(0, 6) } else { "000000" }
        
        $code = "ECHO-$prefix-$($assignedCount.ToString('D6'))-$hashShort"
        
        $existingCode = $null
        if ($catalog.PSObject.Properties.Name) {
            foreach ($key in $catalog.PSObject.Properties.Name) {
                if ($catalog.$key.path -eq $relativePath) {
                    $existingCode = $key
                    break
                }
            }
        }
        
        if ($existingCode) { $code = $existingCode }
        
        $lineCount = 0
        try {
            $reader = New-Object System.IO.StreamReader($file.FullName, [System.Text.Encoding]::UTF8, $true)
            while ($reader.ReadLine() -ne $null) { $lineCount++ }
            $reader.Close()
        } catch { $lineCount = 0 }
        
        $updatedCatalog[$code] = @{
            path = $relativePath
            filename = $file.Name
            extension = $ext
            size_bytes = $file.Length
            size_human = Get-FormattedByteSize $file.Length
            line_count = $lineCount
            last_modified = $file.LastWriteTime.ToString("yyyy-MM-dd HH:mm:ss")
            hash_md5 = if ($hash) { $hash.Hash } else { "N/A" }
            code = $code
        }
        
        if (-not $extMap.ContainsKey($ext)) { $extMap[$ext] = 0 }
        $extMap[$ext]++
        $assignedCount++
    }

    Write-Host "`r   [✔] Assigned codes to $assignedCount files.                              " -ForegroundColor Green

    $catalogJson = $updatedCatalog | ConvertTo-Json -Depth 10
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($CatalogPath, $catalogJson, $utf8NoBom)

    Write-Host "  [OK] Catalog saved to: $CatalogPath" -ForegroundColor Green
    Write-Host "  [INFO] Total files coded: $assignedCount" -ForegroundColor Cyan
    Write-Host "  [INFO] Extension breakdown:" -ForegroundColor Gray
    foreach ($ext in $extMap.Keys | Sort-Object) {
        Write-Host ("    ├─ {0,-15} : {1,5} files" -f $ext, $extMap[$ext]) -ForegroundColor DarkGray
    }
    
    Invoke-SystemSound -Type TaskComplete
    return $updatedCatalog
}

function Invoke-CodeSearch {
    param([string]$CatalogPath = "file_catalog.json", [string]$SearchTerm)
    
    if (-not (Test-Path -LiteralPath $CatalogPath)) {
        Write-Host "  [ERROR] Catalog not found: $CatalogPath" -ForegroundColor Red
        return
    }
    
    $json = Get-Content -LiteralPath $CatalogPath -Raw -Encoding UTF8
    $catalog = $json | ConvertFrom-Json
    
    Write-Host ""
    Write-Host "  ── [ CODE SEARCH RESULTS ] ───────────────────────────────────────────────" -ForegroundColor Cyan
    
    $found = 0
    foreach ($key in $catalog.PSObject.Properties.Name) {
        $entry = $catalog.$key
        if ($key -match $SearchTerm -or $entry.path -match $SearchTerm -or $entry.filename -match $SearchTerm) {
            Write-Host ("  CODE: {0}" -f $key) -ForegroundColor Yellow
            Write-Host ("    PATH: {0}" -f $entry.path) -ForegroundColor Gray
            Write-Host ("    SIZE: {0}  |  LINES: {1}" -f $entry.size_human, $entry.line_count) -ForegroundColor DarkCyan
            Write-Host ""
            $found++
        }
    }
    
    if ($found -eq 0) {
        Write-Host "  No entries found matching: $SearchTerm" -ForegroundColor Yellow
    } else {
        Write-Host "  Found $found entries." -ForegroundColor Green
    }
}

function Invoke-CatalogReport {
    param([string]$CatalogPath = "file_catalog.json")
    
    if (-not (Test-Path -LiteralPath $CatalogPath)) {
        Write-Host "  [ERROR] Catalog not found: $CatalogPath" -ForegroundColor Red
        return
    }
    
    $json = Get-Content -LiteralPath $CatalogPath -Raw -Encoding UTF8
    $catalog = $json | ConvertFrom-Json
    
    $totalFiles = $catalog.PSObject.Properties.Name.Count
    $totalSize = 0
    $totalLines = 0
    $extStats = @{}
    
    foreach ($key in $catalog.PSObject.Properties.Name) {
        $entry = $catalog.$key
        $totalSize += $entry.size_bytes
        $totalLines += $entry.line_count
        $ext = $entry.extension
        if (-not $extStats.ContainsKey($ext)) { $extStats[$ext] = 0 }
        $extStats[$ext]++
    }
    
    Write-Host ""
    Write-Host "  ╔══════════════════════════════════════════════════════════════════════════╗" -ForegroundColor DarkBlue
    Write-Host "  ║                          FILE CATALOG REPORT                             ║" -ForegroundColor Cyan
    Write-Host "  ╚══════════════════════════════════════════════════════════════════════════╝" -ForegroundColor DarkBlue
    Write-Host ""
    Write-Host ("  • Total Files : {0,8:N0}" -f $totalFiles) -ForegroundColor White
    Write-Host ("  • Total Size   : {0,8}" -f (Get-FormattedByteSize $totalSize)) -ForegroundColor White
    Write-Host ("  • Total Lines  : {0,8:N0}" -f $totalLines) -ForegroundColor White
    Write-Host ""
    Write-Host "  ── [ EXTENSION BREAKDOWN ] ───────────────────────────────────────────────" -ForegroundColor DarkBlue
    foreach ($ext in $extStats.Keys | Sort-Object) {
        Write-Host ("    ├─ {0,-15} : {1,5} files" -f $ext, $extStats[$ext]) -ForegroundColor Gray
    }
    Write-Host ""
}

# =============================================================================
# SYSTEM ANALYTICS ENGINE
# =============================================================================

function Invoke-SystemScanEngine {
    param([string]$TargetDirectory)
    $resolvedDirectory = (Resolve-Path -LiteralPath $TargetDirectory).Path.TrimEnd('\', '/')
    $stats = [PSCustomObject]@{ TotalFolders = 0; EmptyFolders = 0; TotalFiles = 0; EmptyFiles = 0; ActiveFiles = 0; TotalLines = 0; ScanDuration = 0.0; TopExtensions = @{}; LargestFile = $null }
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    $spinners = @('⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏')
    $spinIdx = 0
    Write-Host "   [$($spinners[$spinIdx])] Traversing directory tree & indexing nodes..." -NoNewline -ForegroundColor Cyan
    $allItems = Get-ChildItem -LiteralPath $resolvedDirectory -Recurse -Force -ErrorAction SilentlyContinue
    $dirs = [System.Collections.Generic.List[System.IO.DirectoryInfo]]::new()
    $files = [System.Collections.Generic.List[System.IO.FileInfo]]::new()
    $parentNodes = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
    foreach ($item in $allItems) {
        if ($item.PSIsContainer) { $dirs.Add($item); if ($null -ne $item.Parent) { [void]$parentNodes.Add($item.Parent.FullName) } }
        else { $files.Add($item); [void]$parentNodes.Add($item.DirectoryName) }
    }
    $stats.TotalFolders = $dirs.Count
    foreach ($d in $dirs) { if (-not $parentNodes.Contains($d.FullName)) { $stats.EmptyFolders++ } }
    $stats.TotalFiles = $files.Count
    $extTracker = @{}
    $largestSize = -1
    $currentFileIdx = 0
    foreach ($f in $files) {
        $currentFileIdx++
        if ($currentFileIdx % 25 -eq 0) {
            $spinIdx = ($spinIdx + 1) % $spinners.Length
            Write-Host "`r   [$($spinners[$spinIdx])] Analyzing files ($currentFileIdx / $($files.Count))..." -NoNewline -ForegroundColor Cyan
        }
        $ext = if ($f.Extension) { $f.Extension.ToLower() } else { "[no extension]" }
        if (-not $extTracker.ContainsKey($ext)) { $extTracker[$ext] = 0 }
        $extTracker[$ext]++
        if ($f.Length -gt $largestSize) { $largestSize = $f.Length; $stats.LargestFile = $f }
        if ($f.Length -eq 0) { $stats.EmptyFiles++; continue }
        $stats.ActiveFiles++
        $lineCount = 0
        try {
            $stream = [System.IO.StreamReader]::new($f.FullName, [System.Text.Encoding]::UTF8, $true)
            while ($null -ne $stream.ReadLine()) { $lineCount++ }
            $stream.Dispose()
        } catch { $lineCount = 0 }
        $stats.TotalLines += $lineCount
    }
    $sw.Stop()
    Write-Host "`r   [✔] Scan completed successfully in $($sw.Elapsed.TotalSeconds.ToString('N2'))s               " -ForegroundColor Green
    $stats.ScanDuration = $sw.Elapsed.TotalSeconds
    $stats.TopExtensions = $extTracker
    $script:EngineState.LastScan = $stats
    return $stats
}

# =============================================================================
# RANDOM FILE SPEECH
# =============================================================================

function Invoke-RandomFileSpeech {
    param([string]$TargetDirectory)
    $spinners = @('⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏')
    for ($i = 0; $i -lt 5; $i++) {
        Write-Host "`r   [$($spinners[$i % $spinners.Length])] Querying file clusters & selecting random node..." -NoNewline -ForegroundColor Magenta
        Start-Sleep -Milliseconds 60
    }
    $rawFiles = Get-ChildItem -LiteralPath $TargetDirectory -File -Recurse -Force -ErrorAction SilentlyContinue
    $allFiles = @($rawFiles | Where-Object { $_ -ne $null })
    if ($allFiles.Count -eq 0) {
        Write-Host "`r   [!] Target directory contains no readable files.                           " -ForegroundColor Yellow
        Invoke-SystemSound -Type Warning
        return
    }
    $randomFile = $allFiles | Get-Random
    $rootPath = (Resolve-Path -LiteralPath $TargetDirectory).Path.TrimEnd('\', '/')
    $relativePath = $randomFile.FullName.Substring($rootPath.Length).TrimStart('\', '/')
    $rawLines = @()
    try { $content = Get-Content -LiteralPath $randomFile.FullName -ErrorAction Stop; $rawLines = @($content) }
    catch {
        Write-Host "`r   [ERROR] Unable to read file stream: $_                          " -ForegroundColor Red
        Invoke-SystemSound -Type Error; return
    }
    $totalLineCount = $rawLines.Count
    $formattedSize = Get-FormattedByteSize $randomFile.Length
    $narration = New-HumanNarration -File $randomFile -LineCount $totalLineCount
    Write-Host "`r   [✔] Node isolated successfully: $($randomFile.Name)                  " -ForegroundColor Green
    Write-Host ""
    Write-Host "  ┌─ [ TARGET FILE METRICS ] ───────────────────────────────────────────────┐" -ForegroundColor DarkBlue
    Write-Host ("  │ Target File Node     ==> {0,-46} │" -f $randomFile.Name) -ForegroundColor Cyan
    Write-Host ("  │ Relative Path        ==> {0,-46} │" -f ($relativePath | Select-Object -First 46)) -ForegroundColor Gray
    Write-Host ("  │ Extension Class      ==> {0,-46} │" -f $narration.ExtensionDesc) -ForegroundColor Yellow
    Write-Host ("  │ File Size            ==> {0,-46} │" -f $formattedSize) -ForegroundColor DarkCyan
    Write-Host ("  │ Total Lines          ==> {0,-46} │" -f $totalLineCount) -ForegroundColor White
    Write-Host "  └─────────────────────────────────────────────────────────────────────────┘" -ForegroundColor DarkBlue
    Write-Host ""
    Write-Host "  ── [ CODE PREVIEW ] ──────────────────────────────────────────────────" -ForegroundColor DarkBlue
    $previewLines = $rawLines | Select-Object -First 12
    foreach ($line in $previewLines) {
        $trimmed = if ($line -and $line.Length -gt 70) { $line.Substring(0, 67) + "..." } else { $line }
        Write-Host "    │ " -ForegroundColor DarkBlue -NoNewline
        Write-Host $trimmed -ForegroundColor Gray
        [System.Threading.Thread]::Sleep(10)
    }
    Write-Host ""
    Write-Host "  ── [ HUMAN-LIKE NARRATOR OUTPUT ] ────────────────────────────────────" -ForegroundColor DarkMagenta
    Write-Host ("  * SCRIPT : {0}" -f $narration.SpeechScript) -ForegroundColor Magenta
    Write-Host ""
    Invoke-SystemSound -Type Success
    Write-Host "  [VOICE SYNTH] Narrator speaking..." -ForegroundColor Cyan
    Invoke-SpeechText -SpeechText $narration.SpeechScript
}

# =============================================================================
# CHATBOT ENGINE (condensed but complete)
# =============================================================================

function Invoke-SentimentAnalysis {
    param([string]$Text)
    $positiveWords = @('thanks', 'thank', 'great', 'awesome', 'good', 'nice', 'wonderful', 'excellent', 'love', 'happy', 'enjoy', 'amazing', 'perfect', 'fantastic', 'brilliant', 'glad', 'appreciate')
    $negativeWords = @('bad', 'terrible', 'awful', 'hate', 'dislike', 'annoy', 'frustrating', 'useless', 'broken', 'fail', 'error', 'bug', 'crash', 'stupid', 'worst', 'horrible', 'sad', 'angry')
    $curiousWords = @('why', 'how', 'what', 'when', 'where', 'who', 'which', 'explain', 'tell', 'show', 'understand', 'curious', 'wonder', 'question')
    $words = $Text.ToLower() -split ' ' | Where-Object { $_.Length -gt 2 }
    $posScore = 0; $negScore = 0; $curScore = 0
    foreach ($w in $words) {
        if ($positiveWords -contains $w) { $posScore++ }
        if ($negativeWords -contains $w) { $negScore++ }
        if ($curiousWords -contains $w) { $curScore++ }
    }
    if ($posScore -gt $negScore -and $posScore -gt 0) { return "positive" }
    if ($negScore -gt $posScore -and $negScore -gt 0) { return "negative" }
    if ($curScore -gt 2) { return "curious" }
    return "neutral"
}

function Test-FollowUp {
    param([string]$Text)
    $followUpPatterns = @("tell me more", "explain more", "continue", "go on", "and then", "what else", "more about", "elaborate", "further", "next", "after that", "what happened", "then what", "so what", "why is that", "how so", "interesting", "hmm", "i see", "okay", "right", "got it", "makes sense", "understood")
    $lower = $Text.ToLower()
    foreach ($pattern in $followUpPatterns) {
        if ($lower -match $pattern) { return $true }
    }
    return $false
}

function Detect-UserName {
    param([string]$Text)
    $patterns = @("my name is (\w+)", "i am (\w+)", "call me (\w+)", "i'm (\w+)")
    foreach ($pattern in $patterns) {
        if ($Text -match $pattern) { return $matches[1] }
    }
    return $null
}

function New-FallbackResponse {
    param([string]$Sentiment)
    $fallbacks = @{
        "positive" = @("I'm glad you're enjoying the conversation!", "That's great to hear!", "Wonderful! What else would you like to discuss?")
        "negative" = @("I sense some frustration. Let me try to help more clearly.", "I apologize if I'm not being clear enough.", "I want to help. Can you tell me more?")
        "curious" = @("That's a great question! Let me think about it.", "I love your curiosity!", "Excellent question! Here's what I know.")
        "default" = @("That's an interesting topic. Can you tell me more?", "I want to understand better. Could you explain?", "Hmm, that's a complex question.")
    }
    $list = if ($fallbacks.ContainsKey($Sentiment)) { $fallbacks[$Sentiment] } else { $fallbacks["default"] }
    return $list | Get-Random
}

function Invoke-Chatbot {
    Write-Host ""
    Write-Host "  ╔══════════════════════════════════════════════════════════════════════════╗" -ForegroundColor DarkBlue
    Write-Host "  ║          ██████  ADVANCED AI CHATBOT  ██████                            ║" -ForegroundColor Cyan
    Write-Host "  ║          Echo Engine v10.0 — with Context, Memory & Personality         ║" -ForegroundColor Gray
    Write-Host "  ╚══════════════════════════════════════════════════════════════════════════╝" -ForegroundColor DarkBlue
    Write-Host ""
    Write-Host "  I'm your AI assistant with contextual memory and personality!" -ForegroundColor Green
    Write-Host "  Commands: 'exit' or 'quit' to return, 'clear' to clear history, 'help' for info" -ForegroundColor Gray
    Write-Host "  You can also ask me about the file catalog and codes!" -ForegroundColor Gray
    Write-Host ""

    $convData = $script:EngineState.ConversationData
    if ($null -eq $convData) {
        Write-Host "  [CHATBOT ERROR] Conversation database not loaded." -ForegroundColor Red
        Invoke-SystemSound -Type Error
        Start-Sleep -Seconds 3
        return
    }

    $intents = $convData.intents
    $chatActive = $true
    $script:EngineState.ChatHistory = @()
    $ctx = $script:EngineState.ConversationContext

    while ($chatActive) {
        if ($script:EngineState.ChatHistory.Count -gt 0) {
            Write-Host "  ─── [Conversation History] ─────────────────────────────────────────────" -ForegroundColor DarkGray
            $startIdx = [Math]::Max(0, $script:EngineState.ChatHistory.Count - 10)
            for ($i = $startIdx; $i -lt $script:EngineState.ChatHistory.Count; $i++) {
                $entry = $script:EngineState.ChatHistory[$i]
                $prefixStr = if ($entry.type -eq "user") { "  You: " } else { "  Bot: " }
                $color = if ($entry.type -eq "user") { "Cyan" } else { "Magenta" }
                Write-Host $prefixStr -NoNewline -ForegroundColor $color
                Write-Host $entry.message -ForegroundColor Gray
            }
            Write-Host ""
        }

        Write-Host "  You: " -NoNewline -ForegroundColor Cyan
        $userInput = Read-Host
        $userInput = $userInput.Trim()

        if ($userInput -eq "" -or $userInput -eq "exit" -or $userInput -eq "quit") {
            $chatActive = $false
            Write-Host "  [CHATBOT] Session ended." -ForegroundColor Gray
            Invoke-SystemSound -Type Beep
            break
        }

        if ($userInput -eq "clear") {
            $script:EngineState.ChatHistory = @()
            $ctx.topic = $null; $ctx.lastIntent = $null; $ctx.lastQuestion = $null
            $ctx.followUpCount = 0; $ctx.userFrustration = 0; $ctx.sessionDepth = 0
            Clear-Host; Show-FloatingBar
            Write-Host "  [CHATBOT] Chat history and context cleared." -ForegroundColor Gray
            continue
        }

        if ($userInput -eq "help") {
            Write-Host ""
            Write-Host "  ─── [CHATBOT HELP] ─────────────────────────────────────────────────────" -ForegroundColor Cyan
            Write-Host "  I can talk about:"
            Write-Host "    • Myself (who I am, what I do)"
            Write-Host "    • File operations (scan, analyze, read files)"
            Write-Host "    • System status (memory, CPU, uptime)"
            Write-Host "    • File codes and catalog (ask about codes)"
            Write-Host "    • Technology (programming, AI, data)"
            Write-Host "    • Commands: exit, clear, help"
            Write-Host ""
            Invoke-SystemSound -Type Chat
            continue
        }

        $detectedName = Detect-UserName -Text $userInput
        if ($detectedName) {
            $script:EngineState.UserProfile.name = $detectedName
            Write-Host "  [CHATBOT] Name recognized: $detectedName" -ForegroundColor Green
        }

        $script:EngineState.ChatHistory += @{ type = "user"; message = $userInput }
        $script:EngineState.UserProfile.interactionCount++
        $ctx.sessionDepth++
        $sentiment = Invoke-SentimentAnalysis -Text $userInput
        if ($sentiment -eq "negative") { $ctx.userFrustration++ }
        $isFollowUp = Test-FollowUp -Text $userInput
        if ($isFollowUp) { $ctx.followUpCount++ }

        $matchedIntent = $null; $bestScore = 0
        foreach ($intentName in $intents.PSObject.Properties.Name) {
            $intent = $intents.$intentName
            foreach ($pattern in $intent.patterns) {
                $patternWords = $pattern -split " " | Where-Object { $_.Length -gt 2 }
                $matches = 0; $exactMatches = 0
                foreach ($pw in $patternWords) {
                    $pwLower = $pw.ToLower()
                    if ($userInput.ToLower() -match $pwLower) {
                        $matches++
                        if ($userInput.ToLower() -match "\b$pwLower\b") { $exactMatches++ }
                    }
                }
                $score = if ($patternWords.Count -gt 0) { ($matches / $patternWords.Count) * 0.6 + ($exactMatches / $patternWords.Count) * 0.4 } else { 0 }
                if ($isFollowUp -and $intentName -eq $ctx.lastIntent) { $score += 0.3 }
                if ($score -gt $bestScore) { $bestScore = $score; $matchedIntent = $intent }
            }
        }

        $response = ""
        if ($null -ne $matchedIntent -and $bestScore -gt 0.15) {
            $responses = $matchedIntent.responses
            if ($responses -and $responses.Count -gt 0) {
                $response = $responses | Get-Random
                $ctx.lastIntent = $matchedIntent.PSObject.Properties.Name[0]
                if ($sentiment -eq "positive") { $response = "I'm glad you asked! " + $response }
                elseif ($sentiment -eq "negative") { $response = "I understand your concern. " + $response }
                elseif ($sentiment -eq "curious") { $response = "Great question! " + $response }
            } else { $response = New-FallbackResponse -Sentiment $sentiment }
        } else {
            if ($ctx.userFrustration -gt 3) {
                $response = "I apologize for the confusion. What specifically would you like to know about?"
                $ctx.userFrustration = 0
            } elseif ($ctx.followUpCount -gt 2 -and $ctx.lastQuestion) {
                $response = "You seem really interested in this topic! Let me dive deeper. " + $ctx.lastQuestion
                $ctx.followUpCount = 0
            } else {
                $response = New-FallbackResponse -Sentiment $sentiment
            }
            if ($userInput -match "can you|will you|could you") { $response += " Of course! I'm here to help." }
        }

        if ($ctx.userFrustration -gt 2) {
            $response = "I want to make sure I'm helping. " + $response + " Would you like me to explain something differently?"
            $ctx.userFrustration = 0
        }

        if ($script:EngineState.UserProfile.name) {
            $name = $script:EngineState.UserProfile.name
            if (-not $response.StartsWith("I")) { $response = "$name, " + $response }
        }

        if ($userInput -match "what is|how do|why does|can you|tell me") {
            $ctx.lastQuestion = $userInput
        }

        Invoke-SystemSound -Type Thinking
        Write-Host "  Bot: " -NoNewline -ForegroundColor Magenta
        $thinkingChars = @('●', '○', '●', '○', '●')
        foreach ($t in $thinkingChars) {
            Write-Host $t -NoNewline -ForegroundColor DarkMagenta
            Start-Sleep -Milliseconds 60
            Write-Host "`b" -NoNewline
        }
        Start-Sleep -Milliseconds 100
        Write-Host "  " -NoNewline

        $emotionIcon = switch ($sentiment) { "positive" { "😊" } "negative" { "😟" } "curious" { "🤔" } default { "💬" } }
        Write-Host $emotionIcon -NoNewline -ForegroundColor Yellow
        Write-Host " " -NoNewline
        Write-Host $response -ForegroundColor White

        Invoke-SystemSound -Type Chat
        try { Invoke-SpeechText -SpeechText $response } catch {}

        $script:EngineState.ChatHistory += @{ type = "bot"; message = $response }
        if ($ctx.sessionDepth -gt 20) { $ctx.sessionDepth = 0; $ctx.followUpCount = 0 }
        Write-Host ""
        Start-Sleep -Milliseconds 200
    }
}

# =============================================================================
# MAIN CONTROL LOOP
# =============================================================================

try {
    Import-NarratorData
    Import-ConversationData
    Import-SynonymData

    $scriptDir = if ($PSScriptRoot) { $PSScriptRoot } else { (Get-Location).Path }
    $audioFile = if ($Music) { $Music } else { Join-Path $scriptDir "bgmusic.mp3" }
    Start-AudioSession -FilePath $audioFile

    $running = $true
    while ($running) {
        Clear-Host
        Write-Host ""
        Write-Host "  ╔══════════════════════════════════════════════════════════════════════════╗" -ForegroundColor DarkBlue
        Write-Host "  ║          INTERSTELLAR QUANTUM ANALYTICS COMMAND CENTER v10.0 SYNONYM      ║" -ForegroundColor Cyan
        Write-Host "  ║          Echo Engine — File Code Allotment & Synonym Narration           ║" -ForegroundColor Gray
        Write-Host "  ╚══════════════════════════════════════════════════════════════════════════╝" -ForegroundColor DarkBlue
        Write-Host ""

        Show-FloatingBar
        Show-DevDashboard

        Write-Host "   [1] Engage System Analytics Engine" -ForegroundColor Cyan
        Write-Host "   [2] Toggle Diagnostics HUD" -ForegroundColor White
        Write-Host "   [3] Toggle Status Telemetry Bar" -ForegroundColor White
        Write-Host "   [4] Inspect & Narrate Random File (with Synonyms)" -ForegroundColor Magenta
        Write-Host "   [5] Change Target Directory Path" -ForegroundColor White
        Write-Host "   [6] 🤖 AI Chatbot Interface" -ForegroundColor Green
        Write-Host "   [7] 📋 File Code Allotment (Assign Unique Codes)" -ForegroundColor Yellow
        Write-Host "   [8] 🔍 Search File Catalog by Code/Name" -ForegroundColor Yellow
        Write-Host "   [9] 📊 Generate File Catalog Report" -ForegroundColor Yellow
        Write-Host "   [10] Exit Engine" -ForegroundColor DarkRed
        Write-Host ""
        Write-Host "   Active Target Path: " -NoNewline -ForegroundColor Gray
        Write-Host $Path -ForegroundColor Cyan
        Write-Host ""

        $choice = Read-Host "   Command Input [1-10]"

        switch ($choice) {
            '1' {
                Invoke-SystemSound -Type Beep
                Clear-Host
                Show-FloatingBar
                Write-Host "  [+] Executing directory tree analysis..." -ForegroundColor Cyan
                $scanStats = Invoke-SystemScanEngine -TargetDirectory $Path
                Clear-Host
                Show-FloatingBar
                Write-Host "  ╔══════════════════════════════════════════════════════════════════════════╗" -ForegroundColor DarkBlue
                Write-Host "  ║                      ANALYTICS TELEMETRY METRICS                         ║" -ForegroundColor Cyan
                Write-Host "  ╚══════════════════════════════════════════════════════════════════════════╝" -ForegroundColor DarkBlue
                Write-Host ""
                Write-Host ("   • Total Folders Scanned : {0:N0}" -f $scanStats.TotalFolders) -ForegroundColor White
                Write-Host ("   • Empty Directories     : {0:N0}" -f $scanStats.EmptyFolders) -ForegroundColor DarkGray
                Write-Host ("   • Total Files Scanned   : {0:N0}" -f $scanStats.TotalFiles) -ForegroundColor White
                Write-Host ("   • Active Files (Non-0)  : {0:N0}" -f $scanStats.ActiveFiles) -ForegroundColor DarkCyan
                Write-Host ("   • Total Lines Analyzed  : {0:N0}" -f $scanStats.TotalLines) -ForegroundColor Magenta
                Write-Host ("   • Analytics Duration    : {0:N2}s" -f $scanStats.ScanDuration) -ForegroundColor Green
                if ($null -ne $scanStats.LargestFile) {
                    Write-Host ("   • Largest Node Detected : {0} ({1})" -f $scanStats.LargestFile.Name, (Get-FormattedByteSize $scanStats.LargestFile.Length)) -ForegroundColor Yellow
                }
                Write-Host ""
                Write-Host "   ── [ FILE TYPE DISTRIBUTION ] ───────────────────────────────" -ForegroundColor DarkBlue
                $topExts = $scanStats.TopExtensions.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First 5
                foreach ($ext in $topExts) {
                    Write-Host ("     ├─ {0,-15} : {1,5} file(s)" -f $ext.Key, $ext.Value) -ForegroundColor Gray
                }
                Invoke-SystemSound -Type Success
                Write-Host ""
                Write-Host "   Press ENTER to return to dashboard..." -ForegroundColor Cyan
                [void](Read-Host)
            }
            '2' { $script:EngineState.DevMode = -not $script:EngineState.DevMode; Invoke-SystemSound -Type Toggle }
            '3' { $script:EngineState.FloatingBar = -not $script:EngineState.FloatingBar; Invoke-SystemSound -Type Toggle }
            '4' {
                Invoke-RandomFileSpeech -TargetDirectory $Path
                Write-Host ""
                Write-Host "   Press ENTER to return to dashboard..." -ForegroundColor Cyan
                [void](Read-Host)
            }
            '5' {
                Write-Host ""
                $newPath = Read-Host "   Enter new path"
                if (Test-Path -LiteralPath $newPath -PathType Container) {
                    $Path = $newPath
                    Invoke-SystemSound -Type Success
                } else {
                    Write-Host "   [ERROR] Path does not exist." -ForegroundColor Red
                    Invoke-SystemSound -Type Error
                    Start-Sleep -Seconds 2
                }
            }
            '6' {
                Clear-Host
                Show-FloatingBar
                Invoke-Chatbot
                Clear-Host
            }
            '7' {
                Clear-Host
                Show-FloatingBar
                $catalog = Invoke-FileCodeAllotment -TargetDirectory $Path -CatalogPath "file_catalog.json"
                Write-Host ""
                Write-Host "   Press ENTER to return to dashboard..." -ForegroundColor Cyan
                [void](Read-Host)
            }
            '8' {
                Write-Host ""
                $searchTerm = Read-Host "   Enter code or filename to search"
                Invoke-CodeSearch -CatalogPath "file_catalog.json" -SearchTerm $searchTerm
                Write-Host ""
                Write-Host "   Press ENTER to return to dashboard..." -ForegroundColor Cyan
                [void](Read-Host)
            }
            '9' {
                Clear-Host
                Show-FloatingBar
                Invoke-CatalogReport -CatalogPath "file_catalog.json"
                Write-Host ""
                Write-Host "   Press ENTER to return to dashboard..." -ForegroundColor Cyan
                [void](Read-Host)
            }
            '10' { $running = $false }
            Default { 
                Invoke-SystemSound -Type Warning
                Write-Host "  [WARNING] Invalid option. Please choose 1-10." -ForegroundColor Yellow
                Start-Sleep -Seconds 1
            }
        }
    }
} catch {
    Write-CrashLog -Message "Fatal error in main loop" -Exception $_
    Write-Host ""
    Write-Host "  [ENGINE FATAL EXCEPTION] :: $_" -ForegroundColor Red
    Invoke-SystemSound -Type Error
} finally {
    Stop-AudioSession
    Write-Host ""
    Write-Host "  Session terminated safely." -ForegroundColor White
}