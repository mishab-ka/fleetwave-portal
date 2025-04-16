
import React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Check, Clock, AlertTriangle, Sun, UserMinus, UserX } from 'lucide-react';

type RentStatus = 'paid' | 'overdue' | 'pending' | 'leave' | 'offline' | 'not_joined';

interface RentStatusBadgeProps {
  status: RentStatus;
  className?: string;
}

const statusConfig = {
  paid: { icon: Check, bg: 'bg-green-100 text-green-700', text: 'Paid' },
  overdue: { icon: AlertTriangle, bg: 'bg-red-100 text-red-700', text: 'Overdue' },
  pending: { icon: Clock, bg: 'bg-yellow-100 text-yellow-700', text: 'Pending' },
  leave: { icon: Sun, bg: 'bg-blue-100 text-blue-700', text: 'Leave' },
  offline: { icon: UserMinus, bg: 'bg-gray-100 text-gray-700', text: 'Offline' },
  not_joined: { icon: UserX, bg: 'bg-slate-100 text-slate-700', text: 'Not Paid' },
};

export const RentStatusBadge = ({ status, className }: RentStatusBadgeProps) => {
  const config = statusConfig[status];
  const IconComponent = config.icon;
  
  return (
    <Badge 
      variant="outline"
      className={cn(
        'flex items-center gap-1',
        config.bg,
        'hover:opacity-90',
        className
      )}
    >
      <IconComponent className="h-3 w-3" />
      <span className="hidden sm:inline">{config.text}</span>
    </Badge>
  );
};
