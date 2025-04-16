
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useAdmin } from '@/context/AdminContext';
import { 
  LayoutDashboard, 
  Users, 
  Car, 
  FileText, 
  Settings,
  LogOut
} from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children, title }) => {
  const { signOut } = useAuth();
  const { isAdmin, loading } = useAdmin();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isAdmin) {
      toast.error('You do not have admin privileges');
      navigate('/');
    }
  }, [isAdmin, loading, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-fleet-purple"></div>
      </div>
    );
  }

  // Only render the admin layout if user is admin
  if (!isAdmin) {
    return null;
  }

  const navItems = [
    { label: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/admin' },
    { label: 'Drivers', icon: <Users size={20} />, path: '/admin/drivers' },
    { label: 'Vehicles', icon: <Car size={20} />, path: '/admin/vehicles' },
    { label: 'Reports', icon: <FileText size={20} />, path: '/admin/reports' },
    { label: 'Settings', icon: <Settings size={20} />, path: '/admin/settings' },
  ];

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <div className="bg-white w-64 shadow-lg flex flex-col">
        <div className="p-4 border-b">
          <h2 className="text-xl font-bold text-fleet-purple">Admin Portal</h2>
        </div>
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.label}>
                <button
                  onClick={() => navigate(item.path)}
                  className={`flex items-center w-full px-4 py-3 text-left transition-colors ${
                    window.location.pathname === item.path
                      ? 'bg-fleet-purple text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className="mr-3">{item.icon}</span>
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
        <div className="p-4 border-t">
          <Button
            variant="outline"
            className="w-full flex items-center justify-center"
            onClick={handleLogout}
          >
            <LogOut size={18} className="mr-2" />
            Logout
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        <header className="bg-white shadow px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
        </header>
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
