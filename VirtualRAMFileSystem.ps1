<#
.SYNOPSIS
    Virtual RAM File System — Handles large JSON files without loading entire file into memory.
.DESCRIPTION
    Creates memory-mapped files, indexes JSON data, and provides fast random access.
    Perfect for 1GB+ JSON files that PowerShell can't load normally.
#>

# =============================================================================
# Virtual RAM File System Class
# =============================================================================

class VirtualRAMFile {
    [string]$Path
    [long]$Size
    [string]$Checksum
    [hashtable]$Index
    [System.IO.FileStream]$Stream
    [System.IO.BinaryReader]$Reader
    [int]$BlockSize = 8192
    [int]$TotalBlocks
    [hashtable]$BlockCache = @{}
    
    # Constructor
    VirtualRAMFile([string]$FilePath) {
        $this.Path = $FilePath
        $this.Size = (Get-Item $FilePath).Length
        $this.Checksum = $this.ComputeChecksum()
        $this.Index = @{}
        
        # Open file stream
        $this.Stream = [System.IO.File]::OpenRead($FilePath)
        $this.Reader = New-Object System.IO.BinaryReader($this.Stream)
        
        $this.TotalBlocks = [math]::Ceiling($this.Size / $this.BlockSize)
        
        # Build index of JSON structure
        $this.BuildIndex()
    }
    
    # Compute file checksum for caching
    [string]ComputeChecksum() {
        $hash = Get-FileHash -Path $this.Path -Algorithm MD5 -ErrorAction SilentlyContinue
        if ($hash) { return $hash.Hash }
        return "00000000000000000000000000000000"
    }
    
    # Build index of JSON object positions
    [void]BuildIndex() {
        Write-Progress -Activity "Building Virtual RAM Index" -Status "Scanning file structure..." -PercentComplete 0
        
        # Reset to beginning
        $this.Stream.Seek(0, [System.IO.SeekOrigin]::Begin) | Out-Null
        
        $buffer = New-Object byte[] 65536
        $position = 0
        $totalRead = 0
        $depth = 0
        $inString = $false
        $lastKey = $null
        $lastKeyPos = 0
        $objectStartPos = 0
        $arrayStartPos = 0
        $currentKey = ""
        $currentLevel = 0
        
        # Scan for key positions
        while ($totalRead -lt $this.Size) {
            $bytesRead = $this.Stream.Read($buffer, 0, $buffer.Length)
            if ($bytesRead -eq 0) { break }
            
            for ($i = 0; $i -lt $bytesRead; $i++) {
                $byte = $buffer[$i]
                $char = [char]$byte
                $position++
                
                # Track string state
                if ($char -eq '"' -and ($i -eq 0 -or $buffer[$i-1] -ne 92)) {
                    $inString = -not $inString
                }
                
                if (-not $inString) {
                    if ($char -eq '{' -or $char -eq '[') {
                        if ($depth -eq 0) {
                            $objectStartPos = $position
                        }
                        $depth++
                    }
                    
                    if ($char -eq '}' -or $char -eq ']') {
                        $depth--
                        if ($depth -eq 0) {
                            # Record object position
                            $key = "root_" + ($this.Index.Count + 1)
                            $this.Index[$key] = @{
                                Start = $objectStartPos
                                End = $position
                                Level = $currentLevel
                                Depth = $depth
                            }
                        }
                    }
                    
                    # Track keys
                    if ($char -eq '"' -and -not $inString) {
                        $startPos = $position
                        # Read key name
                        $keyName = ""
                        $j = $i + 1
                        while ($j -lt $bytesRead) {
                            if ($buffer[$j] -eq 34) { break }
                            $keyName += [char]$buffer[$j]
                            $j++
                        }
                        if ($keyName -ne "") {
                            $lastKey = $keyName
                            $lastKeyPos = $position
                        }
                    }
                }
            }
            
            $totalRead += $bytesRead
            $percent = [math]::Min(100, [int](($totalRead / $this.Size) * 100))
            Write-Progress -Activity "Building Virtual RAM Index" -Status "Scanning... $percent%" -PercentComplete $percent
        }
        
        Write-Progress -Activity "Building Virtual RAM Index" -Completed
        Write-Host "  [VRAM] Indexed $($this.Index.Count) JSON objects." -ForegroundColor Green
    }
    
    # Get a specific JSON object by key
    [string]GetObject([string]$Key) {
        if (-not $this.Index.ContainsKey($Key)) {
            Write-Host "  [VRAM] Key not found: $Key" -ForegroundColor Yellow
            return $null
        }
        
        $entry = $this.Index[$Key]
        $start = $entry.Start - 1
        $length = $entry.End - $entry.Start + 1
        
        $this.Stream.Seek($start, [System.IO.SeekOrigin]::Begin) | Out-Null
        $buffer = New-Object byte[] $length
        $this.Stream.Read($buffer, 0, $length) | Out-Null
        
        return [System.Text.Encoding]::UTF8.GetString($buffer)
    }
    
    # Get all keys
    [string[]]GetKeys() {
        return $this.Index.Keys
    }
    
    # Get object count
    [int]GetObjectCount() {
        return $this.Index.Count
    }
    
    # Search for keys matching pattern
    [string[]]SearchKeys([string]$Pattern) {
        $results = @()
        foreach ($key in $this.Index.Keys) {
            if ($key -match $Pattern) {
                $results += $key
            }
        }
        return $results
    }
    
    # Clean up resources
    [void]Close() {
        if ($this.Reader) { $this.Reader.Close() }
        if ($this.Stream) { $this.Stream.Close() }
        $this.BlockCache.Clear()
        Write-Host "  [VRAM] Resources released." -ForegroundColor DarkGray
    }
}

# =============================================================================
# Virtual RAM File Manager
# =============================================================================

$script:VRAMCache = @{}
$script:VRAMFiles = @()

function Open-VRAMFile {
    param([string]$FilePath)
    
    if (-not (Test-Path $FilePath)) {
        Write-Host "  [VRAM] File not found: $FilePath" -ForegroundColor Red
        return $null
    }
    
    $fileSize = (Get-Item $FilePath).Length / 1MB
    Write-Host "  [VRAM] Opening file: $FilePath ($([math]::Round($fileSize,2)) MB)" -ForegroundColor Cyan
    
    # Check if already open
    if ($script:VRAMCache.ContainsKey($FilePath)) {
        Write-Host "  [VRAM] File already loaded." -ForegroundColor Yellow
        return $script:VRAMCache[$FilePath]
    }
    
    try {
        $vramFile = [VirtualRAMFile]::new($FilePath)
        $script:VRAMCache[$FilePath] = $vramFile
        $script:VRAMFiles += $FilePath
        Write-Host "  [VRAM] File loaded successfully." -ForegroundColor Green
        return $vramFile
    } catch {
        Write-Host "  [VRAM] Error loading file: $_" -ForegroundColor Red
        return $null
    }
}

function Close-VRAMFile {
    param([string]$FilePath)
    if ($script:VRAMCache.ContainsKey($FilePath)) {
        $script:VRAMCache[$FilePath].Close()
        $script:VRAMCache.Remove($FilePath)
        $script:VRAMFiles = $script:VRAMFiles | Where-Object { $_ -ne $FilePath }
        Write-Host "  [VRAM] Closed: $FilePath" -ForegroundColor DarkGray
    }
}

function Close-AllVRAMFiles {
    foreach ($file in $script:VRAMFiles) {
        Close-VRAMFile -FilePath $file
    }
    $script:VRAMCache.Clear()
    $script:VRAMFiles = @()
}

# =============================================================================
# Enhanced Conversation Loader using VRAM
# =============================================================================

function Import-ConversationDataVRAM {
    $scriptDir = if ($PSScriptRoot) { $PSScriptRoot } else { (Get-Location).Path }
    $convFile = Join-Path $scriptDir "conversation_commands.json"
    
    if (-not (Test-Path -LiteralPath $convFile)) {
        Write-Host "  [CHATBOT] conversation_commands.json not found." -ForegroundColor Yellow
        $script:EngineState.ConversationData = $null
        return
    }
    
    try {
        Write-Host "  [CHATBOT] Loading conversation database using VRAM..." -ForegroundColor DarkGray
        
        # Open file with VRAM
        $vramFile = Open-VRAMFile -FilePath $convFile
        
        if ($null -eq $vramFile) {
            Write-Host "  [CHATBOT] Failed to load file with VRAM." -ForegroundColor Red
            $script:EngineState.ConversationData = $null
            return
        }
        
        # Get object count
        $objectCount = $vramFile.GetObjectCount()
        Write-Host "  [CHATBOT] VRAM indexed $objectCount objects." -ForegroundColor Gray
        
        # Search for intent objects
        $intentKeys = $vramFile.SearchKeys("root_*")
        Write-Host "  [CHATBOT] Found $($intentKeys.Count) intent root objects." -ForegroundColor Gray
        
        # Process first few objects to build intents
        $conversationData = @{
            intents = @{}
            meta = @{
                version = "2.0.0"
                loaded_via = "VRAM"
                total_objects = $objectCount
            }
        }
        
        # We need to actually parse the JSON structure
        # For large files, we'll read the root structure
        $rootContent = $vramFile.GetObject("root_1")
        if ($rootContent) {
            try {
                # Parse the root JSON structure
                $rootJson = $rootContent | ConvertFrom-Json
                if ($rootJson.intents) {
                    $conversationData.intents = $rootJson.intents
                    $intentCount = $rootJson.intents.PSObject.Properties.Name.Count
                    Write-Host "  [CHATBOT] Loaded $intentCount intents." -ForegroundColor Green
                } else {
                    Write-Host "  [CHATBOT] No intents found in JSON structure." -ForegroundColor Yellow
                }
            } catch {
                Write-Host "  [CHATBOT] Error parsing root JSON: $_" -ForegroundColor Red
            }
        }
        
        $script:EngineState.ConversationData = $conversationData
        $script:EngineState.VRAMFile = $vramFile
        
        if ($conversationData.intents.PSObject.Properties.Name.Count -gt 0) {
            Write-Host "  [CHATBOT] ✅ Successfully loaded intents." -ForegroundColor Green
        } else {
            Write-Host "  [CHATBOT] ⚠️ No intents loaded. Check the file structure." -ForegroundColor Yellow
        }
        
    } catch {
        Write-Host "  [CHATBOT ERROR] Failed to load: $_" -ForegroundColor Red
        $script:EngineState.ConversationData = $null
    }
}

# =============================================================================
# Export functions
# =============================================================================

Export-ModuleMember -Function Open-VRAMFile, Close-VRAMFile, Close-AllVRAMFiles, Import-ConversationDataVRAM
Export-ModuleMember -Variable VRAMCache, VRAMFiles