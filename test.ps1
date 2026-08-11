<#
.SYNOPSIS
    Enterprise System & Directory Analytics Engine (VRAM EDITION) – with Folder Tree
.DESCRIPTION
    Full system with Virtual RAM File System, background loading, and folder tree viewer.
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
    [int]$MaxDisplayRows = 50,

    [switch]$NoInteractive
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

$script:ENGINE_VERSION = "v10.0-VRAM-BGLOAD-TREE"
$script:EngineState = @{
    AudioProcess      = $null
    AudioPlaying      = $false
    AudioTrack        = "VOID / MUTED"
    DevMode           = $false
    FloatingBar       = $true
    NarratorData      = $null
    ConversationData  = $null
    SynonymData       = $null
    VRAMFile          = $null
    VRAMConvFile      = $null
    VRAMConvIsArray   = $false
    VRAMConvMonolithicCache = $null
    VRAMSynonymFile   = $null
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
    RuntimePaths      = @{}
    # Background load status
    LoadJob          = $null
    LoadComplete     = $false
    LoadError        = $null
}

function Initialize-EngineWorkspace {
    param([string]$RootPath)

    $scriptDir = if ($PSScriptRoot) { $PSScriptRoot } else { $RootPath }
    $cacheRoot = Join-Path $scriptDir ".engine_cache"
    $virtualRamRoot = Join-Path $cacheRoot "virtualram"
    $memoryRoot = Join-Path $cacheRoot "memory"
    $reportsRoot = Join-Path $scriptDir "reports"
    $projectReportsRoot = Join-Path $reportsRoot "project_reports"
    $folderTreeRoot = Join-Path $reportsRoot "folder_trees"
    $diagnosticsRoot = Join-Path $reportsRoot "diagnostics"

    foreach ($path in @($cacheRoot, $virtualRamRoot, $memoryRoot, $reportsRoot, $projectReportsRoot, $folderTreeRoot, $diagnosticsRoot)) {
        New-Item -ItemType Directory -Path $path -Force | Out-Null
    }

    $script:EngineState.RuntimePaths = [ordered]@{
        RootPath = $scriptDir
        CacheRoot = $cacheRoot
        VirtualRamRoot = $virtualRamRoot
        MemoryRoot = $memoryRoot
        ReportsRoot = $reportsRoot
        ProjectReportsRoot = $projectReportsRoot
        FolderTreeRoot = $folderTreeRoot
        DiagnosticsRoot = $diagnosticsRoot
    }

    return $script:EngineState.RuntimePaths
}

function Get-FileFingerprint {
    param([string]$InputPath)
    if (-not (Test-Path -LiteralPath $InputPath)) { return $null }
    $item = Get-Item -LiteralPath $InputPath
    $hash = Get-FileHash -LiteralPath $InputPath -Algorithm SHA256 -ErrorAction SilentlyContinue
    return [pscustomobject]@{
        Path = $InputPath
        SizeBytes = $item.Length
        LastWriteTimeUtc = $item.LastWriteTimeUtc.ToString('o')
        Hash = if ($hash) { $hash.Hash } else { '00000000000000000000000000000000' }
    }
}

function Read-JsonFileSafe {
    param([string]$Path)
    if (-not (Test-Path -LiteralPath $Path)) { return $null }
    try {
        $text = Get-Content -LiteralPath $Path -Raw -Encoding UTF8
        return $text | ConvertFrom-Json
    } catch {
        return $null
    }
}

function Save-JsonFileSafe {
    param([string]$Path, [object]$Payload)
    $parent = Split-Path -Parent $Path
    if ($parent) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    $json = $Payload | ConvertTo-Json -Depth 15
    [System.IO.File]::WriteAllText($Path, $json, $utf8NoBom)
}

function Write-WorkspaceReport {
    param([string]$FileName, [string]$Content)
    $targetDir = if ($script:EngineState.RuntimePaths.ProjectReportsRoot) { $script:EngineState.RuntimePaths.ProjectReportsRoot } else { Join-Path $PSScriptRoot 'reports/project_reports' }
    New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
    $targetPath = Join-Path $targetDir $FileName
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($targetPath, $Content, $utf8NoBom)
    return $targetPath
}

function Write-MemorySnapshot {
    $proc = [System.Diagnostics.Process]::GetCurrentProcess()
    $snapshot = [ordered]@{
        timestampUtc = (Get-Date).ToUniversalTime().ToString('o')
        processId = $proc.Id
        managedHeapMb = [math]::Round([System.GC]::GetTotalMemory($false) / 1MB, 2)
        workingSetMb = [math]::Round($proc.WorkingSet64 / 1MB, 2)
        privateMemoryMb = [math]::Round($proc.PrivateMemorySize64 / 1MB, 2)
    }
    $memoryPath = Join-Path $script:EngineState.RuntimePaths.MemoryRoot ("memory_snapshot_{0}.json" -f (Get-Date -Format 'yyyyMMdd_HHmmss'))
    Save-JsonFileSafe -Path $memoryPath -Payload $snapshot | Out-Null
    return $snapshot
}

function Write-CacheManifest {
    $manifestPath = Join-Path $script:EngineState.RuntimePaths.CacheRoot 'manifest.json'
    $manifest = [ordered]@{
        generatedAtUtc = (Get-Date).ToUniversalTime().ToString('o')
        rootPath = $script:EngineState.RuntimePaths.RootPath
        cacheFiles = @(
            'conversation_index.json',
            'synonyms_index.json'
        )
        memorySnapshots = @(Get-ChildItem -LiteralPath $script:EngineState.RuntimePaths.MemoryRoot -File -Filter 'memory_snapshot_*.json' -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Name)
        projectReports = @(Get-ChildItem -LiteralPath $script:EngineState.RuntimePaths.ProjectReportsRoot -File -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Name)
    }
    Save-JsonFileSafe -Path $manifestPath -Payload $manifest | Out-Null
    return $manifestPath
}

function Convert-ConversationToCompactIndex {
    param([object]$ConversationData)
    if (-not $ConversationData -or -not $ConversationData.intents) { return [pscustomobject]@{ intents = [ordered]@{}; meta = [ordered]@{ loaded_via = 'compact' } } }

    $intentEntries = [ordered]@{}
    foreach ($intentName in $ConversationData.intents.PSObject.Properties.Name) {
        $intent = $ConversationData.intents.$intentName
        $intentEntries[$intentName] = [pscustomobject]@{
            name = $intentName
            patterns = @($intent.patterns)
            responses = @($intent.responses)
        }
    }

    return [pscustomobject]@{
        intents = [pscustomobject]$intentEntries
        meta = [ordered]@{
            version = '1.1'
            loaded_via = 'compact-index'
            total_intents = $intentEntries.Count
        }
    }
}

function Convert-ConversationTextToCompactIndex {
    param([string]$RawText, [string]$FilePath)

    $trimmed = if ($null -ne $RawText) { $RawText.Trim() } else { '' }
    if ([string]::IsNullOrWhiteSpace($trimmed) -and [string]::IsNullOrWhiteSpace($FilePath)) {
        return [pscustomobject]@{ intents = [ordered]@{}; meta = [ordered]@{ loaded_via = 'text-fallback' } }
    }

    $reader = $null
    try {
        if (-not [string]::IsNullOrWhiteSpace($FilePath) -and (Test-Path -LiteralPath $FilePath)) {
            $reader = [System.IO.File]::OpenText($FilePath)
        } elseif (-not [string]::IsNullOrWhiteSpace($trimmed)) {
            $reader = New-Object System.IO.StringReader($trimmed)
        } else {
            return [pscustomobject]@{ intents = [ordered]@{}; meta = [ordered]@{ loaded_via = 'text-fallback' } }
        }

        $intents = [ordered]@{}
        $inIntentsBlock = $false
        $braceBalance = 0
        $intentPattern = '^\s*"([^"]+)"\s*:\s*\{'

        while ($null -ne ($line = $reader.ReadLine())) {
            if (-not $inIntentsBlock) {
                if ($line -match '"intents"\s*:\s*\{') {
                    $inIntentsBlock = $true
                    $braceBalance = 1
                }
                continue
            }

            $openBraces = ([regex]::Matches($line, '\{')).Count
            $closeBraces = ([regex]::Matches($line, '\}')).Count

            if ($line -match $intentPattern) {
                $intentName = $matches[1]
                if ($intentName -ne 'meta' -and $intentName -ne 'intents') {
                    $tokens = @($intentName -split '[^a-zA-Z0-9]+' | Where-Object { $_ })
                    $patterns = if ($tokens.Count -gt 0) { @($tokens) } else { @($intentName) }
                    $intents[$intentName] = [pscustomobject]@{
                        name = $intentName
                        patterns = $patterns
                        responses = @("I can help with that topic.")
                    }
                }
            }

            $braceBalance += ($openBraces - $closeBraces)
            if ($braceBalance -le 0) { break }
        }

        if ($intents.Count -gt 0) {
            return [pscustomobject]@{
                intents = [pscustomobject]$intents
                meta = [ordered]@{
                    version = '1.2'
                    loaded_via = 'streaming-fallback'
                    total_intents = $intents.Count
                }
            }
        }
    } catch {
        Write-Host "  [CHATBOT] Falling back to a lightweight parser after a scan error: $_" -ForegroundColor DarkYellow
    } finally {
        if ($reader) { $reader.Close() }
    }

    try {
        $parsed = $trimmed | ConvertFrom-Json
        return Convert-ConversationToCompactIndex -ConversationData $parsed
    } catch {
        return [pscustomobject]@{ intents = [ordered]@{}; meta = [ordered]@{ loaded_via = 'text-fallback' } }
    }
}

function Convert-SynonymsToCompactIndex {
    param([object]$SynonymData)
    if (-not $SynonymData) { return [pscustomobject]@{ synonym_map = [ordered]@{}; meta = [ordered]@{ loaded_via = 'compact' } } }

    $synonymMap = [ordered]@{}
    foreach ($prop in $SynonymData.synonym_map.PSObject.Properties) {
        $synonymMap[$prop.Name] = @($prop.Value)
    }

    return [pscustomobject]@{
        synonym_map = [pscustomobject]$synonymMap
        meta = [ordered]@{
            version = '1.1'
            loaded_via = 'compact-index'
            total_groups = $synonymMap.Count
        }
    }
}

function Load-ConversationIndexFromCache {
    param([string]$ConvFile)
    if (-not $script:EngineState.RuntimePaths.VirtualRamRoot) { return $null }
    $fingerprint = Get-FileFingerprint -InputPath $ConvFile
    $cachePath = Join-Path $script:EngineState.RuntimePaths.VirtualRamRoot 'conversation_index.json'
    if (-not (Test-Path -LiteralPath $cachePath)) { return $null }

    $cached = Read-JsonFileSafe -Path $cachePath
    if (-not $cached) { return $null }
    if ($cached.meta.file_hash -eq $fingerprint.Hash) {
        return $cached
    }
    return $null
}

function Save-ConversationIndexToCache {
    param([string]$ConvFile, [object]$Payload)
    if (-not $script:EngineState.RuntimePaths.VirtualRamRoot) { return }
    $fingerprint = Get-FileFingerprint -InputPath $ConvFile
    $cachePayload = [pscustomobject]@{
        payload = $Payload
        meta = [ordered]@{
            file_hash = $fingerprint.Hash
            path = $ConvFile
            saved_at = (Get-Date).ToString('o')
        }
    }
    Save-JsonFileSafe -Path (Join-Path $script:EngineState.RuntimePaths.VirtualRamRoot 'conversation_index.json') -Payload $cachePayload | Out-Null
}

function Load-SynonymIndexFromCache {
    param([string]$SynFile)
    if (-not $script:EngineState.RuntimePaths.VirtualRamRoot) { return $null }
    $fingerprint = Get-FileFingerprint -InputPath $SynFile
    $cachePath = Join-Path $script:EngineState.RuntimePaths.VirtualRamRoot 'synonyms_index.json'
    if (-not (Test-Path -LiteralPath $cachePath)) { return $null }

    $cached = Read-JsonFileSafe -Path $cachePath
    if ($cached -and $cached.meta.file_hash -eq $fingerprint.Hash) {
        return $cached.payload
    }
    return $null
}

function Save-SynonymIndexToCache {
    param([string]$SynFile, [object]$Payload)
    if (-not $script:EngineState.RuntimePaths.VirtualRamRoot) { return }
    $fingerprint = Get-FileFingerprint -InputPath $SynFile
    $cachePayload = [pscustomobject]@{
        payload = $Payload
        meta = [ordered]@{
            file_hash = $fingerprint.Hash
            path = $SynFile
            saved_at = (Get-Date).ToString('o')
        }
    }
    Save-JsonFileSafe -Path (Join-Path $script:EngineState.RuntimePaths.VirtualRamRoot 'synonyms_index.json') -Payload $cachePayload | Out-Null
}

# =============================================================================
# VIRTUAL RAM FILE SYSTEM (same as before)
# =============================================================================

function New-VRAMFile {
    param([string]$FilePath)
    
    $vram = @{
        Path = $FilePath
        Size = (Get-Item $FilePath).Length
        Stream = $null
        Reader = $null
        BlockSize = 8192
        BlockCache = @{}
        Index = @{}
        TotalBlocks = 0
        IsObjectRoot = $false
    }
    
    $vram.Stream = [System.IO.File]::OpenRead($FilePath)
    $vram.Reader = New-Object System.IO.BinaryReader($vram.Stream)
    $vram.TotalBlocks = [math]::Ceiling($vram.Size / $vram.BlockSize)
    
    Write-Progress -Activity "VRAM Indexing" -Status "Scanning structure..." -PercentComplete 0
    
    $buffer = New-Object byte[] 65536
    $position = 0
    $totalRead = 0
    $depth = 0
    $inString = $false
    $objectStart = 0
    $objectCount = 0
    $rootDepth = -1
    $expectPropName = $false
    $currentPropName = $null
    $propStart = 0
    $propDepth = 0
    $isRootObject = $false
    $foundFirstObject = $false
    $firstObjectStart = 0
    $firstObjectEnd = 0
    $firstObjectContent = $null
    
    $vram.Stream.Seek(0, [System.IO.SeekOrigin]::Begin) | Out-Null
    
    $peekBuffer = New-Object byte[] 1024
    $bytesRead = $vram.Stream.Read($peekBuffer, 0, 1024)
    $peekString = [System.Text.Encoding]::UTF8.GetString($peekBuffer, 0, $bytesRead)
    $trimmed = $peekString.TrimStart()
    $isObjectRoot = $trimmed.StartsWith('{')
    $vram.Stream.Seek(0, [System.IO.SeekOrigin]::Begin) | Out-Null
    
    while ($totalRead -lt $vram.Size) {
        $bytesRead = $vram.Stream.Read($buffer, 0, $buffer.Length)
        if ($bytesRead -eq 0) { break }
        
        for ($i = 0; $i -lt $bytesRead; $i++) {
            $byte = $buffer[$i]
            $char = [char]$byte
            $position++
            
            if ($char -eq '"' -and ($i -eq 0 -or $buffer[$i-1] -ne 92)) {
                $inString = -not $inString
            }
            
            if (-not $inString) {
                if ($char -eq '{') {
                    if ($depth -eq 0) {
                        $objectStart = $position
                        if (-not $foundFirstObject) {
                            $firstObjectStart = $position
                            $foundFirstObject = $true
                        }
                    }
                    $depth++
                    if ($depth -eq 2 -and $isObjectRoot -and $currentPropName) {
                        $propStart = $position
                        $propDepth = $depth
                    }
                }
                if ($char -eq '}') {
                    $depth--
                    if ($depth -eq 0) {
                        $objectCount++
                        if ($objectCount -eq 1) {
                            $firstObjectEnd = $position
                        }
                        if ($isObjectRoot -and $currentPropName -and $propDepth -eq $depth + 1) {
                            $vram.Index["prop_$currentPropName"] = @{
                                Start = $propStart
                                End = $position
                                Name = $currentPropName
                            }
                            $currentPropName = $null
                            $propDepth = 0
                        } else {
                            $vram.Index["obj_$objectCount"] = @{
                                Start = $objectStart
                                End = $position
                            }
                        }
                    }
                    if ($depth -eq 0) {
                        $isRootObject = $false
                    }
                }
                if ($char -eq '"' -and $depth -eq 1 -and -not $inString -and $isObjectRoot) {
                    # placeholder – will be handled by monolithic fallback
                }
            }
        }
        
        $totalRead += $bytesRead
        $percent = [math]::Min(100, [int](($totalRead / $vram.Size) * 100))
        Write-Progress -Activity "VRAM Indexing" -Status "Scanning... $percent%" -PercentComplete $percent
    }
    
    Write-Progress -Activity "VRAM Indexing" -Completed
    
    if ($vram.Index.Count -eq 1 -and $isObjectRoot) {
        $vram.IsObjectRoot = $true
        Write-Host "  [VRAM] Detected monolithic object. Will parse entire file on first use." -ForegroundColor Yellow
    } else {
        Write-Host "  [VRAM] Indexed $($vram.Index.Count) JSON objects." -ForegroundColor Green
    }
    
    $vram.GetObject = {
        param([string]$Key)
        if (-not $this.Index.ContainsKey($Key)) { return $null }
        $entry = $this.Index[$Key]
        $start = $entry.Start - 1
        $length = $entry.End - $entry.Start + 1
        $this.Stream.Seek($start, [System.IO.SeekOrigin]::Begin) | Out-Null
        $buffer = New-Object byte[] $length
        $this.Stream.Read($buffer, 0, $length) | Out-Null
        return [System.Text.Encoding]::UTF8.GetString($buffer)
    }
    
    $vram.GetKeys = { return $this.Index.Keys }
    $vram.GetCount = { return $this.Index.Count }
    $vram.Close = {
        if ($this.Reader) { $this.Reader.Close() }
        if ($this.Stream) { $this.Stream.Close() }
        $this.BlockCache.Clear()
    }
    
    return $vram
}

function Open-VRAM {
    param([string]$FilePath)
    if (-not (Test-Path $FilePath)) {
        Write-Host "  [VRAM] File not found: $FilePath" -ForegroundColor Red
        return $null
    }
    $size = (Get-Item $FilePath).Length / 1MB
    Write-Host "  [VRAM] Opening $([math]::Round($size,2)) MB file..." -ForegroundColor Cyan
    return New-VRAMFile -FilePath $FilePath
}

# =============================================================================
# AUDIO & SPEECH FUNCTIONS (unchanged)
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
# DATA LOADERS (with background job support)
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

function Import-ConversationDataSync {
    param([string]$ConvFile)
    if (-not (Test-Path -LiteralPath $ConvFile)) { return $null }

    $fileSize = (Get-Item $ConvFile).Length / 1MB
    Write-Host "  [CHATBOT] File size: $([math]::Round($fileSize,2)) MB" -ForegroundColor Gray

    $cached = Load-ConversationIndexFromCache -ConvFile $ConvFile
    if ($cached) {
        Write-Host "  [CHATBOT] Loaded compact conversation index from cache." -ForegroundColor Green
        return @{
            ConversationData = $cached.payload
            VRAMConvFile = $null
            VRAMConvIsArray = $false
            VRAMConvMonolithicCache = $null
        }
    }

    try {
        Write-Host "  [CHATBOT] Building compact index from conversation database..." -ForegroundColor DarkGray
        $compactIndex = Convert-ConversationTextToCompactIndex -FilePath $ConvFile
        Save-ConversationIndexToCache -ConvFile $ConvFile -Payload $compactIndex
        Write-Host "  [CHATBOT] Loaded $($compactIndex.meta.total_intents) intents into a lightweight index." -ForegroundColor Green
        return @{
            ConversationData = $compactIndex
            VRAMConvFile = $null
            VRAMConvIsArray = $false
            VRAMConvMonolithicCache = $null
        }
    } catch {
        Write-Host "  [CHATBOT ERROR] Failed to parse: $_" -ForegroundColor Red
        return $null
    }
}

function Import-SynonymDataSync {
    param([string]$SynFile)
    if (-not (Test-Path -LiteralPath $SynFile)) { return $null }
    try {
        $fileSize = (Get-Item $SynFile).Length / 1MB
        Write-Host "  [SYNONYM] Loading $([math]::Round($fileSize,2)) MB file..." -ForegroundColor DarkGray

        $cached = Load-SynonymIndexFromCache -SynFile $SynFile
        if ($cached) {
            Write-Host "  [SYNONYM] Loaded compact synonym index from cache." -ForegroundColor Green
            return $cached
        }

        $rawJson = Get-Content -LiteralPath $SynFile -Raw -Encoding UTF8
        $synData = $rawJson | ConvertFrom-Json
        $compactIndex = Convert-SynonymsToCompactIndex -SynonymData $synData
        Save-SynonymIndexToCache -SynFile $SynFile -Payload $compactIndex
        $synCount = $compactIndex.synonym_map.PSObject.Properties.Name.Count
        Write-Host "  [SYNONYM] Loaded $synCount synonym groups into a lightweight index." -ForegroundColor Green
        return $compactIndex
    } catch {
        Write-Host "  [SYNONYM ERROR] Failed to parse synonyms.json: $_" -ForegroundColor Red
        return $null
    }
}

# =============================================================================
# BACKGROUND LOADER JOB (unchanged)
# =============================================================================

function Start-BackgroundLoad {
    $scriptDir = if ($PSScriptRoot) { $PSScriptRoot } else { (Get-Location).Path }
    $convFile = Join-Path $scriptDir "conversation_commands.json"
    $synFile = Join-Path $scriptDir "synonyms.json"

    $jobScript = {
        param($ConvPath, $SynPath)
        function New-VRAMFileJob {
            param([string]$FilePath)
            $vram = @{
                Path = $FilePath
                Size = (Get-Item $FilePath).Length
                Stream = $null
                Reader = $null
                BlockSize = 8192
                BlockCache = @{}
                Index = @{}
                TotalBlocks = 0
                IsObjectRoot = $false
            }
            $vram.Stream = [System.IO.File]::OpenRead($FilePath)
            $vram.Reader = New-Object System.IO.BinaryReader($vram.Stream)
            $vram.TotalBlocks = [math]::Ceiling($vram.Size / $vram.BlockSize)
            
            $buffer = New-Object byte[] 65536
            $position = 0
            $totalRead = 0
            $depth = 0
            $inString = $false
            $objectStart = 0
            $objectCount = 0
            $isRootObject = $false
            $foundFirstObject = $false
            
            $peekBuffer = New-Object byte[] 1024
            $bytesRead = $vram.Stream.Read($peekBuffer, 0, 1024)
            $peekString = [System.Text.Encoding]::UTF8.GetString($peekBuffer, 0, $bytesRead)
            $trimmed = $peekString.TrimStart()
            $isObjectRoot = $trimmed.StartsWith('{')
            $vram.Stream.Seek(0, [System.IO.SeekOrigin]::Begin) | Out-Null
            
            while ($totalRead -lt $vram.Size) {
                $bytesRead = $vram.Stream.Read($buffer, 0, $buffer.Length)
                if ($bytesRead -eq 0) { break }
                for ($i = 0; $i -lt $bytesRead; $i++) {
                    $byte = $buffer[$i]
                    $char = [char]$byte
                    $position++
                    if ($char -eq '"' -and ($i -eq 0 -or $buffer[$i-1] -ne 92)) {
                        $inString = -not $inString
                    }
                    if (-not $inString) {
                        if ($char -eq '{') {
                            if ($depth -eq 0) { $objectStart = $position; if (-not $foundFirstObject) { $foundFirstObject = $true } }
                            $depth++
                        }
                        if ($char -eq '}') {
                            $depth--
                            if ($depth -eq 0) {
                                $objectCount++
                                $vram.Index["obj_$objectCount"] = @{ Start = $objectStart; End = $position }
                            }
                        }
                    }
                }
                $totalRead += $bytesRead
            }
            if ($vram.Index.Count -eq 1 -and $isObjectRoot) {
                $vram.IsObjectRoot = $true
            }
            $vram.GetObject = {
                param([string]$Key)
                if (-not $this.Index.ContainsKey($Key)) { return $null }
                $entry = $this.Index[$Key]
                $start = $entry.Start - 1
                $length = $entry.End - $entry.Start + 1
                $this.Stream.Seek($start, [System.IO.SeekOrigin]::Begin) | Out-Null
                $buffer = New-Object byte[] $length
                $this.Stream.Read($buffer, 0, $length) | Out-Null
                return [System.Text.Encoding]::UTF8.GetString($buffer)
            }
            $vram.GetKeys = { return $this.Index.Keys }
            $vram.GetCount = { return $this.Index.Count }
            $vram.Close = {
                if ($this.Reader) { $this.Reader.Close() }
                if ($this.Stream) { $this.Stream.Close() }
                $this.BlockCache.Clear()
            }
            return $vram
        }
        function Open-VRAMJob { param($FilePath) return New-VRAMFileJob -FilePath $FilePath }
        
        $convResult = $null
        if (Test-Path $ConvPath) {
            $fileSize = (Get-Item $ConvPath).Length / 1MB
            $useVRAM = $fileSize -gt 10
            if ($useVRAM) {
                try {
                    $vram = Open-VRAMJob -FilePath $ConvPath
                    if ($vram) {
                        $convResult = @{
                            ConversationData = $null
                            VRAMConvFile = $vram
                            VRAMConvIsArray = ($vram.GetCount() -gt 1)
                            VRAMConvMonolithicCache = $null
                        }
                    }
                } catch {}
            }
            if (-not $convResult) {
                try {
                    $rawJson = Get-Content -LiteralPath $ConvPath -Raw -Encoding UTF8
                    $convData = $rawJson | ConvertFrom-Json
                    $convResult = @{
                        ConversationData = $convData
                        VRAMConvFile = $null
                        VRAMConvIsArray = $false
                        VRAMConvMonolithicCache = $null
                    }
                } catch {}
            }
        }
        
        $synResult = $null
        if (Test-Path $SynPath) {
            try {
                $fileSize = (Get-Item $SynPath).Length / 1MB
                if ($fileSize -gt 10) {
                    $vram = Open-VRAMJob -FilePath $SynPath
                    if ($vram) {
                        if ($vram.GetCount() -eq 1) {
                            $rootJson = $vram.GetObject("obj_1")
                            if ($rootJson) {
                                $synResult = $rootJson | ConvertFrom-Json
                                $vram.Close()
                            }
                        } else {
                            $allData = @{ synonym_map = @{} }
                            foreach ($key in $vram.GetKeys()) {
                                $obj = $vram.GetObject($key) | ConvertFrom-Json
                                if ($obj.PSObject.Properties) {
                                    foreach ($prop in $obj.PSObject.Properties) {
                                        $allData.synonym_map[$prop.Name] = $prop.Value
                                    }
                                }
                            }
                            $synResult = $allData
                            $vram.Close()
                        }
                    }
                }
                if (-not $synResult) {
                    $rawJson = Get-Content -LiteralPath $SynPath -Raw -Encoding UTF8
                    $synResult = $rawJson | ConvertFrom-Json
                }
            } catch {}
        }
        
        return @{ Conversation = $convResult; Synonyms = $synResult }
    }
    
    $script:EngineState.LoadJob = Start-Job -ScriptBlock $jobScript -ArgumentList $convFile, $synFile
    Write-Host "  [BACKGROUND] Started loading conversation and synonyms in background." -ForegroundColor Cyan
}

function Warm-StartupCache {
    param([string]$ScriptDir)
    $convFile = Join-Path $ScriptDir 'conversation_commands.json'
    $synFile = Join-Path $ScriptDir 'synonyms.json'

    if (Test-Path -LiteralPath $convFile) {
        try {
            $null = Import-ConversationDataSync -ConvFile $convFile
        } catch {}
    }
    if (Test-Path -LiteralPath $synFile) {
        try {
            $null = Import-SynonymDataSync -SynFile $synFile
        } catch {}
    }
}

function Wait-ForBackgroundLoad {
    if (-not $script:EngineState.LoadJob) { return }
    if ($script:EngineState.LoadComplete) { return }
    
    Write-Host "`n  [BACKGROUND] Waiting for data to load... (this may take a while)" -ForegroundColor Yellow
    $job = $script:EngineState.LoadJob
    while ($job.State -eq 'Running') {
        Write-Host "  [BACKGROUND] Still loading... (use Ctrl+C to cancel and use fallback)" -ForegroundColor DarkGray
        Start-Sleep -Seconds 2
    }
    if ($job.State -eq 'Completed') {
        $result = Receive-Job -Job $job
        if ($result) {
            if ($result.Conversation) {
                $conv = $result.Conversation
                $script:EngineState.ConversationData = $conv.ConversationData
                $script:EngineState.VRAMConvFile = $conv.VRAMConvFile
                $script:EngineState.VRAMConvIsArray = $conv.VRAMConvIsArray
                $script:EngineState.VRAMConvMonolithicCache = $conv.VRAMConvMonolithicCache
                Write-Host "  [BACKGROUND] Conversation data loaded." -ForegroundColor Green
            }
            if ($result.Synonyms) {
                $script:EngineState.SynonymData = $result.Synonyms
                Write-Host "  [BACKGROUND] Synonyms loaded." -ForegroundColor Green
            }
            $script:EngineState.LoadComplete = $true
        } else {
            Write-Host "  [BACKGROUND] Load returned no data." -ForegroundColor Yellow
            $script:EngineState.LoadComplete = $true
        }
    } else {
        Write-Host "  [BACKGROUND] Job failed: $($job.State)" -ForegroundColor Red
        $script:EngineState.LoadError = "Background job failed."
        $script:EngineState.LoadComplete = $true
    }
    Remove-Job -Job $job -Force
    $script:EngineState.LoadJob = $null
}

# =============================================================================
# VLC AUDIO SUBSYSTEM (unchanged)
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
# UI COMPONENTS (unchanged)
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
# SYNONYM REPLACEMENT ENGINE (unchanged)
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
# NARRATOR FUNCTIONS (unchanged)
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
    $variedScript = Invoke-SynonymReplacement -Text $baseScript -ReplaceProbability 0.2

    return @{
        Fact          = $selectedFact
        SpeechScript  = $variedScript
        ExtensionDesc = $extDesc
    }
}

# =============================================================================
# FILE CODE ALLOTMENT SYSTEM (unchanged)
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
# SYSTEM ANALYTICS ENGINE (unchanged)
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
# RANDOM FILE SPEECH (unchanged)
# =============================================================================

function Invoke-RandomFileSpeech {
    param([string]$TargetDirectory)
    if (-not $script:EngineState.SynonymData -and -not $script:EngineState.LoadComplete) {
        Write-Host "  [NARRATOR] Synonyms not yet loaded. Waiting for background load..." -ForegroundColor Yellow
        Wait-ForBackgroundLoad
    }
    
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
# CHATBOT ENGINE – unchanged
# =============================================================================

function Find-MatchingIntentVRAM {
    param([string]$UserInput)
    $vram = $script:EngineState.VRAMConvFile
    if (-not $vram) { return $null }
    $bestScore = 0
    $bestResponses = $null

    if ($vram.IsObjectRoot) {
        if ($null -eq $script:EngineState.VRAMConvMonolithicCache) {
            $key = $vram.GetKeys() | Select-Object -First 1
            if ($key) {
                $json = $vram.GetObject($key)
                try {
                    $script:EngineState.VRAMConvMonolithicCache = $json | ConvertFrom-Json
                } catch {
                    return $null
                }
            }
        }
        $obj = $script:EngineState.VRAMConvMonolithicCache
        if ($obj.intents) {
            foreach ($intentName in $obj.intents.PSObject.Properties.Name) {
                $intent = $obj.intents.$intentName
                if ($intent.patterns) {
                    foreach ($pattern in $intent.patterns) {
                        if ($UserInput -match $pattern) {
                            if ($intent.responses) {
                                return $intent.responses | Get-Random
                            }
                        }
                    }
                }
            }
        }
        return $null
    }

    $keys = $vram.GetKeys()
    foreach ($key in $keys) {
        $objJson = $vram.GetObject($key)
        try {
            $obj = $objJson | ConvertFrom-Json
        } catch { continue }
        if ($obj.PSObject.Properties.Name -contains "patterns") {
            foreach ($pattern in $obj.patterns) {
                if ($UserInput -match $pattern) {
                    if ($obj.responses) {
                        return $obj.responses | Get-Random
                    }
                }
            }
        } elseif ($obj.PSObject.Properties.Name -contains "intents") {
            $intents = $obj.intents
            foreach ($intentName in $intents.PSObject.Properties.Name) {
                $intent = $intents.$intentName
                if ($intent.patterns) {
                    foreach ($pattern in $intent.patterns) {
                        if ($UserInput -match $pattern) {
                            if ($intent.responses) {
                                return $intent.responses | Get-Random
                            }
                        }
                    }
                }
            }
        }
    }
    return $null
}

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

# =============================================================================
# FILE ANALYSIS HELPERS – added for detailed per‑file report
# =============================================================================

# Static lookup table for file descriptions (fallback)
$script:FileDescriptionMap = @{
    'test.ps1'                 = 'Main engine script that boots the Echo chatbot.'
    'EchoEngine.ps1'           = 'Legacy engine wrapper for backward compatibility.'
    'VirtualRAMFileSystem.ps1' = 'Virtual RAM indexing layer for huge JSON files.'
    # Add additional entries as needed …
}

function Get-FileState {
    param([string]$Path)
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { return $null }
    $size = (Get-Item -LiteralPath $Path).Length
    return if ($size -eq 0) { 'empty' } else { 'filled' }
}

function Extract-FileSummary {
    param([string]$Path)
    if (-not (Test-Path -LiteralPath $Path)) { return 'No description available' }
    $lines = Get-Content -LiteralPath $Path -TotalCount 10 -ErrorAction SilentlyContinue
    foreach ($ln in $lines) {
        if ($ln -match '^\.SYNOPSIS\s+(.*)') { return $Matches[1].Trim() }
    }
    $leaf = Split-Path -Leaf $Path
    if ($script:FileDescriptionMap -and $script:FileDescriptionMap.ContainsKey($leaf)) {
        return $script:FileDescriptionMap[$leaf]
    }
    return 'No description available'
}

function Invoke-FileAnalysisReport {
    param(
        [Parameter(Mandatory=$true)][string]$TargetDirectory
    )
    $resolved = (Resolve-Path -LiteralPath $TargetDirectory).Path.TrimEnd('\\','/')
    $allFiles = Get-ChildItem -LiteralPath $resolved -File -Recurse -Force -ErrorAction SilentlyContinue
    $report = @()
    foreach ($f in $allFiles) {
        $state   = Get-FileState -Path $f.FullName
        $summary = Extract-FileSummary -Path $f.FullName
        $relative = $f.FullName.Substring($resolved.Length).TrimStart('\\','/')
        $report += [pscustomobject]@{
            Path      = $relative
            State     = $state
            SizeHuman = Get-FormattedByteSize $f.Length
            Summary   = $summary
        }
    }
    Write-Host "\n=== Full File Analysis Report ===" -ForegroundColor Cyan
    $report | Sort-Object Path | Format-Table -AutoSize Path, State, SizeHuman, Summary
    return $report
}

# Continue with the existing Invoke-Chatbot definition

function Invoke-Chatbot {
    param(
        [string]$TargetDirectory
    )
    if (-not $script:EngineState.ConversationData -and -not $script:EngineState.VRAMConvFile -and -not $script:EngineState.LoadComplete) {
        Write-Host "  [CHATBOT] Conversation data not yet loaded. Waiting for background load..." -ForegroundColor Yellow
        Wait-ForBackgroundLoad
    }
    if (-not $script:EngineState.ConversationData -and -not $script:EngineState.VRAMConvFile) {
        Write-Host "  [CHATBOT] Attempting to load conversation data synchronously..." -ForegroundColor Yellow
        $scriptDir = if ($PSScriptRoot) { $PSScriptRoot } else { (Get-Location).Path }
        $convFile = Join-Path $scriptDir "conversation_commands.json"
        $result = Import-ConversationDataSync -ConvFile $convFile
        if ($result) {
            $script:EngineState.ConversationData = $result.ConversationData
            $script:EngineState.VRAMConvFile = $result.VRAMConvFile
            $script:EngineState.VRAMConvIsArray = $result.VRAMConvIsArray
            $script:EngineState.VRAMConvMonolithicCache = $result.VRAMConvMonolithicCache
        }
    }
    $convData = $script:EngineState.ConversationData
    $vram = $script:EngineState.VRAMConvFile
    if (-not $convData -and -not $vram) {
        Write-Host "  [CHATBOT ERROR] No conversation data available." -ForegroundColor Red
        Start-Sleep -Seconds 3
        return
    }

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

        if ($userInput -eq "report") {
            # Generate and display file analysis report for the current target directory
            $report = Invoke-FileAnalysisReport -TargetDirectory $TargetDirectory
            # Continue to next loop iteration after showing report
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

        $response = $null

        if ($vram) {
            $response = Find-MatchingIntentVRAM -UserInput $userInput
        } elseif ($convData) {
            $intents = $convData.intents
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
            if ($null -ne $matchedIntent -and $bestScore -gt 0.15) {
                $responses = $matchedIntent.responses
                if ($responses -and $responses.Count -gt 0) {
                    $response = $responses | Get-Random
                    $ctx.lastIntent = $matchedIntent.PSObject.Properties.Name[0]
                }
            }
        }

        if (-not $response) {
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
# NEW: FOLDER TREE FUNCTION
# =============================================================================

function Show-FolderTree {
    param(
        [string]$TargetDirectory,
        [int]$MaxDepth = 3,
        [switch]$IncludeFiles
    )

    $TargetDirectory = (Resolve-Path -LiteralPath $TargetDirectory).Path.TrimEnd('\', '/')
    Write-Host ""
    Write-Host "  🌳 Generating folder tree for: $TargetDirectory" -ForegroundColor Cyan
    Write-Host "  Depth limit: $MaxDepth, Include files: $IncludeFiles" -ForegroundColor Gray
    Write-Host ""

    # Build tree string
    $sb = [System.Text.StringBuilder]::new()
    [void]$sb.AppendLine("$TargetDirectory")

    function Add-TreeLevel {
        param(
            [string]$Path,
            [int]$CurrentDepth,
            [string]$Prefix
        )
        if ($CurrentDepth -gt $MaxDepth) { return }

        $items = Get-ChildItem -LiteralPath $Path -Force -ErrorAction SilentlyContinue
        if (-not $items) { return }

        $directories = $items | Where-Object { $_.PSIsContainer } | Sort-Object Name
        $files = if ($IncludeFiles) { $items | Where-Object { -not $_.PSIsContainer } | Sort-Object Name } else { @() }

        $allItems = @($directories) + @($files)
        $count = $allItems.Count
        for ($i = 0; $i -lt $count; $i++) {
            $item = $allItems[$i]
            $isLast = ($i -eq $count - 1)
            $linePrefix = if ($isLast) { "$Prefix└── " } else { "$Prefix├── " }
            $nextPrefix = if ($isLast) { "$Prefix    " } else { "$Prefix│   " }

            [void]$sb.AppendLine("$linePrefix$($item.Name)")
            if ($item.PSIsContainer) {
                Add-TreeLevel -Path $item.FullName -CurrentDepth ($CurrentDepth + 1) -Prefix $nextPrefix
            }
        }
    }

    Add-TreeLevel -Path $TargetDirectory -CurrentDepth 1 -Prefix ""

    $treeString = $sb.ToString().TrimEnd()
    Write-Host $treeString -ForegroundColor White

    # Ask to copy to clipboard
    Write-Host ""
    $copyChoice = Read-Host "  Copy this tree to clipboard? (y/n)"
    if ($copyChoice -eq 'y' -or $copyChoice -eq 'Y') {
        try {
            $treeString | Set-Clipboard
            Write-Host "  ✅ Tree copied to clipboard." -ForegroundColor Green
            Invoke-SystemSound -Type Success
        } catch {
            Write-Host "  ❌ Failed to copy to clipboard: $_" -ForegroundColor Red
        }
    } else {
        Write-Host "  Tree not copied." -ForegroundColor Gray
    }
    Write-Host ""
}

# =============================================================================
# MAIN CONTROL LOOP – with new option 11
# =============================================================================

try {
    $scriptDir = if ($PSScriptRoot) { $PSScriptRoot } else { (Get-Location).Path }
    Initialize-EngineWorkspace -RootPath $scriptDir | Out-Null
    Write-MemorySnapshot | Out-Null
    Write-CacheManifest | Out-Null

    Import-NarratorData
    Warm-StartupCache -ScriptDir $scriptDir

    if ($NoInteractive) {
        $scanStats = Invoke-SystemScanEngine -TargetDirectory $scriptDir
        $reportName = "project_summary_{0}.txt" -f (Get-Date -Format 'yyyyMMdd_HHmmss')
        $reportContent = @(
            "Project Report",
            "Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')",
            "Target Path: $scriptDir",
            "Total Folders: $($scanStats.TotalFolders)",
            "Total Files: $($scanStats.TotalFiles)",
            "Total Lines: $($scanStats.TotalLines)",
            "Largest File: $($scanStats.LargestFile.Name)",
            "Largest File Size: $(Get-FormattedByteSize $($scanStats.LargestFile.Length))"
        ) -join [Environment]::NewLine
        $savedPath = Write-WorkspaceReport -FileName $reportName -Content $reportContent
        Write-Host "  [BOOT] Quick-start cache and project report completed." -ForegroundColor Green
        Write-Host "  [BOOT] Report saved to $savedPath" -ForegroundColor Green
        Write-Host "  [BOOT] Startup complete. Exiting in non-interactive mode." -ForegroundColor Cyan
        $running = $false
    } else {
        Start-BackgroundLoad

        $audioFile = if ($Music) { $Music } else { Join-Path $scriptDir "bgmusic.mp3" }
        Start-AudioSession -FilePath $audioFile

        $running = $true
        while ($running) {
            Clear-Host
            Write-Host ""
            Write-Host "  ╔══════════════════════════════════════════════════════════════════════════╗" -ForegroundColor DarkBlue
            Write-Host "  ║          INTERSTELLAR QUANTUM ANALYTICS COMMAND CENTER v10.0 VRAM         ║" -ForegroundColor Cyan
            Write-Host "  ║          Echo Engine — Virtual RAM File System for 1GB+ Files           ║" -ForegroundColor Gray
            Write-Host "  ╚══════════════════════════════════════════════════════════════════════════╝" -ForegroundColor DarkBlue
            Write-Host ""

            Show-FloatingBar
            Show-DevDashboard

            if (-not $script:EngineState.LoadComplete) {
                Write-Host "  [⏳] Background loading in progress..." -ForegroundColor Yellow
            } else {
                Write-Host "  [✅] Data loaded" -ForegroundColor Green
            }

            Write-Host "   [1] Engage System Analytics Engine" -ForegroundColor Cyan
            Write-Host "   [2] Toggle Diagnostics HUD" -ForegroundColor White
            Write-Host "   [3] Toggle Status Telemetry Bar" -ForegroundColor White
            Write-Host "   [4] Inspect & Narrate Random File (with Synonyms)" -ForegroundColor Magenta
            Write-Host "   [5] Change Target Directory Path" -ForegroundColor White
            Write-Host "   [6] 🤖 AI Chatbot Interface (VRAM Enhanced)" -ForegroundColor Green
            Write-Host "   [7] 📋 File Code Allotment (Assign Unique Codes)" -ForegroundColor Yellow
            Write-Host "   [8] 🔍 Search File Catalog by Code/Name" -ForegroundColor Yellow
            Write-Host "   [9] 📊 Generate File Catalog Report" -ForegroundColor Yellow
            Write-Host "   [10] Exit Engine" -ForegroundColor DarkRed
            Write-Host "   [11] 🌳 Show Folder Tree (and copy to clipboard)" -ForegroundColor DarkCyan
            Write-Host "   [12] 📁 Save Project Reports" -ForegroundColor DarkYellow
            Write-Host ""
            Write-Host "   Active Target Path: " -NoNewline -ForegroundColor Gray
            Write-Host $Path -ForegroundColor Cyan
            Write-Host ""
            Write-Host "   VRAM Status: " -NoNewline
            if ($script:EngineState.VRAMConvFile) {
                Write-Host "✅ Active (conversation_commands.json)" -ForegroundColor Green
            } else {
                Write-Host "❌ Inactive" -ForegroundColor Red
            }
            Write-Host ""

            $choice = Read-Host "   Command Input [1-12]"

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
                    Invoke-Chatbot -TargetDirectory $Path
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
                '11' {
                    Clear-Host
                    Show-FloatingBar
                    Write-Host ""
                    Write-Host "  🌳 Folder Tree Viewer" -ForegroundColor Cyan
                    Write-Host "  Using target path: $Path" -ForegroundColor Gray
                    $depth = Read-Host "  Max depth (default 3, 0 for unlimited)"
                    if ($depth -eq '') { $depth = 3 } else { $depth = [int]$depth }
                    if ($depth -lt 0) { $depth = 0 }
                    $include = Read-Host "  Include files? (y/n, default n)"
                    $includeFiles = ($include -eq 'y' -or $include -eq 'Y')
                    Show-FolderTree -TargetDirectory $Path -MaxDepth $depth -IncludeFiles:$includeFiles
                    Write-Host "   Press ENTER to return to dashboard..." -ForegroundColor Cyan
                    [void](Read-Host)
                }
                '12' {
                    $reportName = "project_summary_{0}.txt" -f (Get-Date -Format 'yyyyMMdd_HHmmss')
                    $scanStats = Invoke-SystemScanEngine -TargetDirectory $Path
                    $reportContent = @(
                        "Project Report",
                        "Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')",
                        "Target Path: $Path",
                        "Total Folders: $($scanStats.TotalFolders)",
                        "Total Files: $($scanStats.TotalFiles)",
                        "Total Lines: $($scanStats.TotalLines)",
                        "Largest File: $($scanStats.LargestFile.Name)",
                        "Largest File Size: $(Get-FormattedByteSize $($scanStats.LargestFile.Length))"
                    ) -join [Environment]::NewLine
                    $savedPath = Write-WorkspaceReport -FileName $reportName -Content $reportContent
                    Write-Host "  [REPORT] Saved project report to $savedPath" -ForegroundColor Green
                    Invoke-SystemSound -Type Success
                    if (-not $NoInteractive) { [void](Read-Host '   Press ENTER to continue') }
                }
                Default {
                    Invoke-SystemSound -Type Warning
                    Write-Host "  [WARNING] Invalid option. Please choose 1-12." -ForegroundColor Yellow
                    Start-Sleep -Seconds 1
                }
            }
        }
    }
} catch {
    Write-CrashLog -Message "Fatal error in main loop" -Exception $_
    Write-Host ""
    Write-Host "  [ENGINE FATAL EXCEPTION] :: $_" -ForegroundColor Red
    Invoke-SystemSound -Type Error
} finally {
    if ($script:EngineState.VRAMConvFile) { $script:EngineState.VRAMConvFile.Close() }
    if ($script:EngineState.VRAMSynonymFile) { $script:EngineState.VRAMSynonymFile.Close() }
    Stop-AudioSession
    Write-Host ""
    Write-Host "  Session terminated safely." -ForegroundColor White
}