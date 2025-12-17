# Adjust the paths and commands below to match your project structure

# Start the Backend (Node.js)
Write-Host "Starting Backend (PremiumHatStore)..." -ForegroundColor Green
Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd server; python main.py"

# Start the Frontend (Vite)
Write-Host "Starting Frontend (PremiumHatStore)..." -ForegroundColor Cyan
Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd PremiumHatStore; npm run dev"

Write-Host "PremiumHatStore services are launching in new windows..." -ForegroundColor Yellow