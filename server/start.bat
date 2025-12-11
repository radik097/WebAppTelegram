@echo off
REM Startup script for PremiumHatStore FastAPI Backend (Windows)

echo ========================================
echo  PremiumHatStore FastAPI Backend
echo ========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed or not in PATH
    echo Please install Python 3.8 or higher from https://www.python.org/
    pause
    exit /b 1
)

echo [OK] Python is installed
echo.

REM Check if virtual environment exists
if not exist "venv\" (
    echo [INFO] Creating virtual environment...
    python -m venv venv
    if errorlevel 1 (
        echo [ERROR] Failed to create virtual environment
        pause
        exit /b 1
    )
    echo [OK] Virtual environment created
    echo.
)

REM Activate virtual environment
echo [INFO] Activating virtual environment...
call venv\Scripts\activate.bat
if errorlevel 1 (
    echo [ERROR] Failed to activate virtual environment
    pause
    exit /b 1
)

echo [OK] Virtual environment activated
echo.

REM Install dependencies
echo [INFO] Installing dependencies...
python -m pip install --upgrade pip
pip install -r requirements.txt
if errorlevel 1 (
    echo [ERROR] Failed to install dependencies
    pause
    exit /b 1
)

echo [OK] Dependencies installed
echo.

REM Check if .env exists
if not exist ".env" (
    echo [WARNING] .env file not found!
    echo.
    echo Please create a .env file with your configuration.
    echo You can copy .env.example and fill in your values:
    echo.
    echo     copy .env.example .env
    echo.
    echo Required variables:
    echo   - TELEGRAM_BOT_TOKEN
    echo   - CHANNEL_ID
    echo   - TELEGRAM_WEBHOOK_SECRET (optional but recommended)
    echo.
    
    REM Check if .env.example exists
    if exist ".env.example" (
        choice /C YN /M "Do you want to copy .env.example to .env now"
        if errorlevel 2 goto skipEnv
        if errorlevel 1 (
            copy .env.example .env
            echo.
            echo [OK] .env file created. Please edit it with your configuration.
            echo.
            notepad .env
        )
    )
)

:skipEnv

REM Check if mapping.json exists
if not exist "mapping.json" (
    echo [WARNING] mapping.json not found!
    echo.
    
    REM Check if source mapping exists
    if exist "..\PremiumHatStore\server\maping.json" (
        echo [INFO] Found maping.json in PremiumHatStore\server\
        choice /C YN /M "Do you want to copy it"
        if errorlevel 2 goto skipMapping
        if errorlevel 1 (
            copy ..\PremiumHatStore\server\maping.json mapping.json
            echo [OK] mapping.json copied
            echo.
        )
    ) else (
        echo Please ensure mapping.json exists with 64 dice value mappings.
        echo You can copy it from PremiumHatStore\server\maping.json
        echo.
    )
)

:skipMapping

REM Start the server
echo ========================================
echo  Starting FastAPI Server
echo ========================================
echo.
echo Server will start at: http://localhost:5174
echo API Documentation: http://localhost:5174/docs
echo.
echo Press Ctrl+C to stop the server
echo.

python main.py

pause
