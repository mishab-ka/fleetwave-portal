
import React from 'react';

export const Header = () => {
  return (
    <header className="bg-white p-4 border-b">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800">Fleet Manager Admin</h1>
        <div className="flex items-center space-x-4">
          <button className="p-2 rounded-full hover:bg-gray-100">
            <span className="sr-only">Notifications</span>
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-6 w-6 text-gray-600" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" 
              />
            </svg>
          </button>
          <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-700">
            A
          </div>
        </div>
      </div>
    </header>
  );
};
