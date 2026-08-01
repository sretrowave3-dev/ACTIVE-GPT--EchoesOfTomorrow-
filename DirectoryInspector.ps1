<#
.SYNOPSIS
    Directory Inspector — Fast, Reliable & Pretty
.DESCRIPTION
    Scans a directory recursively and reports:
    - Empty folders
    - Empty files
    - Files with content (size, lines, extension)
    - Breakdown by extension
    - Summary
.PARAMETER Path
    The directory to scan (defaults to current directory)
.PARAMETER Music
    Path to an MP3 file to play in the background
.PARAMETER NoMusic
    Disables background music
.PARAMETER MaxDisplayRows
    Max rows shown per table on screen before truncating with a "N more" note
    (the exported .txt report always contains the full list).
.NOTES
    Background music runs the WMPlayer COM object on its own dedicated STA
    runspace, so it works regardless of whether the host console itself is
    STA or MTA (Windows PowerShell 5.1 vs. pwsh 7+).
#>

param(
    [string]$Path = (Get-Location).Path,
    [string]$Music,
    [switch]$NoMusic,
    [int]$MaxDisplayRows = 40
)

try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch {}

# -----------------------------------------------------------------------------
# VISUAL HELPERS
# -----------------------------------------------------------------------------

function Show-Banner {
    param([string]$Title)
    $width = 80
    $inner = $width - 4
    if ($Title.Length -gt $inner) { $Title = $Title.Substring(0, $inner) }
    $pad = [Math]::Max(0, $inner - $Title.Length)
    $left = [Math]::Floor($pad / 2)
    $right = $pad - $left
    Write-Host ""
    Write-Host ("  +" + ("=" * ($width - 4)) + "+") -ForegroundColor DarkCyan
    Write-Host ("  |" + (" " * $left) + $Title + (" " * $right) + "|") -ForegroundColor Cyan
    Write-Host ("  +" + ("=" * ($width - 4)) + "+") -ForegroundColor DarkCyan
}

function Write-SectionHeader {
    param([string]$Icon, [string]$Title, [string]$Color = 'Cyan')
    Write-Host ""
    Write-Host "  $Icon $Title" -ForegroundColor $Color
    Write-Host ("  " + ("-" * 76)) -ForegroundColor DarkGray
}

function Get-HumanSize {
    param([long]$Bytes)
    if ($Bytes -ge 1GB) { return "{0:N2} GB" -f ($Bytes / 1GB) }
    if ($Bytes -ge 1MB) { return "{0:N2} MB" -f ($Bytes / 1MB) }
    if ($Bytes -ge 1KB) { return "{0:N2} KB" -f ($Bytes / 1KB) }
    return "$Bytes B"
}

function Get-SizeColor {
    param([long]$Bytes)
    if ($Bytes -ge 50MB) { return 'Red' }
    if ($Bytes -ge 5MB)  { return 'Yellow' }
    if ($Bytes -ge 100KB) { return 'Green' }
    return 'DarkGray'
}

function Get-Extension {
    param([string]$FileName)
    $ext = [System.IO.Path]::GetExtension($FileName)
    if ([string]::IsNullOrEmpty($ext)) { return "(none)" }
    return $ext
}

function Get-TruncatedString {
    param([string]$Text, [int]$MaxLength)
    if ($null -eq $Text) { $Text = "" }
    if ($Text.Length -le $MaxLength) { return $Text.PadRight($MaxLength) }
    if ($MaxLength -le 3) { return $Text.Substring(0, $MaxLength) }
    return $Text.Substring(0, $MaxLength - 3) + "..."
}

function Write-BoxTable {
    param(
        [string[]]$Headers,
        [int[]]$Widths,
        [array]$Rows,
        [string]$BorderColor = 'DarkGray',
        [string]$HeaderColor = 'White',
        [string]$RowColor = 'Gray',
        [string[]]$RowColors  # optional, one entry per row - overrides RowColor when present
    )
    $top = "  +" + (($Widths | ForEach-Object { "-" * ($_ + 2) }) -join "+") + "+"
    $mid = "  +" + (($Widths | ForEach-Object { "-" * ($_ + 2) }) -join "+") + "+"
    $bot = "  +" + (($Widths | ForEach-Object { "-" * ($_ + 2) }) -join "+") + "+"

    Write-Host $top -ForegroundColor $BorderColor
    $headerCells = for ($c = 0; $c -lt $Headers.Count; $c++) { " " + (Get-TruncatedString $Headers[$c] $Widths[$c]) + " " }
    Write-Host ("  |" + ($headerCells -join "|") + "|") -ForegroundColor $HeaderColor
    Write-Host $mid -ForegroundColor $BorderColor
    for ($r = 0; $r -lt $Rows.Count; $r++) {
        $row = $Rows[$r]
        $cells = for ($c = 0; $c -lt $row.Count; $c++) { " " + (Get-TruncatedString ([string]$row[$c]) $Widths[$c]) + " " }
        $color = if ($RowColors -and $r -lt $RowColors.Count) { $RowColors[$r] } else { $RowColor }
        Write-Host ("  |" + ($cells -join "|") + "|") -ForegroundColor $color
    }
    Write-Host $bot -ForegroundColor $BorderColor
}

# -----------------------------------------------------------------------------
# FILE ANALYSIS HELPERS
# -----------------------------------------------------------------------------

function Test-BinaryFile {
    # Sample only the first few KB instead of reading the whole file - this is
    # what made scanning huge binaries (video/exe/etc.) so slow before.
    param([string]$FilePath, [int]$SampleSize = 8000)
    try {
        $stream = [System.IO.File]::OpenRead($FilePath)
        try {
            $len = [Math]::Min($SampleSize, $stream.Length)
            if ($len -le 0) { return $false }
            $buffer = New-Object byte[] $len
            $read = $stream.Read($buffer, 0, $len)
            for ($j = 0; $j -lt $read; $j++) {
                if ($buffer[$j] -eq 0) { return $true }
            }
            return $false
        } finally {
            $stream.Dispose()
        }
    } catch {
        return $true
    }
}

function Get-LineCount {
    param([string]$FilePath)
    $lines = 0
    try {
        $stream = [System.IO.File]::OpenRead($FilePath)
        try {
            $reader = New-Object System.IO.StreamReader($stream, [System.Text.Encoding]::UTF8, $true, 65536)
            try {
                while ($null -ne $reader.ReadLine()) { $lines++ }
            } finally {
                $reader.Dispose()
            }
        } finally {
            # stream is disposed via $reader.Dispose()
        }
    } catch {
        return 0
    }
    return $lines
}

# -----------------------------------------------------------------------------
# BACKGROUND MUSIC
# Tries VLC first (headless, no window) since that's commonly installed even
# when Windows Media Player isn't. Falls back to the WMP COM object (on its
# own dedicated STA runspace) only if VLC can't be found.
# -----------------------------------------------------------------------------

$script:musicProcess = $null
$script:musicPS = $null
$script:musicRS = $null

function Find-VlcPath {
    $candidates = @(
        (Join-Path $env:ProgramFiles "VideoLAN\VLC\vlc.exe")
    )
    if (${env:ProgramFiles(x86)}) {
        $candidates += (Join-Path ${env:ProgramFiles(x86)} "VideoLAN\VLC\vlc.exe")
    }
    foreach ($c in $candidates) {
        if ($c -and (Test-Path -LiteralPath $c)) { return $c }
    }
    $cmd = Get-Command 'vlc.exe' -ErrorAction SilentlyContinue
    if (-not $cmd) { $cmd = Get-Command 'vlc' -ErrorAction SilentlyContinue }
    if ($cmd) { return $cmd.Source }
    return $null
}

function Start-BackgroundMusic {
    param([string]$MusicFile)

    if (-not (Test-Path -LiteralPath $MusicFile)) {
        Write-Host "  [WARN] Music file not found: $MusicFile" -ForegroundColor Yellow
        return $false
    }

    $resolved = (Resolve-Path -LiteralPath $MusicFile).Path

    # --- Try 1: VLC, run headless via --intf dummy (no window at all) ------
    $vlcPath = Find-VlcPath
    if ($vlcPath) {
        try {
            $argString = '--intf dummy --loop --no-video-title-show "{0}"' -f $resolved
            $proc = Start-Process -FilePath $vlcPath -ArgumentList $argString -WindowStyle Hidden -PassThru
            $script:musicProcess = $proc
            Write-Host "  [OK] Playing via VLC: $(Split-Path -Leaf $resolved)" -ForegroundColor Green
            return $true
        } catch {
            Write-Host "  [WARN] VLC playback failed, trying another player: $($_.Exception.Message)" -ForegroundColor Yellow
        }
    }

    # --- Try 2: Windows Media Player COM object (needs WMP + an STA thread) -
    try {
        # WMPlayer's COM object needs an STA thread to work reliably. Rather
        # than requiring the caller to launch PowerShell with -sta (pwsh 7+
        # defaults to MTA, which silently breaks it), spin up a dedicated STA
        # runspace just for playback. This works from any host - IF WMP is
        # actually installed, which New-Object -ComObject will fail fast on
        # if it isn't.
        $rs = [System.Management.Automation.Runspaces.RunspaceFactory]::CreateRunspace()
        $rs.ApartmentState = [System.Threading.ApartmentState]::STA
        $rs.ThreadOptions = [System.Management.Automation.Runspaces.PSThreadOptions]::ReuseThread
        $rs.Open()

        $ps = [System.Management.Automation.PowerShell]::Create()
        $ps.Runspace = $rs
        [void]$ps.AddScript({
            param($path)
            $player = New-Object -ComObject WMPlayer.OCX
            $player.settings.autoStart = $true
            $player.settings.volume = 70
            try { $player.settings.setMode('loop', $true) } catch {}
            $player.URL = $path
            $player.controls.play()
            while ($true) { Start-Sleep -Milliseconds 500 }
        }).AddArgument($resolved)

        $handle = $ps.BeginInvoke()
        Start-Sleep -Milliseconds 300
        if ($ps.HadErrors) {
            $msg = ($ps.Streams.Error | Select-Object -First 1 -ExpandProperty Exception).Message
            throw $msg
        }

        $script:musicPS = $ps
        $script:musicRS = $rs
        Write-Host "  [OK] Playing via Windows Media Player: $(Split-Path -Leaf $resolved)" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "  [WARN] No usable media player found (checked VLC and Windows Media Player). Skipping music." -ForegroundColor Yellow
        return $false
    }
}

function Stop-BackgroundMusic {
    if ($script:musicProcess) {
        try {
            if (-not $script:musicProcess.HasExited) { Stop-Process -Id $script:musicProcess.Id -Force -ErrorAction SilentlyContinue }
        } catch {}
        $script:musicProcess = $null
    }
    if ($script:musicPS) {
        try { $script:musicPS.Stop() } catch {}
        try { $script:musicPS.Dispose() } catch {}
        $script:musicPS = $null
    }
    if ($script:musicRS) {
        try { $script:musicRS.Close() } catch {}
        try { $script:musicRS.Dispose() } catch {}
        $script:musicRS = $null
    }
}

# -----------------------------------------------------------------------------
# SCAN FUNCTION
# -----------------------------------------------------------------------------

function Invoke-DirectoryScan {
    param([string]$Root)

    # Normalize once so relative-path math below can never throw, even if the
    # caller passed a path with a trailing slash.
    $rootFull = (Resolve-Path -LiteralPath $Root).Path.TrimEnd('\', '/')

    $stats = @{
        TotalFolders = 0
        EmptyFolders = 0
        TotalFiles   = 0
        EmptyFiles   = 0
        CodeFiles    = 0
        TotalLines   = 0
        SkippedFiles = 0
    }

    $emptyDirs    = [System.Collections.Generic.List[string]]::new()
    $emptyFiles   = [System.Collections.Generic.List[string]]::new()
    $contentFiles = [System.Collections.Generic.List[object]]::new()
    $extCount     = @{}
    $extLines     = @{}

    Write-Host "  [1/2] Enumerating directory tree..." -ForegroundColor Gray

    # Single recursive pass instead of walking the tree twice, plus one extra
    # Get-ChildItem call PER folder just to test emptiness. That per-folder
    # call was the main performance killer on large trees (O(n^2)).
    $allItems = Get-ChildItem -LiteralPath $rootFull -Recurse -Force -ErrorAction SilentlyContinue

    $dirs  = [System.Collections.Generic.List[System.IO.DirectoryInfo]]::new()
    $files = [System.Collections.Generic.List[System.IO.FileInfo]]::new()
    $parentsWithChildren = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)

    foreach ($item in $allItems) {
        if ($item.PSIsContainer) {
            $dirs.Add($item)
            if ($item.Parent) { [void]$parentsWithChildren.Add($item.Parent.FullName) }
        } else {
            $files.Add($item)
            [void]$parentsWithChildren.Add($item.DirectoryName)
        }
    }

    $stats.TotalFolders = $dirs.Count
    foreach ($folder in $dirs) {
        if (-not $parentsWithChildren.Contains($folder.FullName)) {
            $stats.EmptyFolders++
            $rel = $folder.FullName.Substring($rootFull.Length).TrimStart('\', '/')
            $emptyDirs.Add($rel)
        }
    }
    Write-Host "  [OK] Found $($stats.TotalFolders) folders, $($stats.EmptyFolders) empty." -ForegroundColor Green

    Write-Host "  [2/2] Scanning files..." -ForegroundColor Gray

    $stats.TotalFiles = $files.Count
    $total = $files.Count
    $i = 0

    foreach ($file in $files) {
        $i++
        if ($total -gt 0 -and ($i % 25 -eq 0 -or $i -eq $total)) {
            Write-Progress -Activity "Scanning files" -Status "$i / $total" -PercentComplete (([double]$i / $total) * 100)
        }

        $rel = $file.FullName.Substring($rootFull.Length).TrimStart('\', '/')

        if ($file.Length -eq 0) {
            $stats.EmptyFiles++
            $emptyFiles.Add($rel)
            continue
        }

        $stats.CodeFiles++

        # Skip line-counting for binary files and very large files (>25MB) -
        # the old version read every byte of every file one line at a time.
        $lines = 0
        if ((Test-BinaryFile -FilePath $file.FullName) -or $file.Length -gt 25MB) {
            $stats.SkippedFiles++
        } else {
            $lines = Get-LineCount -FilePath $file.FullName
        }
        $stats.TotalLines += $lines

        $ext = Get-Extension -FileName $file.Name
        $extKey = if ($ext -eq "(none)") { "noext" } else { $ext.Substring(1) }

        $contentFiles.Add([PSCustomObject]@{
            Path      = $rel
            Extension = $ext
            Size      = $file.Length
            Lines     = $lines
        })

        if (-not $extCount.ContainsKey($extKey)) {
            $extCount[$extKey] = 0
            $extLines[$extKey] = 0
        }
        $extCount[$extKey]++
        $extLines[$extKey] += $lines
    }

    Write-Progress -Activity "Scanning files" -Completed
    Write-Host "  [OK] Found $($stats.TotalFiles) files, $($stats.CodeFiles) with content ($($stats.SkippedFiles) skipped as binary/large)." -ForegroundColor Green

    return @{
        Stats        = $stats
        EmptyDirs    = $emptyDirs
        EmptyFiles   = $emptyFiles
        ContentFiles = $contentFiles
        ExtCount     = $extCount
        ExtLines     = $extLines
    }
}

# -----------------------------------------------------------------------------
# SHOW REPORT
# -----------------------------------------------------------------------------

function Show-Report {
    param($Result, $Root, [int]$MaxDisplayRows = 40)

    $stats = $Result.Stats

    Show-Banner "SCAN RESULTS"

    # --- Summary -------------------------------------------------------
    Write-SectionHeader ">" "SUMMARY" "Cyan"
    $summaryRows = @(
        @("Folders scanned", $stats.TotalFolders)
        @("Empty folders", $stats.EmptyFolders)
        @("Files scanned", $stats.TotalFiles)
        @("Empty files", $stats.EmptyFiles)
        @("Files with content", $stats.CodeFiles)
        @("Skipped (binary/large)", $stats.SkippedFiles)
        @("Total lines", $stats.TotalLines)
    )
    if ($stats.ContainsKey('ElapsedSeconds')) {
        $summaryRows += , @("Scan duration", ("{0:N2}s" -f $stats.ElapsedSeconds))
    }
    foreach ($row in $summaryRows) {
        Write-Host ("    * {0,-26}" -f $row[0]) -ForegroundColor DarkGray -NoNewline
        Write-Host $row[1] -ForegroundColor White
    }

    # --- Empty folders ---------------------------------------------------
    Write-SectionHeader ">" "EMPTY FOLDERS" "Cyan"
    if ($Result.EmptyDirs.Count -eq 0) {
        Write-Host "    [OK] No empty folders found." -ForegroundColor Green
    } else {
        foreach ($dir in ($Result.EmptyDirs | Select-Object -First $MaxDisplayRows)) {
            Write-Host "    [EMPTY] $dir" -ForegroundColor Red
        }
        if ($Result.EmptyDirs.Count -gt $MaxDisplayRows) {
            Write-Host "    ... and $($Result.EmptyDirs.Count - $MaxDisplayRows) more (full list in exported report)" -ForegroundColor DarkGray
        }
    }

    # --- Empty files -------------------------------------------------------
    Write-SectionHeader ">" "EMPTY FILES" "Cyan"
    if ($Result.EmptyFiles.Count -eq 0) {
        Write-Host "    [OK] No empty files found." -ForegroundColor Green
    } else {
        foreach ($file in ($Result.EmptyFiles | Select-Object -First $MaxDisplayRows)) {
            Write-Host "    [EMPTY] $file" -ForegroundColor Red
        }
        if ($Result.EmptyFiles.Count -gt $MaxDisplayRows) {
            Write-Host "    ... and $($Result.EmptyFiles.Count - $MaxDisplayRows) more (full list in exported report)" -ForegroundColor DarkGray
        }
    }

    # --- Files with content --------------------------------------------
    Write-SectionHeader ">" "FILES WITH CONTENT" "Cyan"
    if ($Result.ContentFiles.Count -eq 0) {
        Write-Host "    No files with content found." -ForegroundColor Yellow
    } else {
        $sorted = $Result.ContentFiles | Sort-Object Path
        $shown = $sorted | Select-Object -First $MaxDisplayRows
        $rows = @()
        $rowColors = @()
        foreach ($f in $shown) {
            $rows += , @($f.Path, $f.Extension, (Get-HumanSize $f.Size), $f.Lines)
            $rowColors += (Get-SizeColor -Bytes $f.Size)
        }
        Write-BoxTable -Headers @("FILE PATH", "EXT", "SIZE", "LINES") -Widths @(48, 10, 10, 7) -Rows $rows -RowColors $rowColors
        if ($sorted.Count -gt $MaxDisplayRows) {
            Write-Host "    ... and $($sorted.Count - $MaxDisplayRows) more files (full list in exported report)" -ForegroundColor DarkGray
        }
    }

    # --- Breakdown by extension ------------------------------------------
    Write-SectionHeader ">" "BREAKDOWN BY EXTENSION" "Cyan"
    if ($Result.ExtCount.Keys.Count -eq 0) {
        Write-Host "    No extension data available." -ForegroundColor Yellow
    } else {
        $keys = $Result.ExtCount.Keys | Sort-Object
        $rows = foreach ($key in $keys) {
            $display = if ($key -eq "noext") { "(none)" } else { ".$key" }
            , @($display, $Result.ExtCount[$key], $Result.ExtLines[$key])
        }
        Write-BoxTable -Headers @("EXTENSION", "FILES", "LINES") -Widths @(14, 8, 10) -Rows $rows -RowColor 'Magenta'
    }

    Write-Host ""
    Write-Host ("  " + ("-" * 76)) -ForegroundColor DarkGray
    Write-Host "  Finished scanning $Root" -ForegroundColor Gray
    Write-Host ""
}

# -----------------------------------------------------------------------------
# EXPORT REPORT (plain text - kept ASCII-only for maximum portability)
# -----------------------------------------------------------------------------

function Export-Report {
    param($Result, $Root)

    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $outPath = Join-Path (Get-Location).Path "DirectoryReport_$timestamp.txt"

    $lines = [System.Collections.Generic.List[string]]::new()
    $lines.Add("=" * 80)
    $lines.Add("DIRECTORY INSPECTOR REPORT")
    $lines.Add("=" * 80)
    $lines.Add("Root scanned : $Root")
    $lines.Add("Generated    : $(Get-Date)")
    $lines.Add("")
    $lines.Add("SUMMARY")
    $lines.Add("Total folders scanned    : $($Result.Stats.TotalFolders)")
    $lines.Add("Empty folders found      : $($Result.Stats.EmptyFolders)")
    $lines.Add("Total files scanned      : $($Result.Stats.TotalFiles)")
    $lines.Add("Empty files found        : $($Result.Stats.EmptyFiles)")
    $lines.Add("Files with content       : $($Result.Stats.CodeFiles)")
    $lines.Add("Skipped (binary/large)   : $($Result.Stats.SkippedFiles)")
    $lines.Add("Total lines (all files)  : $($Result.Stats.TotalLines)")
    if ($Result.Stats.ContainsKey('ElapsedSeconds')) {
        $lines.Add(("Scan duration            : {0:N2}s" -f $Result.Stats.ElapsedSeconds))
    }
    $lines.Add("")
    $lines.Add("EMPTY FOLDERS")
    if ($Result.EmptyDirs.Count -eq 0) { $lines.Add("  No empty folders found.") }
    else { foreach ($d in $Result.EmptyDirs) { $lines.Add("  [EMPTY DIR] $d") } }
    $lines.Add("")
    $lines.Add("EMPTY FILES")
    if ($Result.EmptyFiles.Count -eq 0) { $lines.Add("  No empty files found.") }
    else { foreach ($f in $Result.EmptyFiles) { $lines.Add("  [EMPTY FILE] $f") } }
    $lines.Add("")
    $lines.Add("FILES WITH CONTENT")
    if ($Result.ContentFiles.Count -eq 0) { $lines.Add("  No files with content found.") }
    else {
        foreach ($file in ($Result.ContentFiles | Sort-Object Path)) {
            $size = Get-HumanSize $file.Size
            $lines.Add("  $($file.Path)  |  ext:$($file.Extension)  |  size:$size  |  lines:$($file.Lines)")
        }
    }
    $lines.Add("")
    $lines.Add("BREAKDOWN BY EXTENSION")
    if ($Result.ExtCount.Keys.Count -eq 0) { $lines.Add("  No extension data.") }
    else {
        foreach ($key in ($Result.ExtCount.Keys | Sort-Object)) {
            $display = if ($key -eq "noext") { "(none)" } else { ".$key" }
            $lines.Add("  $display  -  files: $($Result.ExtCount[$key])   lines: $($Result.ExtLines[$key])")
        }
    }
    $lines.Add("")
    $lines.Add("=" * 80)
    $lines.Add("End of report.")

    $lines | Set-Content -Path $outPath -Encoding UTF8
    Write-Host "  [OK] Report exported to: $outPath" -ForegroundColor Green
    return $outPath
}

# -----------------------------------------------------------------------------
# MAIN
# -----------------------------------------------------------------------------

try {
    Clear-Host

    Show-Banner "DIRECTORY INSPECTOR"

    if (-not (Test-Path -LiteralPath $Path -PathType Container)) {
        Write-Host "  [ERROR] Directory not found: $Path" -ForegroundColor Red
        exit 1
    }

    $Path = (Resolve-Path -LiteralPath $Path).Path
    Write-Host "  Root : $Path" -ForegroundColor Gray

    if ($Music -and -not $NoMusic) {
        Start-BackgroundMusic -MusicFile $Music
    } elseif (-not $NoMusic) {
        $scriptDir = if ($PSScriptRoot) { $PSScriptRoot } elseif ($MyInvocation.MyCommand.Path) { Split-Path -Parent $MyInvocation.MyCommand.Path } else { $null }
        if ($scriptDir) {
            $defaultMusic = Join-Path $scriptDir "bgmusic.mp3"
            if (Test-Path -LiteralPath $defaultMusic) {
                Start-BackgroundMusic -MusicFile $defaultMusic
            }
        }
    }

    Write-Host ""
    Write-Host "  Scanning recursively, please wait..." -ForegroundColor Gray
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    $result = Invoke-DirectoryScan -Root $Path
    $sw.Stop()
    $result.Stats.ElapsedSeconds = $sw.Elapsed.TotalSeconds

    Clear-Host
    Show-Report -Result $result -Root $Path -MaxDisplayRows $MaxDisplayRows

    $exportedFile = Export-Report -Result $result -Root $Path

    $menuChoice = $null
    do {
        Show-Banner "OPTIONS"
        Write-Host "    [1] View the report again on screen" -ForegroundColor White
        Write-Host "    [2] Copy the report to clipboard" -ForegroundColor White
        Write-Host "    [3] Export the report as a .txt file (again)" -ForegroundColor White
        Write-Host "    [4] Take a screenshot of this window" -ForegroundColor White
        Write-Host "    [5] Exit" -ForegroundColor White
        Write-Host ""
        $menuChoice = Read-Host "  Select an option (1-5)"

        switch ($menuChoice) {
            "1" {
                Clear-Host
                Show-Report -Result $result -Root $Path -MaxDisplayRows $MaxDisplayRows
            }
            "2" {
                try {
                    $content = Get-Content -Path $exportedFile -Raw
                    $content | Set-Clipboard
                    Write-Host "  [OK] Report copied to clipboard." -ForegroundColor Green
                } catch {
                    Write-Host "  [ERROR] Could not copy to clipboard: $($_.Exception.Message)" -ForegroundColor Red
                }
            }
            "3" {
                $newFile = Export-Report -Result $result -Root $Path
                Write-Host "  [OK] Report exported to: $newFile" -ForegroundColor Green
            }
            "4" {
                try {
                    Add-Type -AssemblyName System.Windows.Forms
                    Add-Type -AssemblyName System.Drawing
                    $screen = [System.Windows.Forms.SystemInformation]::VirtualScreen
                    $bmp = New-Object System.Drawing.Bitmap $screen.Width, $screen.Height
                    $gfx = [System.Drawing.Graphics]::FromImage($bmp)
                    $gfx.CopyFromScreen($screen.Left, $screen.Top, 0, 0, $bmp.Size)
                    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
                    $shotFile = Join-Path (Get-Location).Path "Screenshot_$timestamp.png"
                    $bmp.Save($shotFile)
                    $gfx.Dispose()
                    $bmp.Dispose()
                    Write-Host "  [OK] Screenshot saved to: $shotFile" -ForegroundColor Green
                } catch {
                    Write-Host "  [ERROR] Failed to capture screenshot: $($_.Exception.Message)" -ForegroundColor Red
                }
            }
            "5" {
                Write-Host "  Exiting..." -ForegroundColor Gray
            }
            default {
                Write-Host "  Invalid choice, please pick 1-5." -ForegroundColor Red
            }
        }
    } while ($menuChoice -ne "5")

} catch {
    Write-Host "  [ERROR] $_" -ForegroundColor Red
    Write-Host $_.ScriptStackTrace -ForegroundColor DarkGray
} finally {
    Stop-BackgroundMusic
    Write-Host ""
    Write-Host "  Press any key to exit..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}
