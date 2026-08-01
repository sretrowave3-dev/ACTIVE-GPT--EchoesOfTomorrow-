<#
.SYNOPSIS
    Generates a heavy (≈100MB) narrator_data.json file by expanding entries.
.DESCRIPTION
    Reads a base narrator_data.json (if exists) and multiplies arrays by repetition
    with random variations to reach a large file size.
.PARAMETER OutputPath
    Path where the heavy JSON will be saved (default: narrator_data_heavy.json)
.PARAMETER TargetSizeMB
    Approximate target file size in MB (default: 100)
#>

param(
    [string]$OutputPath = "narrator_data_heavy.json",
    [int]$TargetSizeMB = 100
)

Write-Host "Generating heavy narrator JSON..." -ForegroundColor Cyan

# Load base data (if exists)
$baseFile = Join-Path $PSScriptRoot "narrator_data.json"
if (Test-Path $baseFile) {
    Write-Host "  Loading base narrator_data.json..." -ForegroundColor Gray
    $baseJson = Get-Content $baseFile -Raw -Encoding UTF8 | ConvertFrom-Json
} else {
    Write-Host "  Base file not found. Creating minimal structure..." -ForegroundColor Yellow
    $baseJson = [PSCustomObject]@{
        intro_phrases = @("Loading file for analysis.")
        extension_narratives = @{ default = "Generic file type detected." }
        size_descriptions = @{ tiny = "Tiny file." }
        trivia_database = @{ default = @("Files store data.") }
        outro_phrases = @("Analysis complete.")
    }
}

# Helper to expand an array
function Expand-Array {
    param(
        [object[]]$Original,
        [int]$TargetCount
    )
    $result = @()
    $index = 0
    while ($result.Count -lt $TargetCount) {
        foreach ($item in $Original) {
            $variant = "$item [v$index]"
            $result += $variant
            $index++
            if ($result.Count -ge $TargetCount) { break }
        }
    }
    return $result
}

Write-Host "  Expanding intro_phrases to 10,000 entries..." -ForegroundColor Gray
$expandedIntro = Expand-Array -Original $baseJson.intro_phrases -TargetCount 10000

Write-Host "  Expanding extension_narratives..." -ForegroundColor Gray
$newExt = @{}
foreach ($key in $baseJson.extension_narratives.PSObject.Properties.Name) {
    $baseText = $baseJson.extension_narratives.$key
    $expanded = ""
    for ($i = 0; $i -lt 5000; $i++) {
        $variant = "$baseText (variant $i)"
        $expanded += $variant + " "
    }
    $newExt[$key] = $expanded.Trim()
}
if (-not $newExt.ContainsKey("default")) {
    $newExt["default"] = ("Default extension description. " * 1000)
}

Write-Host "  Expanding size_descriptions..." -ForegroundColor Gray
$newSize = @{}
foreach ($key in $baseJson.size_descriptions.PSObject.Properties.Name) {
    $baseText = $baseJson.size_descriptions.$key
    $newSize[$key] = "$baseText " * 100
}

Write-Host "  Expanding trivia_database..." -ForegroundColor Gray
$newTrivia = @{}
foreach ($key in $baseJson.trivia_database.PSObject.Properties.Name) {
    $baseList = $baseJson.trivia_database.$key
    $expandedList = @()
    $count = 0
    while ($expandedList.Count -lt 2000) {
        foreach ($item in $baseList) {
            $newItem = "$item (fact $count)"
            $expandedList += $newItem
            $count++
            if ($expandedList.Count -ge 2000) { break }
        }
    }
    $newTrivia[$key] = $expandedList
}

Write-Host "  Expanding outro_phrases to 5,000 entries..." -ForegroundColor Gray
$expandedOutro = Expand-Array -Original $baseJson.outro_phrases -TargetCount 5000

Write-Host "  Building final JSON object..." -ForegroundColor Gray
$heavy = [PSCustomObject]@{
    intro_phrases        = $expandedIntro
    extension_narratives = $newExt
    size_descriptions    = $newSize
    trivia_database      = $newTrivia
    outro_phrases        = $expandedOutro
}

Write-Host "  Converting to JSON..." -ForegroundColor Gray
$json = $heavy | ConvertTo-Json -Depth 10

Write-Host "  Saving to $OutputPath..." -ForegroundColor Gray
$json | Out-File -FilePath $OutputPath -Encoding UTF8

$fileSize = (Get-Item $OutputPath).Length / 1MB
Write-Host "Done! Generated heavy JSON: $OutputPath ($([math]::Round($fileSize,2)) MB)" -ForegroundColor Green