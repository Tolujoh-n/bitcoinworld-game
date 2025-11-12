import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import api, { SOCKET_BASE_URL } from '../utils/api';
import { authenticate, getWalletAddress, logoutWallet } from '../utils/stacksConnect';

const GAME_TYPES = ['snake', 'fallingFruit', 'breakBricks', 'carRacing'];
const ORACLE_POINT_RATE = 100;

const normalizeGameMap = (source = {}) => {
  const normalized = {};
  GAME_TYPES.forEach((gameType) => {
    normalized[gameType] =
      typeof source?.[gameType] === 'number' ? source[gameType] : 0;
  });

  if (source) {
    Object.entries(source).forEach(([key, value]) => {
      if (!(key in normalized)) {
        normalized[key] = value;
      }
    });
  }

  return normalized;
};

const normalizeUser = (userData) => {
  if (!userData) return null;

  const gamesPlayed = normalizeGameMap(userData.gamesPlayed);
  const highScores = normalizeGameMap(userData.highScores);
  const totalPoints = typeof userData.totalPoints === 'number' ? userData.totalPoints : 0;
  const mintedPoints = typeof userData.mintedPoints === 'number' ? userData.mintedPoints : 0;
  const availablePoints = typeof userData.availablePoints === 'number'
    ? userData.availablePoints
    : Math.max(0, totalPoints - mintedPoints);
  const mintedOracles = typeof userData.mintedOracles === 'number'
    ? userData.mintedOracles
    : mintedPoints / ORACLE_POINT_RATE;
  const totalGames = Object.values(gamesPlayed).reduce(
    (sum, value) => sum + (typeof value === 'number' ? value : 0),
    0
  );

  return {
    ...userData,
    gamesPlayed,
    highScores,
    totalPoints,
    mintedPoints,
    availablePoints,
    mintedOracles,
    totalGames,
  };
};

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [socket, setSocket] = useState(null);
  const [loading, setLoading] = useState(true);

  const persistUser = useCallback((value) => {
    if (value) {
      localStorage.setItem('user', JSON.stringify(value));
    } else {
      localStorage.removeItem('user');
    }
  }, []);

  const updateUser = useCallback(
    (updates) => {
      setUser((prev) => {
        const normalizedPrev = normalizeUser(prev);
        const nextValue =
          typeof updates === 'function'
            ? updates(normalizedPrev)
            : { ...normalizedPrev, ...updates };
        const normalizedNext = normalizeUser(nextValue);
        persistUser(normalizedNext);
        return normalizedNext;
      });
    },
    [persistUser]
  );

  const refreshUser = useCallback(async () => {
    try {
      const response = await api.get('/auth/profile');
      const normalized = normalizeUser(response.data);
      persistUser(normalized);
      setUser(normalized);
      return { success: true, user: normalized };
    } catch (error) {
      console.error('Refresh user error:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to refresh user',
      };
    }
  }, [persistUser]);

  const verifyToken = useCallback(
    async (token) => {
      try {
        const response = await api.get('/auth/verify');
        if (response.data.valid) {
          await refreshUser();
        } else {
          throw new Error('Invalid token');
        }
      } catch (error) {
        localStorage.removeItem('token');
        persistUser(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    },
    [refreshUser, persistUser]
  );

  const login = useCallback(async (walletAddress) => {
    try {
      const response = await api.post('/auth/login', { walletAddress });
      const { token, user: userData } = response.data;
      
      localStorage.setItem('token', token);
      const normalizedUser = normalizeUser(userData);
      persistUser(normalizedUser);
      setUser(normalizedUser);
      
      return { success: true, user: normalizedUser };
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || 'Login failed' 
      };
    }
  }, [persistUser]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const cachedUser = localStorage.getItem('user');

    if (cachedUser) {
      try {
        const parsedUser = normalizeUser(JSON.parse(cachedUser));
        setUser(parsedUser);
      } catch (error) {
        localStorage.removeItem('user');
      }
    }

    if (token) {
      verifyToken(token);
    } else {
      // Check if wallet is already connected
      const walletAddress = getWalletAddress();
      if (walletAddress) {
        login(walletAddress).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    }
  }, [verifyToken, login]);

  useEffect(() => {
    const token = localStorage.getItem('token');

    if (!user || !token) {
      setSocket((current) => {
        if (current) {
          current.disconnect();
        }
        return null;
      });
      return;
    }

    const socketInstance = io(SOCKET_BASE_URL, {
      transports: ['websocket'],
      auth: { token },
    });

    const handleUserUpdate = (payload = {}) => {
      if (payload.user) {
        updateUser(payload.user);
      }
    };

    const handleScoresRefresh = async () => {
      await refreshUser();
    };

    socketInstance.on('user:update', handleUserUpdate);
    socketInstance.on('scores:refresh', handleScoresRefresh);

    socketInstance.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.off('user:update', handleUserUpdate);
      socketInstance.off('scores:refresh', handleScoresRefresh);
      socketInstance.disconnect();
    };
  }, [user?.id, user?._id, user?.walletAddress, updateUser, refreshUser]);

  const connectWallet = useCallback(async () => {
    try {
      const walletAddress = await authenticate();
      if (!walletAddress) {
        return { success: false, error: 'Wallet connection cancelled or failed' };
      }
      return await login(walletAddress);
    } catch (error) {
      console.error('Wallet connection error:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to connect wallet' 
      };
    }
  }, [login]);

  const logout = () => {
    logoutWallet();
    localStorage.removeItem('token');
    persistUser(null);
    setUser(null);
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
  };

  const requireAuth = useCallback(async () => {
    if (!user) {
      const result = await connectWallet();
      return result.success;
    }
    return true;
  }, [user, connectWallet]);

  const value = {
    user,
    loading,
    socket,
    login,
    logout,
    requireAuth,
    connectWallet,
    updateUser,
    refreshUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};