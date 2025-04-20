
import React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Check, Clock, AlertTriangle, Sun, UserMinus, UserX } from 'lucide-react';

type RentStatus = 'approved' | 'overdue' | 'pending_verification' | 'leave' | 'offline' | 'not_joined';

interface RentStatusBadgeProps {
  status: RentStatus;
  className?: string;
  showText?: boolean;
}

const statusConfig = {
  approved: { icon: Check, bg: 'bg-green-100 text-green-700 border-green-200', text: 'Approved' },
  overdue: { icon: AlertTriangle, bg: 'bg-red-100 text-red-700 border-red-200', text: 'Overdue' },
  pending_verification: { icon: Clock, bg: 'bg-yellow-100 text-yellow-700 border-yellow-200', text: 'Pending' },
  leave: { icon: Sun, bg: 'bg-blue-100 text-blue-700 border-blue-200', text: 'Leave' },
  offline: { icon: UserMinus, bg: 'bg-gray-100 text-gray-700 border-gray-200', text: 'Offline' },
  not_joined: { icon: UserX, bg: 'bg-slate-100 text-slate-700 border-slate-200', text: 'Not Paid' },
};

export const RentStatusBadge = ({ status, className, showText = true }: RentStatusBadgeProps) => {
  const config = statusConfig[status] || statusConfig.not_joined;
  const IconComponent = config.icon;
  
  return (
    <Badge 
      variant="outline"
      className={cn(
        'flex items-center gap-1 font-normal',
        config.bg,
        'hover:opacity-90',
        className
      )}
    >
      <IconComponent className="h-3 w-3" />
      {showText && <span className={showText ? '' : 'hidden sm:inline'}>{config.text}</span>}
    </Badge>
  );
};
