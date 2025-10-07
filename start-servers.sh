#!/bin/bash

echo "🎮 Starting BitcoinWorld Game Servers..."
echo

echo "📦 Installing dependencies..."
npm install
cd backend
npm install
cd ..

echo
echo "🔧 Creating environment file..."
if [ ! -f "backend/.env" ]; then
    cat > backend/.env << EOF
# MongoDB Connection
MONGO_URI=mongodb://localhost:27017/bitcoinworld-game

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Server Port
PORT=5000

# CORS Origins
CORS_ORIGIN=http://localhost:3000
EOF
    echo "✅ Created backend/.env file"
else
    echo "ℹ️  backend/.env file already exists"
fi

echo
echo "🚀 Starting servers..."
echo

# Start backend server in background
echo "Starting backend server..."
cd backend
npm run dev &
BACKEND_PID=$!
cd ..

# Start frontend server
echo "Starting frontend server..."
npm start &
FRONTEND_PID=$!

echo
echo "✅ Servers are starting up!"
echo "🌐 Frontend: http://localhost:3000"
echo "🔌 Backend API: http://localhost:5000"
echo
echo "📋 Make sure MongoDB is running before playing!"
echo
echo "Press Ctrl+C to stop all servers"

# Wait for user to stop
wait
