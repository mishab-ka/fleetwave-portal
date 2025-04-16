
import React from 'react';
import { format, parseISO } from 'date-fns';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Calendar, DollarSign, Clock, AlertTriangle, FileText, User, Truck } from 'lucide-react';

interface DriverDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  driverData: {
    driverName: string;
    vehicleNumber: string;
    date: string;
    status: string;
    shift: string;
    submissionTime?: string;
    earnings?: number;
    notes?: string;
  } | null;
}

export const DriverDetailModal = ({ isOpen, onClose, driverData }: DriverDetailModalProps) => {
  if (!driverData) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800 border-green-300';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'overdue': return 'bg-red-100 text-red-800 border-red-300';
      case 'leave': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'offline': return 'bg-gray-100 text-gray-800 border-gray-300';
      default: return 'bg-white border';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'paid': return 'Paid';
      case 'pending': return 'Pending Verification';
      case 'overdue': return 'Overdue';
      case 'leave': return 'Leave';
      case 'offline': return 'Offline';
      default: return 'Not Paid';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Driver Rent Details</DialogTitle>
          <DialogDescription>
            Viewing details for {driverData.date}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <div className="text-sm font-medium leading-none">{driverData.driverName}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                <Truck className="mr-1 h-3 w-3" />
                {driverData.vehicleNumber}
              </div>
            </div>
            <Badge className={cn("ml-2", getStatusColor(driverData.status))}>
              {getStatusLabel(driverData.status)}
            </Badge>
          </div>
          
          <Separator />
          
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{driverData.date}</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{driverData.shift} Shift</span>
            </div>
            
            {driverData.submissionTime && (
              <div className="flex items-center space-x-2 col-span-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Submitted: {format(parseISO(driverData.submissionTime), 'PPp')}</span>
              </div>
            )}
            
            {driverData.earnings !== undefined && (
              <div className="flex items-center space-x-2 col-span-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Earnings: ₹{driverData.earnings.toLocaleString()}</span>
              </div>
            )}
          </div>
          
          {driverData.notes && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Notes</span>
                </div>
                <p className="text-sm text-muted-foreground">{driverData.notes}</p>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
