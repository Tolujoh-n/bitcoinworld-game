@echo off
echo 🎮 Starting BitcoinWorld Game Servers...
echo.

echo 📦 Installing dependencies...
call npm install
cd backend
call npm install
cd ..

echo.
echo 🔧 Creating environment file...
if not exist "backend\.env" (
    echo # MongoDB Connection > backend\.env
    echo MONGO_URI=mongodb://localhost:27017/bitcoinworld-game >> backend\.env
    echo. >> backend\.env
    echo # JWT Secret >> backend\.env
    echo JWT_SECRET=your-super-secret-jwt-key-change-this-in-production >> backend\.env
    echo. >> backend\.env
    echo # Server Port >> backend\.env
    echo PORT=5000 >> backend\.env
    echo. >> backend\.env
    echo # CORS Origins >> backend\.env
    echo CORS_ORIGIN=http://localhost:3000 >> backend\.env
    echo ✅ Created backend/.env file
) else (
    echo ℹ️  backend/.env file already exists
)

echo.
echo 🚀 Starting servers...
echo.
echo Starting backend server...
start "BitcoinWorld Backend" cmd /k "cd backend && npm run dev"

echo.
echo Starting frontend server...
start "BitcoinWorld Frontend" cmd /k "npm start"

echo.
echo ✅ Servers are starting up!
echo 🌐 Frontend: http://localhost:3000
echo 🔌 Backend API: http://localhost:5000
echo.
echo 📋 Make sure MongoDB is running before playing!
echo.
pause
