@echo off
setlocal EnableDelayedExpansion

:: ============================================================================
::  DIRECTORY INSPECTOR — with Error Tracking
:: ============================================================================

echo [1] Script started.
pause

set "NOCOLOR=0"
if /i "%~1"=="/nocolor" set "NOCOLOR=1"

:: ---- Try to enable ANSI colors ----
if "%NOCOLOR%"=="0" (
    for /f %%E in ('echo prompt $E^|cmd') do set "ESC=%%E"
)
if defined ESC (
    set "RST=%ESC%[0m"
    set "CYN=%ESC%[1;36m"
    set "MAG=%ESC%[1;35m"
    set "GRN=%ESC%[1;32m"
    set "YLW=%ESC%[1;33m"
    set "RED=%ESC%[1;31m"
    set "GRY=%ESC%[90m"
    set "WHT=%ESC%[1;37m"
) else (
    set "RST=" & set "CYN=" & set "MAG=" & set "GRN="
    set "YLW=" & set "RED=" & set "GRY=" & set "WHT="
)

echo [2] Colors set.
pause

set "ROOT=%cd%"
set "LINE=+----------------------------------------------------------------------------+"

:: ---- temp workspace ----
set "TMP=%TEMP%\dirinspect_%RANDOM%"
mkdir "%TMP%" >nul 2>&1
set "F_EMPTYDIR=%TMP%\emptydirs.txt"
set "F_EMPTYFILE=%TMP%\emptyfiles.txt"
set "F_CODEFILE=%TMP%\codefiles.txt"
set "REPORTFILE=%TMP%\DirectoryReport.txt"
type nul > "%F_EMPTYDIR%" 2>nul
type nul > "%F_EMPTYFILE%" 2>nul
type nul > "%F_CODEFILE%" 2>nul

echo [3] Temp files created at %TMP%
pause

set /a totalFolders=0
set /a emptyFolders=0
set /a totalFiles=0
set /a emptyFiles=0
set /a codeFiles=0
set /a totalLines=0
set "EXTLIST="

cls
echo %CYN%%LINE%
echo ^|                          D I R E C T O R Y   I N S P E C T O R             ^|
echo %LINE%%RST%
echo %GRY%  Root : %ROOT%%RST%
echo %GRY%  Scanning recursively, please wait...%RST%
echo.

echo [4] Starting folder scan...
pause

:: =========================================================================
:: SCAN FOLDERS
:: =========================================================================
for /f "delims=" %%D in ('dir /ad /b /s "%ROOT%" 2^>nul') do (
    set /a totalFolders+=1
    set "hasContent="
    for /f "delims=" %%Z in ('dir /b "%%D" 2^>nul') do set "hasContent=1"
    if not defined hasContent (
        set /a emptyFolders+=1
        set "rel=%%D"
        set "rel=!rel:%ROOT%\=!"
        echo !rel!>>"%F_EMPTYDIR%"
    )
)

echo [5] Folder scan complete. Found %totalFolders% folders.
pause

:: =========================================================================
:: SCAN FILES
:: =========================================================================
for /f "delims=" %%F in ('dir /a-d /b /s "%ROOT%" 2^>nul') do (
    set /a totalFiles+=1
    set "sz=%%~zF"
    set "rel=%%F"
    set "rel=!rel:%ROOT%\=!"

    if !sz! EQU 0 (
        set /a emptyFiles+=1
        echo !rel!>>"%F_EMPTYFILE%"
    ) else (
        set "lines=0"
        for /f %%L in ('find /c /v "" ^< "%%F" 2^>nul') do set "lines=%%L"
        set /a codeFiles+=1
        set /a totalLines+=lines

        set "ext=%%~xF"
        if "!ext!"=="" (
            set "extDisp=(none)"
            set "extKey=noext"
        ) else (
            set "extDisp=!ext!"
            set "extKey=!ext:~1!"
        )

        echo !extDisp!^|!sz!^|!lines!^|!rel!>>"%F_CODEFILE%"

        if not defined CNT_!extKey! (
            set "EXTLIST=!EXTLIST! !extKey!^|!extDisp!"
        )
        set /a "CNT_!extKey!+=1"
        set /a "LN_!extKey!+=lines"
    )
)

echo [6] File scan complete. Found %totalFiles% files.
pause

echo %GRY%  Scan complete.%RST%
echo.

:: =========================================================================
:: SUMMARY
:: =========================================================================
echo %CYN%%LINE%
echo ^|                                  S U M M A R Y                             ^|
echo %LINE%%RST%
call :printStat "Total folders scanned"    !totalFolders!
call :printStat "Empty folders found"      !emptyFolders!
call :printStat "Total files scanned"      !totalFiles!
call :printStat "Empty files found"        !emptyFiles!
call :printStat "Files with content"       !codeFiles!
call :printStat "Total lines (all files)"  !totalLines!
echo.

echo [7] Summary displayed.
pause

:: =========================================================================
:: EMPTY FOLDERS
:: =========================================================================
echo %RED%%LINE%
echo ^|                              E M P T Y   F O L D E R S                     ^|
echo %LINE%%RST%
if !emptyFolders! EQU 0 (
    echo %GRN%  [OK] No empty folders found.%RST%
) else (
    for /f "usebackq delims=" %%A in ("%F_EMPTYDIR%") do (
        echo %RED%  [EMPTY DIR]%RST%  %%A
    )
)
echo.

:: =========================================================================
:: EMPTY FILES
:: =========================================================================
echo %RED%%LINE%
echo ^|                               E M P T Y   F I L E S                        ^|
echo %LINE%%RST%
if !emptyFiles! EQU 0 (
    echo %GRN%  [OK] No empty files found.%RST%
) else (
    for /f "usebackq delims=" %%A in ("%F_EMPTYFILE%") do (
        echo %RED%  [EMPTY FILE]%RST% %%A
    )
)
echo.

:: =========================================================================
:: FILES WITH CONTENT
:: =========================================================================
echo %GRN%%LINE%
echo ^|                       F I L E S   W I T H   C O N T E N T                  ^|
echo %LINE%%RST%
if !codeFiles! EQU 0 (
    echo %YLW%  No files with content found.%RST%
) else (
    call :printTableHeader
    for /f "usebackq tokens=1,2,3* delims=|" %%A in ("%F_CODEFILE%") do (
        call :printFileRow "%%D" "%%A" "%%B" "%%C"
    )
)
echo.

:: =========================================================================
:: BREAKDOWN BY EXTENSION
:: =========================================================================
echo %MAG%%LINE%
echo ^|                       B R E A K D O W N   B Y   E X T E N S I O N          ^|
echo %LINE%%RST%
if not defined EXTLIST (
    echo %YLW%  No extension data available.%RST%
) else (
    call :padstr "EXTENSION" 14
    set "eh1=!PAD!"
    call :padstr "FILES" 10
    set "eh2=!PAD!"
    echo %WHT%  !eh1!!eh2!LINES%RST%
    echo %GRY%  --------------------------------------------------------------------%RST%
    for %%X in (!EXTLIST!) do (
        for /f "tokens=1,2 delims=|" %%K in ("%%X") do (
            call :padstr "%%L" 14
            set "ec1=!PAD!"
            call :padstr "!CNT_%%K!" 10
            set "ec2=!PAD!"
            echo %MAG%  !ec1!!ec2!!LN_%%K!%RST%
        )
    )
)
echo.
echo %CYN%%LINE%%RST%
echo %GRY%  Finished scanning "%ROOT%"%RST%
echo.

echo [8] Results displayed.
pause

:: =========================================================================
:: BUILD REPORT FILE
:: =========================================================================
call :BuildReportFile

echo [9] Report built.
pause

:: =========================================================================
:: OPTIONS MENU
:: =========================================================================
:MENU
echo %CYN%%LINE%
echo ^|                                  O P T I O N S                             ^|
echo %LINE%%RST%
echo %WHT%   [1]%RST% View the report again on screen
echo %WHT%   [2]%RST% Copy the report to clipboard
echo %WHT%   [3]%RST% Export the report as a .txt file
echo %WHT%   [4]%RST% Take a screenshot of this window
echo %WHT%   [5]%RST% Exit
echo.
set "choice="
set /p "choice=  Select an option (1-5): "

if "%choice%"=="1" goto VIEW_REPORT
if "%choice%"=="2" goto COPY_REPORT
if "%choice%"=="3" goto EXPORT_REPORT
if "%choice%"=="4" goto SCREENSHOT
if "%choice%"=="5" goto CLEANUP

echo %RED%  Invalid choice, please pick 1-5.%RST%
echo.
goto MENU

:VIEW_REPORT
cls
type "%REPORTFILE%"
echo.
pause
echo.
goto MENU

:COPY_REPORT
clip < "%REPORTFILE%"
echo %GRN%  [OK] Report copied to clipboard.%RST%
echo.
goto MENU

:EXPORT_REPORT
set "outname=DirectoryReport_%RANDOM%.txt"
copy /y "%REPORTFILE%" "%~dp0!outname!" >nul
echo %GRN%  [OK] Report exported to: %~dp0!outname!%RST%
echo.
goto MENU

:SCREENSHOT
set "shotfile=%~dp0Report_Screenshot_%RANDOM%.png"
echo %GRY%  Capturing screenshot in 2 seconds - bring this window to front...%RST%
powershell -NoProfile -Command "Start-Sleep -Seconds 2; Add-Type -AssemblyName System.Windows.Forms,System.Drawing; $b=[System.Windows.Forms.SystemInformation]::VirtualScreen; $bmp=New-Object System.Drawing.Bitmap $b.Width,$b.Height; $g=[System.Drawing.Graphics]::FromImage($bmp); $g.CopyFromScreen($b.Left,$b.Top,0,0,$bmp.Size); $bmp.Save('%shotfile%'); $g.Dispose(); $bmp.Dispose();" 2>nul
if exist "%shotfile%" (
    echo %GRN%  [OK] Screenshot saved to: %shotfile%%RST%
) else (
    echo %RED%  [FAIL] Screenshot could not be taken.%RST%
)
echo.
goto MENU

:CLEANUP
rd /s /q "%TMP%" >nul 2>&1
echo.
echo %GRY%  Temporary files cleaned up.%RST%
echo %GRY%  Press any key to exit...%RST%
pause >nul
endlocal
goto :EOF

:: =========================================================================
:: SUBROUTINES
:: =========================================================================

:BuildReportFile
(
echo ================================================================================
echo                        DIRECTORY INSPECTOR REPORT
echo ================================================================================
echo Root scanned : %ROOT%
echo Generated    : %date% %time%
echo.
echo --------------------------------------------------------------------------
echo SUMMARY
echo --------------------------------------------------------------------------
echo Total folders scanned    : %totalFolders%
echo Empty folders found      : %emptyFolders%
echo Total files scanned      : %totalFiles%
echo Empty files found        : %emptyFiles%
echo Files with content       : %codeFiles%
echo Total lines ^(all files^) : %totalLines%
echo.
echo --------------------------------------------------------------------------
echo EMPTY FOLDERS
echo --------------------------------------------------------------------------
) >> "%REPORTFILE%"

if !emptyFolders! EQU 0 (
    echo No empty folders found.>>"%REPORTFILE%"
) else (
    for /f "usebackq delims=" %%A in ("%F_EMPTYDIR%") do echo [EMPTY DIR]  %%A>>"%REPORTFILE%"
)

(
echo.
echo --------------------------------------------------------------------------
echo EMPTY FILES
echo --------------------------------------------------------------------------
) >> "%REPORTFILE%"

if !emptyFiles! EQU 0 (
    echo No empty files found.>>"%REPORTFILE%"
) else (
    for /f "usebackq delims=" %%A in ("%F_EMPTYFILE%") do echo [EMPTY FILE] %%A>>"%REPORTFILE%"
)

(
echo.
echo --------------------------------------------------------------------------
echo FILES WITH CONTENT
echo --------------------------------------------------------------------------
) >> "%REPORTFILE%"

if !codeFiles! EQU 0 (
    echo No files with content found.>>"%REPORTFILE%"
) else (
    for /f "usebackq tokens=1,2,3* delims=|" %%A in ("%F_CODEFILE%") do (
        call :humanSize "%%B"
        echo   %%D  ^|  ext:%%A  ^|  size:!HSIZE!  ^|  lines:%%C>>"%REPORTFILE%"
    )
)

(
echo.
echo --------------------------------------------------------------------------
echo BREAKDOWN BY EXTENSION
echo --------------------------------------------------------------------------
) >> "%REPORTFILE%"

if not defined EXTLIST (
    echo No extension data.>>"%REPORTFILE%"
) else (
    for %%X in (!EXTLIST!) do (
        for /f "tokens=1,2 delims=|" %%K in ("%%X") do (
            echo   %%L  -  files: !CNT_%%K!   lines: !LN_%%K!>>"%REPORTFILE%"
        )
    )
)

(
echo.
echo ================================================================================
echo End of report.
) >> "%REPORTFILE%"
goto :eof

:printStat
call :padstr "%~1" 32
echo %WHT%  !PAD!: %CYN%%~2%RST%
goto :eof

:printTableHeader
call :padstr "FILE PATH" 50
set "h1=!PAD!"
call :padstr "EXT" 9
set "h2=!PAD!"
call :padstr "SIZE" 10
set "h3=!PAD!"
echo %WHT%  !h1!!h2!!h3!LINES%RST%
echo %GRY%  --------------------------------------------------------------------------%RST%
goto :eof

:printFileRow
set "p=%~1"
set "xt=%~2"
set "bz=%~3"
set "ln=%~4"

call :humanSize "%bz%"
set "hsz=!HSIZE!"

call :padstr "%p%" 50
set "c1=!PAD!"
call :padstr "%xt%" 9
set "c2=!PAD!"
call :padstr "%hsz%" 10
set "c3=!PAD!"

echo %GRN%  !c1!%GRY%!c2!%YLW%!c3!%CYN%%ln%%RST%
goto :eof

:humanSize
setlocal
set /a b=%~1
if !b! GEQ 1048576 (
    set /a mb=!b!/1048576
    set "res=!mb! MB"
) else if !b! GEQ 1024 (
    set /a kb=!b!/1024
    set "res=!kb! KB"
) else (
    set "res=!b! B"
)
endlocal & set "HSIZE=%res%"
goto :eof

:padstr
setlocal
set "s=%~1"
set "w=%~2"
set "s=!s!                                                                                  "
set "s=!s:~0,%w%!"
endlocal & set "PAD=%s%"
goto :eof