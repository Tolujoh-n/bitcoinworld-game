# 🚀 BitcoinWorld Game - Setup Guide

## Quick Setup (5 minutes)

### Step 1: Prerequisites
Make sure you have these installed:
- **Node.js** (v16+) - [Download here](https://nodejs.org/)
- **MongoDB** - [Download here](https://www.mongodb.com/try/download/community)

### Step 2: Start MongoDB
```bash
# Windows
net start MongoDB

# macOS
brew services start mongodb-community

# Linux
sudo systemctl start mongod
```

### Step 3: Install Dependencies
```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..
```

### Step 4: Create Environment File
Create `backend/.env` file with this content:
```env
MONGO_URI=mongodb://localhost:27017/bitcoinworld-game
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
PORT=5000
CORS_ORIGIN=http://localhost:3000
```

### Step 5: Start the Application
Open **2 terminal windows**:

**Terminal 1 (Backend):**
```bash
cd backend
npm run dev
```

**Terminal 2 (Frontend):**
```bash
npm start
```

### Step 6: Play!
1. Open http://localhost:3000
2. Click "Login" and enter any wallet address (e.g., `0x123456789`)
3. Choose a game and start playing!

## 🎮 Game Instructions

### Snake Game 🐍
- Use arrow keys or WASD to move
- Eat coins to grow and earn points
- Don't hit walls or yourself!

### Falling Fruit 🍎
- Use arrow keys or WASD to move the baby
- Catch green fruits (good) and avoid red fruits (bad)
- Baby gets bigger as you eat good fruits

### Break Bricks 🧱
- Use left/right arrows or A/D to move the paddle
- Bounce the ball to break bricks
- Don't let the ball fall!

### Click Counter 🖱️
- Click the button as fast as possible for 10 seconds
- Each click = 5 points
- Wait 30 seconds between games

## 🆘 Troubleshooting

### "Cannot connect to MongoDB"
- Make sure MongoDB is running
- Check if the service is started: `net start MongoDB` (Windows)

### "npm start not working"
- Make sure you're in the root directory
- Run `npm install` first

### "Backend not responding"
- Check if backend is running on port 5000
- Make sure .env file exists in backend folder

### "Login not working"
- Make sure backend server is running
- Check browser console for errors

## 🎯 What You Can Do

1. **Login** with any wallet address
2. **Play 4 different games**
3. **Earn points** and track high scores
4. **View your stats** and game history
5. **Compete on leaderboards** with other players
6. **See global rankings** for each game

## 📱 Mobile Support

The app is fully responsive and works on:
- Desktop computers
- Tablets
- Mobile phones

Just open http://localhost:3000 on any device!

---

**Ready to play? Start the servers and have fun! 🎮**