import React from 'react';

const GameTest = ({ gameName }) => {
  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl shadow-lg p-8">
          <h1 className="text-4xl font-bold text-white text-center mb-8">
            {gameName} - Test Component
          </h1>
          <div className="text-center">
            <p className="text-xl text-gray-300 mb-4">
              This is a test component to verify routing is working.
            </p>
            <p className="text-lg text-yellow-400">
              If you can see this, the routing is working correctly!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameTest;
