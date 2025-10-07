import React from 'react';

const BreakBricksGameDebug = () => {
  console.log('BreakBricksGameDebug component is rendering');
  
  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-blue-500 p-8 rounded-lg">
          <h1 className="text-4xl font-bold text-white text-center">
            🧱 Break Bricks Game - DEBUG VERSION
          </h1>
          <div className="text-center mt-4">
            <p className="text-white text-xl">
              If you can see this blue box, the component is rendering correctly!
            </p>
            <p className="text-white text-lg mt-2">
              The issue is likely with the game logic or CSS, not the component itself.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BreakBricksGameDebug;
