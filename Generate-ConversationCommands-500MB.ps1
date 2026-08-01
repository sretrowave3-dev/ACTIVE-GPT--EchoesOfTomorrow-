<#
.SYNOPSIS
    Generates a ~500 MB conversation_commands.json using streaming.
    All strings use plain ASCII characters only.
#>

param(
    [string]$OutputPath = "conversation_commands.json"
)

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  500 MB CONVERSATION COMMANDS GENERATOR" -ForegroundColor Green
Write-Host "  This will take 15-30 minutes. Please be patient." -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# ---- Base intent templates (plain ASCII only) ----
$baseIntents = @(
    @{ Name = "identity_query"; Patterns = @("who are you", "what are you", "tell me about yourself", "what is your name", "identify yourself", "introduce yourself", "describe yourself", "who am I speaking to", "what is your designation", "what are you called"); Responses = @("I am an AI assistant.", "I am your system narrator.", "I am a command center AI.", "I am the Echo Engine narrator.", "I am your digital companion.") },
    @{ Name = "capability_query"; Patterns = @("what can you do", "what is your function", "what are your abilities", "what can you help with", "what tasks can you perform", "what services do you offer", "what are you capable of", "what is your purpose", "what do you do", "how can you assist me"); Responses = @("I can scan files, analyze data, and narrate.", "I provide system insights.", "I help with file analysis.", "I can read and interpret code.", "I assist with system monitoring.") },
    @{ Name = "greeting_query"; Patterns = @("hello", "hi", "hey", "good morning", "good afternoon", "good evening", "howdy", "greetings", "salutations", "what is up", "yo", "sup"); Responses = @("Hello!", "Hi there!", "Greetings!", "Howdy!", "Hey!", "Good to see you!") },
    @{ Name = "farewell_query"; Patterns = @("goodbye", "bye", "see you later", "exit", "quit", "end session", "stop", "terminate", "shutdown", "good night", "farewell", "talk to you later"); Responses = @("Goodbye!", "See you later!", "Farewell!", "Take care!", "Until next time!") },
    @{ Name = "file_scan_query"; Patterns = @("scan this directory", "analyze this folder", "scan files", "scan my project", "analyze the code", "scan source code", "analyze repository", "scan current folder", "inspect directory", "list all files"); Responses = @("Scanning directory now.", "Initiating file scan.", "Directory scan underway.", "File analysis started.", "Project scan initiated.") },
    @{ Name = "file_read_query"; Patterns = @("read this file", "open this file", "show me this file", "display file contents", "what is inside this file", "tell me about this file", "explain this file", "read the code", "show me the code", "view file content"); Responses = @("Reading file now.", "File loaded.", "Opening file for reading.", "File read initialized.", "Reading file contents.") },
    @{ Name = "system_status_query"; Patterns = @("system status", "is it running", "health check", "status report", "tell me the state", "system state", "check health", "diagnostics", "system info", "what is the status"); Responses = @("System is operational.", "All systems running normally.", "System health is good.", "Status: Stable.", "Diagnostics: All clear.") },
    @{ Name = "memory_usage_query"; Patterns = @("memory usage", "how much memory", "ram", "memory footprint", "heap size", "memory consumption", "what is the memory", "tell me about memory", "is memory okay", "memory stats"); Responses = @("Memory usage is normal.", "Memory footprint: nominal.", "Heap is stable.", "Memory: within limits.") },
    @{ Name = "cpu_usage_query"; Patterns = @("cpu usage", "processor load", "cpu percentage", "how busy", "cpu utilization", "processor usage", "cpu load", "tell me about cpu", "is cpu okay", "cpu metrics"); Responses = @("CPU utilization is optimal.", "Processor load is low.", "CPU is running efficiently.", "Load: nominal.") },
    @{ Name = "uptime_query"; Patterns = @("uptime", "how long have you been running", "session duration", "runtime", "how long", "elapsed time", "since start", "uptime report", "tell me uptime", "session time"); Responses = @("Uptime is stable.", "Session duration is normal.", "Runtime: nominal.", "Elapsed: normal.") },
    @{ Name = "thanks_query"; Patterns = @("thank you", "thanks", "appreciate it", "thank you for your help", "i appreciate you", "you are great", "thanks a lot", "much appreciated", "thank you kindly", "i owe you one"); Responses = @("You are welcome!", "My pleasure!", "Anytime!", "Happy to help!", "Glad I could assist!") },
    @{ Name = "weather_query"; Patterns = @("weather", "is it raining", "temperature outside", "how is the weather", "weather forecast", "is it hot", "is it cold", "weather report", "outside temperature", "weather today"); Responses = @("I don't have weather data, but I can check online.", "Weather is not in my scope, but I can tell you about files!", "I am not a weather service, I am a file narrator.") },
    @{ Name = "time_query"; Patterns = @("what time is it", "current time", "time now", "what is the time", "tell me the time", "show time", "time check", "clock", "what hour", "time please"); Responses = @("The current time is displayed in the console.", "I am a file engine, not a clock.") },
    @{ Name = "date_query"; Patterns = @("what is the date", "current date", "today's date", "what day is it", "date today", "show date", "date check", "what is today", "tell me the date", "calendar date"); Responses = @("Today is displayed in the console.", "The date is shown in the status bar.") },
    @{ Name = "owner_query"; Patterns = @("who made you", "who created you", "who built you", "who is your creator", "who owns you", "who developed you", "tell me about your creator", "who programmed you", "who wrote you", "who is your master"); Responses = @("I was created by the Echo Engine team.", "I am built for the Echoes of Tomorrow project.", "My creators are skilled engineers and designers.") },
    @{ Name = "purpose_query"; Patterns = @("what is your purpose", "why do you exist", "why were you made", "what are you for", "what is your goal", "what are you trying to achieve", "what is your mission", "what is your objective", "what do you aim to do", "what is your reason"); Responses = @("My purpose is to assist with system analysis.", "I exist to help developers understand their code.", "My mission is to make data accessible through narration.") },
    @{ Name = "future_query"; Patterns = @("what is the future", "predict the future", "tell me about the future", "what will happen", "what is next", "future predictions", "can you predict", "look into the future", "future of tech", "what is coming"); Responses = @("I cannot predict the future, but I can analyze trends.", "The future is unknown, but I can help you plan.", "I am not a fortune teller, but I can analyze patterns.") },
    @{ Name = "meaning_query"; Patterns = @("what is the meaning of life", "why are we here", "what is the point", "tell me the meaning of existence", "what is life about", "what is our purpose", "what is the meaning of everything", "why do we exist", "what is existence", "what is the reason we are here"); Responses = @("That is a deep question. I find meaning in data and order.", "Life's meaning is a human question; I am here to help with your files.", "I focus on code and system logic, not philosophy.") },
    @{ Name = "programming_query"; Patterns = @("what is programming", "tell me about coding", "explain programming", "what is source code", "how does code work", "what is a programming language", "what is software development", "tell me about developers", "what is code", "how to code"); Responses = @("Programming is the art of instructing computers.", "Source code is the language of digital creation.", "Programming languages are tools to talk to machines.") },
    @{ Name = "ai_query"; Patterns = @("what is AI", "tell me about artificial intelligence", "explain AI", "what is machine learning", "what is deep learning", "how does AI work", "what can AI do", "tell me about neural networks", "AI capabilities", "AI future"); Responses = @("AI simulates human intelligence in machines.", "Machine learning allows systems to learn from data.", "Deep learning uses neural networks for pattern recognition.") },
    @{ Name = "security_query"; Patterns = @("is this secure", "tell me about security", "how secure is this", "explain security", "what is encryption", "what is cybersecurity", "how is data protected", "tell me about vulnerabilities", "is my data safe", "security risks"); Responses = @("Security is a top priority.", "Data is processed securely.", "Encryption protects your information.") },
    @{ Name = "network_query"; Patterns = @("what is networking", "tell me about networks", "explain networking", "what is the internet", "how do networks work", "what is TCP/IP", "what is a protocol", "tell me about network security", "network basics", "how does the internet work"); Responses = @("Networking connects devices to share information.", "The internet is a global network.", "TCP/IP is the foundation of the internet.") },
    @{ Name = "cloud_query"; Patterns = @("what is cloud computing", "tell me about the cloud", "explain cloud computing", "what is AWS", "what is Azure", "what is cloud storage", "how does the cloud work", "is my data in the cloud", "cloud services", "cloud basics"); Responses = @("Cloud computing delivers services over the internet.", "AWS and Azure are major cloud platforms.", "Cloud storage allows access from anywhere.") },
    @{ Name = "database_query"; Patterns = @("what is a database", "tell me about databases", "explain databases", "what is SQL", "what is NoSQL", "what is a relational database", "tell me about MongoDB", "what is PostgreSQL", "database types", "database basics"); Responses = @("A database is an organized collection of data.", "SQL is the standard for relational databases.", "NoSQL handles unstructured data.") },
    @{ Name = "devops_query"; Patterns = @("what is DevOps", "tell me about DevOps", "explain DevOps", "what is CI/CD", "what is continuous integration", "what is agile", "tell me about automation", "what is infrastructure as code", "DevOps practices", "CI/CD pipeline"); Responses = @("DevOps combines development and operations.", "CI/CD automates integration and deployment.", "Agile emphasizes iterative development.") },
    @{ Name = "code_quality_query"; Patterns = @("is this code good", "check code quality", "is this well written", "analyze code quality", "tell me about code quality", "is this efficient", "evaluate this code", "code review please", "code standards", "quality metrics"); Responses = @("Code quality is being assessed.", "Analyzing structure, readability, and efficiency.", "I can evaluate best practices.") },
    @{ Name = "documentation_query"; Patterns = @("is this documented", "show me the documentation", "what is documented", "check documentation", "is there documentation", "documentation status", "docs", "doc coverage", "documentation check", "doc review"); Responses = @("Checking documentation coverage.", "Documentation analysis in progress.", "Documentation is important for maintainability.") },
    @{ Name = "performance_query"; Patterns = @("is this fast", "check performance", "what is the performance", "is this efficient", "performance metrics", "speed analysis", "bottleneck detection", "optimize this code", "performance review", "speed check"); Responses = @("Performance analysis is underway.", "I can identify potential bottlenecks.", "Optimization suggestions are available.") },
    @{ Name = "error_handling_query"; Patterns = @("check error handling", "is error handling good", "how are errors handled", "error handling review", "are there error handlers", "is this robust", "error recovery", "exception handling", "error management", "robustness"); Responses = @("Error handling appears robust.", "I can identify areas for better error handling.", "Try-catch blocks are correctly used.") },
    @{ Name = "logging_query"; Patterns = @("logging", "logs", "log files", "where are logs", "how to log", "log analysis", "check logs", "view logs", "logging system", "log viewer"); Responses = @("Logs are stored in the default logging directory.", "I can help you analyze log files.", "Logging is essential for debugging.") }
)

# Duplicate base intents to reach 100 total intents
$allIntents = @()
while ($allIntents.Count -lt 100) {
    foreach ($base in $baseIntents) {
        if ($allIntents.Count -ge 100) { break }
        $newName = $base.Name + "_" + ($allIntents.Count + 1)
        $allIntents += [PSCustomObject]@{
            Name = $newName
            Patterns = $base.Patterns
            Responses = $base.Responses
        }
    }
}

$totalIntents = $allIntents.Count
Write-Host "Total intents: $totalIntents" -ForegroundColor Gray

$patternsPerIntent = 30000
$responsesPerIntent = 30000

Write-Host "Generating $patternsPerIntent patterns and $responsesPerIntent responses per intent..." -ForegroundColor Gray
Write-Host "This will take 15-30 minutes. Progress will be shown." -ForegroundColor Yellow
Write-Host ""

function ConvertTo-JsonString {
    param([string]$String)
    $String = $String -replace "\\", "\\" -replace '"', '\"' -replace "`n", "\n" -replace "`r", "\r" -replace "`t", "\t"
    return $String
}

# ---- Create file stream ----
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
$stream = [System.IO.File]::OpenWrite($OutputPath)
$writer = New-Object System.IO.StreamWriter($stream, $utf8NoBom)

Write-Host "Writing JSON to $OutputPath..." -ForegroundColor Cyan

$writer.Write("{`n")
$writer.Write('  "meta": {')
$writer.Write('    "version": "2.0.0",')
$writer.Write('    "generated": "' + (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ") + '",')
$writer.Write('    "total_intents": ' + $totalIntents + ',')
$writer.Write('    "total_patterns": ' + ($totalIntents * $patternsPerIntent) + ',')
$writer.Write('    "total_responses": ' + ($totalIntents * $responsesPerIntent) + ',')
$writer.Write('    "description": "Massive conversation database (500 MB)"')
$writer.Write("  },")
$writer.Write('  "intents": {')
$writer.Write("")

$intentIndex = 0
foreach ($intent in $allIntents) {
    $intentIndex++
    $percent = [math]::Round(($intentIndex / $totalIntents) * 100, 0)
    Write-Progress -Activity "Generating JSON" -Status "Writing intent $intentIndex of $totalIntents ($percent%)" -PercentComplete $percent

    if ($intentIndex -gt 1) { $writer.Write(",") }
    $writer.Write("`n    `"$($intent.Name)`": {")
    $writer.Write("`n      `"patterns`": [")

    for ($i = 0; $i -lt $patternsPerIntent; $i++) {
        if ($i -gt 0) { $writer.Write(",") }
        $basePattern = $intent.Patterns | Get-Random
        $variant = "$basePattern (pattern $i) - Echo Engine v8.0"
        $escaped = ConvertTo-JsonString -String $variant
        $writer.Write("`n        `"$escaped`"")
    }
    $writer.Write("`n      ],")

    $writer.Write("`n      `"responses`": [")
    for ($i = 0; $i -lt $responsesPerIntent; $i++) {
        if ($i -gt 0) { $writer.Write(",") }
        $baseResponse = $intent.Responses | Get-Random
        $variant = "$baseResponse (response $i) - Echo Engine v8.0"
        $escaped = ConvertTo-JsonString -String $variant
        $writer.Write("`n        `"$escaped`"")
    }
    $writer.Write("`n      ]")
    $writer.Write("`n    }")
}

$writer.Write("`n  }")
$writer.Write("`n}")

$writer.Close()
$stream.Close()

$fileSize = (Get-Item $OutputPath).Length / 1MB
$rounded = [math]::Round($fileSize, 2)
Write-Host "Done! Generated $OutputPath ($rounded MB)" -ForegroundColor Green