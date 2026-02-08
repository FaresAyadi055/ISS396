@echo off
REM Quick Start Testing Script for Windows
REM Run with: quick-start.bat

setlocal enabledelayedexpansion

cls
echo.
echo ========================================
echo ISS396 - Agricultural Diagnostic App
echo     Quick Start ^& Testing Script
echo ========================================
echo.

REM ============================================
REM Check Prerequisites
REM ============================================
echo. ^|[92m[0m Checking prerequisites...
echo.

where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo. [91m[0m Node.js is not installed
    echo    Please install Node.js 18+ from https://nodejs.org/
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo. [92m[0m Node.js %NODE_VERSION%

where mongosh >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo. [93m[0m MongoDB Shell not found
    echo    Install with: npm install -g mongosh
) else (
    echo. [92m[0m MongoDB Shell installed
)

echo.

REM ============================================
REM STEP 1: Setup Backend
REM ============================================
echo. [94m--- STEP 1: Backend Setup ---
echo.

echo. Installing backend dependencies...
cd web
call npm install

echo. [92m[0m Backend dependencies installed
echo.

REM Check for .env.local
if not exist .env.local (
    echo. [93m[0m .env.local not found
    echo    Creating .env.local from .env.example...
    copy .env.example .env.local >nul
    echo. [93m[0m IMPORTANT: Edit .env.local with your MongoDB URI
    echo.
)

echo.

REM ============================================
REM STEP 2: MongoDB Setup
REM ============================================
echo. [94m--- STEP 2: MongoDB Setup ---
echo.

echo. Make sure MongoDB is running!
echo.
set /p setupdb=Run database seed script now? (y/n): 

if /i "%setupdb%"=="y" (
    echo. Running database seed script...
    if exist scripts\seed-database.js (
        node scripts\seed-database.js
    ) else (
        echo. [91m[0m Seed script not found
    )
) else (
    echo. [93m[0m Skipping database seed
    echo. Run later with: node web\scripts\seed-database.js
)

echo.

REM ============================================
REM STEP 3: Start Backend Server
REM ============================================
echo. [94m--- STEP 3: Start Backend ---
echo.
echo. Starting Next.js development server...
echo. URL: http://localhost:3000
echo. Login: http://localhost:3000/login
echo.
echo. Starting server...

call npm run dev

REM ============================================
REM If we get here, process was stopped
REM ============================================
echo.
echo. Server stopped
echo.
pause
