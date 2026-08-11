# EchoSync Fast Multi-Threaded Build Script

if (!(Test-Path "obj")) {
    New-Item -ItemType Directory -Path "obj" | Out-Null
}

$CppFiles = Get-ChildItem -Path "src/*.cpp"
$ObjFiles = @()

foreach ($file in $CppFiles) {
    $obj = "obj/" + $file.BaseName + ".o"
    $ObjFiles += $obj

    Write-Host "Compiling $($file.Name)..." -ForegroundColor Yellow

    & g++ -std=c++23 -O2 -Iinclude -c $file.FullName -o $obj

    if ($LASTEXITCODE -ne 0) {
        Write-Host "Compilation failed for $($file.Name)" -ForegroundColor Red
        exit 1
    }
}

Write-Host "Linking EchoSync.exe..." -ForegroundColor Cyan

& g++ -std=c++23 $ObjFiles -o EchoSync.exe -lwinmm -lole32

if ($LASTEXITCODE -eq 0) {
    Write-Host "SUCCESS: EchoSync.exe built successfully!" -ForegroundColor Green
} else {
    Write-Host "Linking failed!" -ForegroundColor Red
}