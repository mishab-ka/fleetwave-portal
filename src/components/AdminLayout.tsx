
import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from '@/components/Header';

interface AdminLayoutProps {
  children: React.ReactNode;
  title?: string;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children, title }) => {
  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6">
          {title && (
            <h1 className="text-2xl font-semibold mb-6">{title}</h1>
          )}
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
