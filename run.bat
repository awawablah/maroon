@echo off
setlocal

echo [INFO] Compiling TypeScript...
call npx tsc

if %errorlevel% neq 0 (
    echo [ERROR] TypeScript compilation failed.
    exit /b %errorlevel%
)

echo [INFO] Starting the bot...
node --trace-warnings dist/bot.js

endlocal
