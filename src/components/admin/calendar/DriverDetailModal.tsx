
import React from 'react';
import { format, parseISO } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ReportData, getStatusLabel } from './CalendarUtils';
import { Card, CardContent } from '@/components/ui/card';
import { RentStatusBadge } from '@/components/RentStatusBadge';
import { Separator } from '@/components/ui/separator';
import { CalendarIcon, IndianRupeeIcon, CarIcon, UserIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface DriverDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  driverData: ReportData | null;
}

export const DriverDetailModal = ({ isOpen, onClose, driverData }: DriverDetailModalProps) => {
  if (!driverData) return null;

  // Format dates
  const formattedDate = driverData.date ? format(parseISO(driverData.date), 'PPPP') : 'Unknown date';
  const formattedSubmissionTime = driverData.submissionTime ? format(parseISO(driverData.submissionTime), 'PPp') : 'Not submitted';
  
  // Get shift badge classes
  const getShiftBadgeClass = (shift: string) => {
    switch (shift) {
      case 'morning': return 'bg-amber-100 text-amber-800';
      case 'night': return 'bg-indigo-100 text-indigo-800';
      case '24hr': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserIcon className="h-5 w-5" />
            {driverData.driverName}
          </DialogTitle>
          <DialogDescription>
            Driver details for {formattedDate}
          </DialogDescription>
        </DialogHeader>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{formattedDate}</span>
              </div>
              <RentStatusBadge status={driverData.status} />
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className={cn("text-xs", getShiftBadgeClass(driverData.shift))}>
                {driverData.shift === 'morning' ? 'Morning Shift' : 
                 driverData.shift === 'night' ? 'Night Shift' : 
                 driverData.shift === '24hr' ? '24 Hour Shift' : 'Unknown Shift'}
              </Badge>

              {driverData.vehicleNumber && (
                <Badge variant="outline" className="text-xs bg-gray-100 text-gray-800">
                  <CarIcon className="mr-1 h-3 w-3" />
                  {driverData.vehicleNumber}
                </Badge>
              )}
            </div>

            <Separator />

            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Status Details</h4>
              <div className="grid grid-cols-2 gap-1 text-sm">
                <span className="text-muted-foreground">Status:</span>
                <span>{getStatusLabel(driverData.status)}</span>
                <span className="text-muted-foreground">Submitted:</span>
                <span>{formattedSubmissionTime}</span>
              </div>
            </div>

            {driverData.earnings !== undefined && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Financial Details</h4>
                  <div className="grid grid-cols-2 gap-1 text-sm">
                    <span className="text-muted-foreground">Total Earnings:</span>
                    <span className="flex items-center">
                      <IndianRupeeIcon className="mr-1 h-3 w-3" />
                      {typeof driverData.earnings === 'number' 
                        ? driverData.earnings.toLocaleString() 
                        : '0'}
                    </span>
                  </div>
                </div>
              </>
            )}

            {driverData.notes && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Notes</h4>
                  <p className="text-sm text-muted-foreground">{driverData.notes}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
};
