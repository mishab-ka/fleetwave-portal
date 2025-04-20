
import React from 'react';

export const Header = () => {
  return (
    <header className="bg-white border-b shadow-sm">
      <div className="container px-4 py-4 mx-auto flex justify-between items-center">
        <h1 className="text-xl font-semibold text-fleet-purple">Fleet Management</h1>
        <div className="flex items-center space-x-4">
          {/* Add any header actions here */}
        </div>
      </div>
    </header>
  );
};
