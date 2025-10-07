import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const LoginModal = () => {
  const { showLoginModal, setShowLoginModal, login } = useAuth();
  const [walletAddress, setWalletAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!walletAddress.trim()) {
      setError('Please enter your wallet address');
      return;
    }

    setLoading(true);
    setError('');

    const result = await login(walletAddress.trim());
    
    if (result.success) {
      setWalletAddress('');
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  if (!showLoginModal) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Welcome to BitcoinWorld!</h2>
            <button
              onClick={() => setShowLoginModal(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <p className="text-gray-600 mb-6">
            Enter your wallet address to start playing and earning points. Your wallet address will be used to track your progress and achievements.
          </p>

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="walletAddress" className="block text-sm font-medium text-gray-700 mb-2">
                Wallet Address
              </label>
              <input
                type="text"
                id="walletAddress"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                placeholder="Enter your wallet address"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                disabled={loading}
              />
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            )}

            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-300 text-white font-medium py-2 px-4 rounded-md transition-colors"
              >
                {loading ? 'Logging in...' : 'Start Playing'}
              </button>
              <button
                type="button"
                onClick={() => setShowLoginModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>

          <div className="mt-4 text-xs text-gray-500">
            <p>💡 Don't have a wallet address? You can use any unique identifier like "player123" for testing purposes.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;
