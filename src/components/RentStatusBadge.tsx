
import React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Check, Clock, AlertTriangle, Sun, UserMinus } from 'lucide-react';

type RentStatus = 'paid' | 'overdue' | 'pending' | 'leave' | 'offline';

interface RentStatusBadgeProps {
  status: RentStatus;
  className?: string;
}

const statusConfig = {
  paid: { icon: Check, bg: 'bg-green-500', text: 'Paid' },
  overdue: { icon: AlertTriangle, bg: 'bg-red-500', text: 'Overdue' },
  pending: { icon: Clock, bg: 'bg-yellow-500', text: 'Pending' },
  leave: { icon: Sun, bg: 'bg-blue-500', text: 'Leave' },
  offline: { icon: UserMinus, bg: 'bg-gray-500', text: 'Offline' },
};

export const RentStatusBadge = ({ status, className }: RentStatusBadgeProps) => {
  const config = statusConfig[status];
  const IconComponent = config.icon;
  
  return (
    <Badge 
      variant="secondary"
      className={cn(
        'flex items-center gap-1 text-white',
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
