
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { 
  LayoutDashboard, 
  Users, 
  Car, 
  FileText,
  Calendar, 
  Settings, 
  LogOut
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarProvider,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset
} from '@/components/ui/sidebar';

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children, title }) => {
  const { signOut } = useAuth();
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'Drivers', href: '/admin/drivers', icon: Users },
    { name: 'Vehicles', href: '/admin/vehicles', icon: Car },
    { name: 'Reports', href: '/admin/reports', icon: FileText },
    { name: 'Calendar', href: '/admin/calendar', icon: Calendar },
    { name: 'Settings', href: '/admin/settings', icon: Settings },
  ];

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gray-100">
        <Sidebar>
          <SidebarHeader>
            <div className="flex items-center px-4 py-2">
              <span className="text-xl font-bold text-fleet-purple">Fleet Admin</span>
            </div>
          </SidebarHeader>
          
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigation.map((item) => (
                    <SidebarMenuItem key={item.name}>
                      <SidebarMenuButton asChild>
                        <Link 
                          to={item.href}
                          className={location.pathname === item.href ? "text-fleet-purple" : ""}
                        >
                          <item.icon />
                          <span>{item.name}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter>
            <Button
              variant="ghost"
              className="flex w-full items-center gap-2 px-2"
              onClick={signOut}
            >
              <LogOut className="h-5 w-5" />
              <span>Sign out</span>
            </Button>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset>
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
            </div>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-4">
              {children}
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default AdminLayout;
