
import React from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  Home,
  Users,
  Car,
  FileText,
  Bell,
  Settings,
} from 'lucide-react';

export const Sidebar = () => {
  const links = [
    { to: '/admin', icon: Home, label: 'Dashboard' },
    { to: '/admin/drivers', icon: Users, label: 'Drivers' },
    { to: '/admin/vehicles', icon: Car, label: 'Vehicles' },
    { to: '/admin/reports', icon: FileText, label: 'Reports' },
    { to: '/admin/calendar', icon: Car, label: 'Calendar' },
    { to: '/admin/finance', icon: FileText, label: 'Finance' },
    { to: '/admin/accounting', icon: FileText, label: 'Accounting' },
    { to: '/admin/notifications', icon: Bell, label: 'Notifications' },
    { to: '/admin/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <aside className="w-64 bg-white border-r min-h-screen">
      <nav className="p-4 space-y-2">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-fleet-purple text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              )
            }
          >
            <Icon className="h-5 w-5" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};
