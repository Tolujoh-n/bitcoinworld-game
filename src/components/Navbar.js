import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/bw-logo.png';

const Navbar = () => {
  const { user, logout, setShowLoginModal } = useAuth();
  const location = useLocation();

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <nav className="bg-gradient-to-r from-yellow-600 to-yellow-500 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
        <div className="flex items-center">
  <Link to="/" className="flex items-center space-x-2">
    <img
      src={logo}
      alt="Game Icon"
      className="w-8 h-8"
    />
    <span className="text-xl font-bold text-white">BitcoinWorld</span>
  </Link>
</div>

          <div className="flex items-center space-x-4">
            <Link
              to="/games"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive('/games')
                  ? 'bg-yellow-700 text-white'
                  : 'text-white hover:bg-yellow-600'
              }`}
            >
              Games
            </Link>
            
            {user && (
              <>
                <Link
                  to="/stats"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive('/stats')
                      ? 'bg-yellow-700 text-white'
                      : 'text-white hover:bg-yellow-600'
                  }`}
                >
                  My Stats
                </Link>
                <Link
                  to="/leaderboard"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive('/leaderboard')
                      ? 'bg-yellow-700 text-white'
                      : 'text-white hover:bg-yellow-600'
                  }`}
                >
                  Leaderboard
                </Link>
              </>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {user ? (
              <div className="flex items-center space-x-4">
                <div className="text-white">
                  <div className="text-sm font-medium">
                    {user.walletAddress?.slice(0, 6)}...{user.walletAddress?.slice(-4)}
                  </div>
                  <div className="text-xs text-yellow-100">
                    {user.totalPoints} points
                  </div>
                </div>
                <button
                  onClick={logout}
                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Logout
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowLoginModal(true)}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
