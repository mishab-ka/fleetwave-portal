
import React from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ReportData } from './CalendarUtils';
import { useIsMobile } from '@/hooks/use-mobile';

interface DriverDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  driverData: ReportData | null;
}

export const DriverDetailModal = ({ 
  isOpen, 
  onClose, 
  driverData 
}: DriverDetailModalProps) => {
  const isMobile = useIsMobile();
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={isMobile ? "w-[95vw] max-w-md" : "max-w-lg"}>
        <DialogHeader>
          <DialogTitle>Driver Details</DialogTitle>
          <DialogDescription>
            Details for {driverData?.driverName || 'Unknown'} on {driverData?.date}
          </DialogDescription>
        </DialogHeader>
        
        {driverData ? (
          <div className="space-y-4 w-full">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Driver Name</div>
                <div className="font-medium">{driverData.driverName}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Vehicle Number</div>
                <div className="font-medium">{driverData.vehicleNumber || 'N/A'}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Current Shift</div>
                <div className="font-medium capitalize">{driverData.shift}</div>
              </div>
              {driverData.shiftForDate && driverData.shiftForDate !== driverData.shift && (
                <div>
                  <div className="text-sm text-muted-foreground">Shift on this date</div>
                  <div className="font-medium capitalize">{driverData.shiftForDate}</div>
                </div>
              )}
              <div>
                <div className="text-sm text-muted-foreground">Status</div>
                <div className="font-medium">
                  <Badge className={cn(
                    "mt-1",
                    driverData.status === 'paid' ? "bg-green-500" : 
                    driverData.status === 'pending' ? "bg-yellow-500" : 
                    driverData.status === 'overdue' ? "bg-red-500" : 
                    driverData.status === 'leave' ? "bg-blue-500" : 
                    "bg-gray-500"
                  )}>
                    {driverData.status === 'paid' ? "Paid" : 
                     driverData.status === 'pending' ? "Pending" : 
                     driverData.status === 'overdue' ? "Overdue" : 
                     driverData.status === 'leave' ? "Leave" : 
                     "Not Paid"}
                  </Badge>
                </div>
              </div>
              {driverData.earnings !== undefined && (
                <div>
                  <div className="text-sm text-muted-foreground">Earnings</div>
                  <div className="font-medium">₹{driverData.earnings.toLocaleString()}</div>
                </div>
              )}
            </div>
            
            {driverData.notes && (
              <div>
                <div className="text-sm text-muted-foreground">Notes</div>
                <div className="p-3 bg-muted rounded-md text-sm mt-1">{driverData.notes}</div>
              </div>
            )}
            
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={onClose}>Close</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="py-6 text-center text-muted-foreground">
            No data available for this driver.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
