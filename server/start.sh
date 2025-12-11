#!/bin/bash
# Startup script for PremiumHatStore FastAPI Backend (Linux/Mac)

echo "========================================"
echo " PremiumHatStore FastAPI Backend"
echo "========================================"
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "[ERROR] Python 3 is not installed"
    echo "Please install Python 3.8 or higher"
    exit 1
fi

echo "[OK] Python is installed"
echo ""

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "[INFO] Creating virtual environment..."
    python3 -m venv venv
    if [ $? -ne 0 ]; then
        echo "[ERROR] Failed to create virtual environment"
        exit 1
    fi
    echo "[OK] Virtual environment created"
    echo ""
fi

# Activate virtual environment
echo "[INFO] Activating virtual environment..."
source venv/bin/activate
if [ $? -ne 0 ]; then
    echo "[ERROR] Failed to activate virtual environment"
    exit 1
fi

echo "[OK] Virtual environment activated"
echo ""

# Install dependencies
echo "[INFO] Installing dependencies..."
pip install --upgrade pip
pip install -r requirements.txt
if [ $? -ne 0 ]; then
    echo "[ERROR] Failed to install dependencies"
    exit 1
fi

echo "[OK] Dependencies installed"
echo ""

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "[WARNING] .env file not found!"
    echo ""
    echo "Please create a .env file with your configuration."
    echo "You can copy .env.example and fill in your values:"
    echo ""
    echo "    cp .env.example .env"
    echo ""
    echo "Required variables:"
    echo "  - TELEGRAM_BOT_TOKEN"
    echo "  - CHANNEL_ID"
    echo "  - TELEGRAM_WEBHOOK_SECRET (optional but recommended)"
    echo ""
    
    # Check if .env.example exists
    if [ -f ".env.example" ]; then
        read -p "Do you want to copy .env.example to .env now? (y/n) " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            cp .env.example .env
            echo "[OK] .env file created. Please edit it with your configuration."
            echo ""
        fi
    fi
fi

# Check if mapping.json exists
if [ ! -f "mapping.json" ]; then
    echo "[WARNING] mapping.json not found!"
    echo ""
    
    # Check if source mapping exists
    if [ -f "../PremiumHatStore/server/maping.json" ]; then
        echo "[INFO] Found maping.json in PremiumHatStore/server/"
        read -p "Do you want to copy it? (y/n) " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            cp ../PremiumHatStore/server/maping.json mapping.json
            echo "[OK] mapping.json copied"
            echo ""
        fi
    else
        echo "Please ensure mapping.json exists with 64 dice value mappings."
        echo "You can copy it from PremiumHatStore/server/maping.json"
        echo ""
    fi
fi

# Start the server
echo "========================================"
echo " Starting FastAPI Server"
echo "========================================"
echo ""
echo "Server will start at: http://localhost:5174"
echo "API Documentation: http://localhost:5174/docs"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

python3 main.py
