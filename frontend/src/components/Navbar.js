import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/bw-logo.png';
import { getWalletAddress } from "../utils/stacksConnect";

const Navbar = () => {
  const { user, logout, connectWallet } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const totalPoints = user?.totalPoints ?? 0;
  const mintedPoints = user?.mintedPoints ?? 0;
  const availablePoints = user?.availablePoints ?? Math.max(0, totalPoints - mintedPoints);

  useEffect(() => {
    // Check if wallet is connected but user is not logged in
    const walletAddress = getWalletAddress();
    if (walletAddress && (!user || user.walletAddress?.toLowerCase() !== walletAddress.toLowerCase())) {
      // Auto-login if wallet is connected
      connectWallet();
    }
  }, [user, connectWallet]);

  const handleConnectWallet = async () => {
    await connectWallet();
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const isActive = (path) => location.pathname === path;

  const closeMenu = () => setMobileMenuOpen(false);

  const renderNavLinks = (isMobile = false) => (
    <>
      <Link
        to="/games"
        onClick={closeMenu}
        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
          isActive('/games')
            ? 'bg-yellow-700 text-white'
            : 'text-white hover:bg-yellow-600'
        } ${isMobile ? 'block w-full text-left' : ''}`}
      >
        Games
      </Link>

      {user && (
        <>
          <Link
            to="/stats"
            onClick={closeMenu}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              isActive('/stats')
                ? 'bg-yellow-700 text-white'
                : 'text-white hover:bg-yellow-600'
            } ${isMobile ? 'block w-full text-left mt-1' : ''}`}
          >
            My Stats
          </Link>
          <Link
            to="/leaderboard"
            onClick={closeMenu}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              isActive('/leaderboard')
                ? 'bg-yellow-700 text-white'
                : 'text-white hover:bg-yellow-600'
            } ${isMobile ? 'block w-full text-left mt-1' : ''}`}
          >
            Leaderboard
          </Link>
        </>
      )}
    </>
  );

  const renderAuthActions = (isMobile = false) => (
    <div className={`flex ${isMobile ? 'flex-col space-y-3 pt-4 border-t border-yellow-400/40 mt-4' : 'items-center space-x-4'}`}>
      {user ? (
        <>
          <div className="text-white">
            <div className="text-sm font-medium">
              {user.walletAddress?.slice(0, 6)}...{user.walletAddress?.slice(-4)}
            </div>
            <div className="text-xs text-yellow-100">
              {availablePoints.toLocaleString()} available pts
            </div>
          </div>
          <button
            onClick={() => {
              handleLogout();
              closeMenu();
            }}
            className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
          >
            Logout
          </button>
        </>
      ) : (
        <button
          onClick={() => {
            handleConnectWallet();
            closeMenu();
          }}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
        >
          Connect Wallet
        </button>
      )}
    </div>
  );

  return (
    <nav className="w-full bg-gradient-to-r from-yellow-600 to-yellow-500 shadow-lg">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <img
                src={logo}
                alt="Game Icon"
                className="h-8 w-8"
              />
              <span className="text-xl font-bold text-white">BitcoinWorld</span>
            </Link>
          </div>

          <div className="hidden items-center space-x-4 md:flex">
            {renderNavLinks()}
          </div>

          <div className="hidden items-center md:flex">
            {renderAuthActions()}
          </div>

          <div className="flex items-center md:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="inline-flex items-center justify-center rounded-md p-2 text-white hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              aria-expanded={mobileMenuOpen}
              aria-label="Toggle navigation"
            >
              <svg
                className="h-6 w-6"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden">
          <div className="space-y-1 px-4 pb-4 pt-2 bg-gradient-to-br from-yellow-700 to-yellow-600 shadow-inner">
            {renderNavLinks(true)}
            <div className="text-sm text-yellow-100">
              {user ? `${availablePoints.toLocaleString()} available pts` : null}
            </div>
            {renderAuthActions(true)}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
