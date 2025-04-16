
import React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

type RentStatus = 'paid' | 'overdue' | 'pending' | 'leave' | 'offline';

interface RentStatusBadgeProps {
  status: RentStatus;
  className?: string;
}

const statusConfig = {
  paid: { emoji: '✅', bg: 'bg-green-500', text: 'Paid' },
  overdue: { emoji: '❌', bg: 'bg-red-500', text: 'Overdue' },
  pending: { emoji: '⏳', bg: 'bg-yellow-500', text: 'Pending' },
  leave: { emoji: '☀️', bg: 'bg-blue-500', text: 'Leave' },
  offline: { emoji: '🔴', bg: 'bg-gray-500', text: 'Offline' },
};

export const RentStatusBadge = ({ status, className }: RentStatusBadgeProps) => {
  const config = statusConfig[status];
  
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
      <span>{config.emoji}</span>
      <span className="hidden sm:inline">{config.text}</span>
    </Badge>
  );
};
