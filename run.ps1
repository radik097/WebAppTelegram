# Adjust the paths and commands below to match your project structure

# Start the Server (Backend)
Write-Host "Starting Server..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd server; npm start"

# Start the Frontend
Write-Host "Starting Frontend..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm start"

Write-Host "Both services are starting in new windows." -ForegroundColor Yellow