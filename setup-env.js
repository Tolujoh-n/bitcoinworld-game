const fs = require('fs');
const path = require('path');

// Create backend/.env file if it doesn't exist
const envPath = path.join(__dirname, 'backend', '.env');
const envContent = `# MongoDB Connection
MONGO_URI=mongodb://localhost:27017/bitcoinworld-game

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Server Port
PORT=5000

# CORS Origins (for production)
CORS_ORIGIN=http://localhost:3000
`;

if (!fs.existsSync(envPath)) {
  fs.writeFileSync(envPath, envContent);
  console.log('✅ Created backend/.env file');
} else {
  console.log('ℹ️  backend/.env file already exists');
}

console.log('\n🎮 BitcoinWorld Game Setup Complete!');
console.log('\n📋 Next steps:');
console.log('1. Make sure MongoDB is running');
console.log('2. Start backend: cd backend && npm run dev');
console.log('3. Start frontend: npm start');
console.log('4. Open http://localhost:3000');
console.log('\n🚀 Ready to play!');
