
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useAdmin } from '@/context/AdminContext';
import { 
  LayoutDashboard, 
  Users, 
  Car, 
  FileText, 
  Settings,
  LogOut,
  Menu,
  Calendar,
  ChevronLeft
} from 'lucide-react';
import { Button } from './ui/button';
import { Sheet, SheetContent, SheetTrigger } from './ui/sheet';
import { toast } from 'sonner';

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children, title }) => {
  const { signOut } = useAuth();
  const { isAdmin, loading } = useAdmin();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    if (!loading && !isAdmin) {
      toast.error('You do not have admin privileges');
      navigate('/');
    }
  }, [isAdmin, loading, navigate]);

  useEffect(() => {
    // Load sidebar state from localStorage
    const savedState = localStorage.getItem('admin-sidebar-state');
    if (savedState) {
      setIsCollapsed(savedState === 'collapsed');
    }
  }, []);

  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    // Save state to localStorage
    localStorage.setItem('admin-sidebar-state', newState ? 'collapsed' : 'expanded');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-fleet-purple"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const navItems = [
    { label: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/admin' },
    { label: 'Drivers', icon: <Users size={20} />, path: '/admin/drivers' },
    { label: 'Vehicles', icon: <Car size={20} />, path: '/admin/vehicles' },
    { label: 'Reports', icon: <FileText size={20} />, path: '/admin/reports' },
    { label: 'Rent Calendar', icon: <Calendar size={20} />, path: '/admin/calendar' },
    { label: 'Settings', icon: <Settings size={20} />, path: '/admin/settings' },
  ];

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const NavContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b flex justify-between items-center">
        <h2 className={`text-xl font-bold text-fleet-purple ${isCollapsed ? 'hidden' : 'block'}`}>Admin Portal</h2>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={toggleSidebar}
          className="md:flex hidden"
        >
          <ChevronLeft className={`h-5 w-5 transition-transform duration-200 ${isCollapsed ? 'rotate-180' : ''}`} />
        </Button>
      </div>
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.label}>
              <button
                onClick={() => {
                  navigate(item.path);
                  setIsMobileMenuOpen(false);
                }}
                className={`flex items-center w-full px-4 py-3 text-left transition-colors ${
                  window.location.pathname === item.path
                    ? 'bg-fleet-purple text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                title={isCollapsed ? item.label : undefined}
              >
                <span className="mr-3">{item.icon}</span>
                {!isCollapsed && <span>{item.label}</span>}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <div className="p-4 border-t">
        <Button
          variant="outline"
          className={`w-full flex items-center justify-center ${isCollapsed ? 'p-2' : ''}`}
          onClick={handleLogout}
        >
          <LogOut size={18} className={isCollapsed ? '' : 'mr-2'} />
          {!isCollapsed && 'Logout'}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Desktop Sidebar */}
      <div 
        className={`hidden md:flex bg-white shadow-lg flex-col transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        <NavContent />
      </div>

      {/* Mobile Sidebar */}
      <div className="md:hidden">
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="fixed top-4 left-4 z-40"
            >
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 bg-white w-64">
            <NavContent />
          </SheetContent>
        </Sheet>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-x-hidden">
        <header className="bg-white shadow px-6 py-4 md:ml-0 flex items-center">
          <h1 className="text-xl md:text-2xl font-bold text-gray-800 ml-12 md:ml-0">
            {title}
          </h1>
        </header>
        <main className="p-4 md:p-6 overflow-x-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
