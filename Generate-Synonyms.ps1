<#
.SYNOPSIS
    Generates a massive synonyms.json file (~500 MB) with artificial synonym mappings.
.DESCRIPTION
    Creates a JSON object with 200,000 entries, each with 50 synonyms.
    Used to feed the Echo Engine narrator for vocabulary variation.
.PARAMETER OutputPath
    Path to save the generated JSON file.
#>

param(
    [string]$OutputPath = "synonyms.json"
)

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  500 MB SYNONYMS GENERATOR" -ForegroundColor Green
Write-Host "  This will take 10-20 minutes. Please be patient." -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# ---- Base synonym templates ----
$baseWords = @(
    "good", "bad", "happy", "sad", "big", "small", "fast", "slow", "hot", "cold",
    "bright", "dark", "light", "heavy", "soft", "hard", "smooth", "rough", "clear", "vague",
    "true", "false", "real", "fake", "strong", "weak", "deep", "shallow", "wide", "narrow",
    "high", "low", "long", "short", "thick", "thin", "rich", "poor", "young", "old",
    "new", "old", "modern", "ancient", "simple", "complex", "easy", "hard", "safe", "dangerous",
    "sure", "unsure", "known", "unknown", "open", "closed", "full", "empty", "alive", "dead",
    "awake", "asleep", "calm", "wild", "quiet", "loud", "peaceful", "violent", "kind", "cruel",
    "wise", "foolish", "brave", "cowardly", "proud", "humble", "gentle", "rough", "friendly", "hostile"
)

$synonymPool = @(
    "synonym", "alternative", "variant", "equivalent", "parallel", "analog", "substitute",
    "replacement", "option", "choice", "counterpart", "match", "twin", "clone", "copy"
)

# ---- Expand base words to 200,000 entries ----
$wordList = @()
$desiredCount = 200000
$multiplier = [math]::Ceiling($desiredCount / $baseWords.Count)
for ($i = 0; $i -lt $multiplier; $i++) {
    foreach ($word in $baseWords) {
        if ($wordList.Count -ge $desiredCount) { break }
        $wordList += "$word_$i"
    }
}

$totalEntries = $wordList.Count
Write-Host "Total entries: $totalEntries" -ForegroundColor Gray

# ---- Streaming JSON writer ----
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
$stream = [System.IO.File]::OpenWrite($OutputPath)
$writer = New-Object System.IO.StreamWriter($stream, $utf8NoBom)

Write-Host "Writing JSON to $OutputPath..." -ForegroundColor Cyan

$writer.Write("{`n")
$writer.Write('  "synonym_map": {')
$writer.Write("")

$entryIndex = 0
foreach ($word in $wordList) {
    $entryIndex++
    $percent = [math]::Round(($entryIndex / $totalEntries) * 100, 0)
    if ($entryIndex % 1000 -eq 0) {
        Write-Progress -Activity "Generating JSON" -Status "Writing entry $entryIndex of $totalEntries ($percent%)" -PercentComplete $percent
    }

    if ($entryIndex -gt 1) { $writer.Write(",") }
    $writer.Write("`n    `"$word`": [")

    # Generate 50 synonyms per word
    for ($i = 0; $i -lt 50; $i++) {
        if ($i -gt 0) { $writer.Write(",") }
        $baseSyn = $synonymPool | Get-Random
        $synonym = "${baseSyn}_${word}_$i"
        # Escape any double quotes
        $escaped = $synonym -replace '"', '\"'
        $writer.Write("`n      `"$escaped`"")
    }
    $writer.Write("`n    ]")
}

$writer.Write("`n  }")
$writer.Write("`n}")

$writer.Close()
$stream.Close()

$fileSize = (Get-Item $OutputPath).Length / 1MB
$rounded = [math]::Round($fileSize, 2)
Write-Host "Done! Generated $OutputPath ($rounded MB)" -ForegroundColor Green