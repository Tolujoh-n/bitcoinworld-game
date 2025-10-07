# 🎮 BitcoinWorld Game Platform

A fully functional web-based gaming platform built with React, Node.js, and MongoDB. Players can compete in various games, earn points, and track their progress on leaderboards using wallet addresses for authentication.

## 🚀 Features

### 🎯 Games
- **🐍 Snake Game**: Control a snake to eat coins, grow longer, and avoid walls
- **🍎 Falling Fruit**: Catch good fruits while avoiding bad ones with a baby character
- **🧱 Break Bricks**: Use a paddle to bounce a ball and break all the bricks
- **🖱️ Click Counter**: Click as fast as possible within a 10-second timer

### 🏆 Platform Features
- **Wallet Authentication**: Login using only your wallet address (no passwords needed)
- **Personal Stats**: Track your game history, scores, and achievements
- **Global Leaderboard**: Compete with players worldwide
- **Real-time Scoring**: Instant score submission and leaderboard updates
- **Responsive Design**: Beautiful golden theme that works on all devices

## 🛠️ Technology Stack

### Frontend
- **React 18.2.0** - Modern React with hooks
- **Tailwind CSS** - Utility-first CSS framework
- **React Router 6** - Client-side routing
- **Axios** - HTTP client for API calls
- **Context API** - State management

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB object modeling
- **JWT** - JSON Web Tokens for authentication
- **CORS** - Cross-origin resource sharing

## 📋 Prerequisites

- Node.js (v16 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn package manager

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone <repository-url>
cd bitcoinworld-game
```

### 2. Install Dependencies

#### Frontend Dependencies
```bash
npm install
```

#### Backend Dependencies
```bash
cd backend
npm install
cd ..
```

### 3. Environment Setup

Create a `.env` file in the `backend` directory:
```env
# MongoDB Connection
MONGO_URI=mongodb://localhost:27017/bitcoinworld-game

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Server Port
PORT=5000

# CORS Origins
CORS_ORIGIN=http://localhost:3000
```

### 4. Start MongoDB
Make sure MongoDB is running on your system:
```bash
# On Windows
net start MongoDB

# On macOS/Linux
sudo systemctl start mongod
```

### 5. Start the Application

#### Start Backend Server
```bash
cd backend
npm run dev
```

#### Start Frontend Development Server
```bash
# In a new terminal
npm start
```

The application will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000

## 🎮 How to Play

1. **Login**: Enter any wallet address (e.g., `0x1234...5678`) to create an account
2. **Choose Game**: Browse the game list and select any of the 4 available games
3. **Play**: Follow the game-specific controls and try to achieve high scores
4. **Track Progress**: View your personal stats and see how you rank globally
5. **Compete**: Climb the leaderboards and become a BitcoinWorld champion!

## 🎯 Game Controls

### Snake Game 🐍
- **Movement**: Arrow Keys or WASD
- **Objective**: Eat coins to grow longer and earn 10 points per coin
- **Game Over**: Hitting walls or yourself

### Falling Fruit 🍎
- **Movement**: Arrow Keys or WASD
- **Objective**: Catch green fruits (10 points each), avoid red fruits
- **Game Over**: Getting touched by a red fruit

### Break Bricks 🧱
- **Movement**: Left/Right Arrow Keys or A/D
- **Objective**: Bounce ball to break bricks (10 points per brick)
- **Game Over**: Ball falling below the paddle

### Click Counter 🖱️
- **Action**: Click the button as fast as possible
- **Objective**: Earn 5 points per click in 10 seconds
- **Cooldown**: 30-second wait between games

## 📡 API Documentation

### Authentication Endpoints

#### `POST /api/auth/login`
Login or register with wallet address
```json
{
  "walletAddress": "0x1234...5678"
}
```

#### `GET /api/auth/verify`
Verify JWT token (protected route)

### Game Score Endpoints

#### `POST /api/scores/submit`
Submit a game score (protected route)
```json
{
  "gameType": "snake|fallingFruit|breakBricks|clickCounter",
  "score": 150,
  "points": 1500,
  "gameData": {
    "additional": "game-specific data"
  }
}
```

#### `GET /api/scores/history`
Get user's game history (protected route)
- Query params: `page`, `limit`

#### `GET /api/scores/stats`
Get user's game statistics (protected route)

### Leaderboard Endpoints

#### `GET /api/leaderboard/overall`
Get overall leaderboard
- Query params: `page`, `limit`

#### `GET /api/leaderboard/game/{gameType}/highscores`
Get game-specific high scores
- Query params: `page`, `limit`

#### `GET /api/leaderboard/game-stats`
Get global game statistics

### Game Information Endpoints

#### `GET /api/games`
Get list of all available games

#### `GET /api/games/{gameType}/highscore`
Get user's high score for specific game (protected route)

## 🗄️ Database Schema

### User Model
```javascript
{
  walletAddress: String (unique, hashed),
  totalPoints: Number (default: 0),
  highScores: {
    snake: Number,
    fallingFruit: Number,
    breakBricks: Number,
    clickCounter: Number
  },
  createdAt: Date
}
```

### GameScore Model
```javascript
{
  user: ObjectId (ref: User),
  gameType: String (enum),
  score: Number,
  points: Number,
  gameData: Object,
  playedAt: Date
}
```

## 🎨 Styling & Theme

The application uses a beautiful golden theme with:
- **Primary Colors**: Gold (#FFD700), Goldenrod (#DAA520)
- **Background**: Dark gradient (gray-900 to purple-900)
- **Accents**: Yellow highlights and golden animations
- **Responsive**: Mobile-first design with Tailwind CSS

## 🔧 Development

### Project Structure
```
bitcoinworld-game/
├── backend/                 # Node.js/Express backend
│   ├── middleware/         # Authentication middleware
│   ├── models/            # MongoDB models
│   ├── routes/            # API routes
│   └── server.js          # Main server file
├── public/                # Static assets
├── src/                   # React frontend
│   ├── components/        # Reusable components
│   ├── context/          # React Context providers
│   ├── pages/            # Page components
│   │   └── games/        # Game-specific pages
│   ├── utils/            # Utility functions
│   └── App.js            # Main app component
└── package.json          # Frontend dependencies
```

### Available Scripts

#### Frontend
- `npm start` - Start development server
- `npm build` - Build for production
- `npm test` - Run tests

#### Backend
- `npm run dev` - Start with nodemon (development)
- `npm start` - Start production server

## 🚀 Deployment

### Frontend (React)
```bash
npm run build
# Deploy the 'build' folder to your hosting service
```

### Backend (Node.js)
```bash
# Set production environment variables
NODE_ENV=production
MONGO_URI=your-production-mongodb-uri
JWT_SECRET=your-production-jwt-secret

npm start
```

### Database
- Use MongoDB Atlas for cloud hosting
- Ensure proper security settings and access controls

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

If you encounter any issues:
1. Check the console for error messages
2. Ensure MongoDB is running
3. Verify all environment variables are set
4. Check that both frontend and backend servers are running

## 🎯 Future Enhancements

- [ ] Multiplayer game modes
- [ ] Tournament system
- [ ] Achievement badges
- [ ] Social features
- [ ] Mobile app version
- [ ] Cryptocurrency rewards integration
- [ ] Advanced analytics dashboard

---

**Happy Gaming! 🎮✨**