import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../utils/api';

const gameIdMap = {
  'snake': 'snake',
  'falling-fruit': 'fallingFruit',
  'break-bricks': 'breakBricks',
  'car-racing': 'carRacing',
};

const GameRouteGuard = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isAllowed, setIsAllowed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkGameStatus = async () => {
      try {
        // Extract game ID from pathname (e.g., /games/snake -> snake)
        const pathParts = location.pathname.split('/');
        const routeGameId = pathParts[pathParts.length - 1];
        const backendGameId = gameIdMap[routeGameId];
        
        if (!backendGameId) {
          navigate('/games');
          return;
        }

        const response = await api.get('/games');
        const game = response.data?.games?.find(g => g.id === backendGameId);
        
        if (!game) {
          navigate('/games');
          return;
        }

        if (game.status === 'comingSoon') {
          // Redirect to games list
          navigate('/games');
          return;
        }

        setIsAllowed(true);
      } catch (error) {
        console.error('Error checking game status:', error);
        navigate('/games');
      } finally {
        setLoading(false);
      }
    };

    checkGameStatus();
  }, [location.pathname, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-xl">Loading game...</div>
      </div>
    );
  }

  if (!isAllowed) {
    return null;
  }

  return <>{children}</>;
};

export default GameRouteGuard;

