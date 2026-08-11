@echo off
echo Starting Secure Echoes of Tomorrow Dashboard...

:: Install dependencies if they don't exist
IF NOT EXIST "node_modules\cookie-parser" (
    echo Installing security modules...
    npm install express cookie-parser --no-save
)

:: Start the server in the background
start /B node server.js >nul 2>&1

:: Wait for server to boot
timeout /t 2 /nobreak >nul

echo Opening Dashboard...
start http://127.0.0.1:5000/dashboard.html
