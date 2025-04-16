
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface DriverDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  driverId?: string;
  onDriverUpdate?: () => void;
}

type Vehicle = {
  vehicle_number: string;
  id: string;
  assigned_driver_1?: string | null;
  assigned_driver_2?: string | null;
};

export const DriverDetailsModal = ({ isOpen, onClose, driverId, onDriverUpdate }: DriverDetailsModalProps) => {
  const [driver, setDriver] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isOnline, setIsOnline] = useState<boolean>(false);
  const [selectedShift, setSelectedShift] = useState<string>('');
  const [selectedVehicle, setSelectedVehicle] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  useEffect(() => {
    if (driverId && isOpen) {
      fetchDriverDetails();
      fetchVehicles();
    }
  }, [driverId, isOpen]);

  const fetchDriverDetails = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', driverId)
        .single();

      if (error) throw error;
      setDriver(data);
      setIsOnline(data.online || false);
      setSelectedShift(data.shift || '');
      setSelectedVehicle(data.vehicle_number || '');
    } catch (error) {
      console.error('Error fetching driver details:', error);
      toast.error('Failed to load driver details');
    } finally {
      setLoading(false);
    }
  };

  const fetchVehicles = async () => {
    try {
      // Get all vehicles with their assigned drivers
      const { data, error } = await supabase
        .from('vehicles')
        .select(`
          id,
          vehicle_number,
          assigned_driver_1,
          assigned_driver_2
        `);

      if (error) throw error;

      // Fetch driver details separately to avoid the relationship issues
      const driverIds = data
        .flatMap(vehicle => [vehicle.assigned_driver_1, vehicle.assigned_driver_2])
        .filter(id => id !== null && id !== undefined);

      const { data: driversData, error: driversError } = await supabase
        .from('users')
        .select('id, name')
        .in('id', driverIds);

      if (driversError) throw driversError;

      // Create a map of driver IDs to names for easy lookup
      const driverMap = {};
      driversData.forEach(driver => {
        driverMap[driver.id] = driver.name;
      });

      // Add driver names to the vehicles data
      const vehiclesWithDrivers = data.map(vehicle => ({
        ...vehicle,
        driver1_name: vehicle.assigned_driver_1 ? driverMap[vehicle.assigned_driver_1] : null,
        driver2_name: vehicle.assigned_driver_2 ? driverMap[vehicle.assigned_driver_2] : null
      }));

      setVehicles(vehiclesWithDrivers);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      toast.error('Failed to load vehicles');
    }
  };

  const handleOnlineToggle = async () => {
    setIsProcessing(true);
    
    try {
      const updateData: any = {
        online: !isOnline
      };
      
      if (isOnline) {
        updateData.offline_from_date = new Date().toISOString().split('T')[0];
      } else {
        updateData.online_from_date = new Date().toISOString().split('T')[0];
        updateData.offline_from_date = null;
      }
      
      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', driverId);
        
      if (error) throw error;
      
      if (!isOnline) {
        const { error: historyError } = await supabase
          .from('rent_history')
          .insert({
            user_id: driverId,
            rent_date: new Date().toISOString().split('T')[0],
            is_online: true,
            payment_status: 'active',
            shift: selectedShift
          });
        
        if (historyError) throw historyError;
      }
      
      setIsOnline(!isOnline);
      toast.success(`Driver status updated to ${!isOnline ? 'Online' : 'Offline'}`);
      
      if (onDriverUpdate) onDriverUpdate();
    } catch (error) {
      console.error('Error updating driver status:', error);
      toast.error('Failed to update driver status');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVehicleChange = async (vehicleNumber: string) => {
    if (!vehicleNumber || vehicleNumber === selectedVehicle) return;
    
    setIsProcessing(true);
    
    try {
      const selectedVehicleData = vehicles.find(v => v.vehicle_number === vehicleNumber);
      
      if (!selectedVehicleData) {
        toast.error('Vehicle not found');
        return;
      }
      
      const hasDriver1 = !!selectedVehicleData.assigned_driver_1;
      const hasDriver2 = !!selectedVehicleData.assigned_driver_2;
      
      if (hasDriver1 && hasDriver2 && 
          selectedVehicleData.assigned_driver_1 !== driverId && 
          selectedVehicleData.assigned_driver_2 !== driverId) {
        
        const driver1Name = selectedVehicleData.driver1_name || 'Unknown';
        const driver2Name = selectedVehicleData.driver2_name || 'Unknown';
        
        toast.error(`Vehicle already has 2 drivers assigned: ${driver1Name} and ${driver2Name}`);
        return;
      }
      
      let slotToUse = 'assigned_driver_1';
      if (hasDriver1 && selectedVehicleData.assigned_driver_1 !== driverId) {
        slotToUse = 'assigned_driver_2';
      }
      
      const { error: updateError } = await supabase
        .from('users')
        .update({ vehicle_number: vehicleNumber })
        .eq('id', driverId);
        
      if (updateError) throw updateError;
      
      const vehicleUpdate: any = {};
      vehicleUpdate[slotToUse] = driverId;
      
      const { error: vehicleError } = await supabase
        .from('vehicles')
        .update(vehicleUpdate)
        .eq('id', selectedVehicleData.id);
        
      if (vehicleError) throw vehicleError;
      
      setSelectedVehicle(vehicleNumber);
      toast.success(`Vehicle assigned successfully: ${vehicleNumber}`);
      
      if (onDriverUpdate) onDriverUpdate();
    } catch (error) {
      console.error('Error assigning vehicle:', error);
      toast.error('Failed to assign vehicle');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleShiftChange = async (shift: string) => {
    if (!shift || shift === selectedShift) return;
    
    setIsProcessing(true);
    
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { error } = await supabase
        .from('users')
        .update({ shift })
        .eq('id', driverId);
        
      if (error) throw error;
      
      const { error: historyError } = await supabase
        .from('shift_history')
        .insert({
          user_id: driverId,
          shift,
          effective_from_date: today
        });
      
      if (historyError) throw historyError;
      
      setSelectedShift(shift);
      toast.success(`Shift updated to ${shift}`);
      
      if (onDriverUpdate) onDriverUpdate();
    } catch (error) {
      console.error('Error updating shift:', error);
      toast.error('Failed to update shift');
    } finally {
      setIsProcessing(false);
    }
  };

  const saveChanges = async () => {
    try {
      if (onDriverUpdate) onDriverUpdate();
      onClose();
    } catch (error) {
      console.error('Error saving changes:', error);
      toast.error('Failed to save changes');
    }
  };

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-md">
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Driver</DialogTitle>
          <DialogDescription>
            Make changes to driver {driver?.name}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="flex flex-col gap-1">
            <h3 className="text-sm font-medium">Driver Status</h3>
            <div className="flex items-center space-x-2">
              <Switch 
                id="online-status" 
                checked={isOnline} 
                onCheckedChange={handleOnlineToggle}
                disabled={isProcessing}
              />
              <Label htmlFor="online-status">
                {isOnline ? 'Online' : 'Offline'}
              </Label>
              
              {!isOnline && driver?.offline_from_date && (
                <span className="text-xs text-muted-foreground">
                  (Offline since {format(new Date(driver.offline_from_date), 'PP')})
                </span>
              )}
            </div>
          </div>
          
          <div className="flex flex-col gap-1">
            <Label htmlFor="shift">Shift</Label>
            <Select 
              value={selectedShift} 
              onValueChange={handleShiftChange}
              disabled={isProcessing}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select shift" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="morning">Morning</SelectItem>
                <SelectItem value="night">Night</SelectItem>
                <SelectItem value="24hr">24 Hours</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex flex-col gap-1">
            <Label htmlFor="vehicle">Assigned Vehicle</Label>
            <Select 
              value={selectedVehicle} 
              onValueChange={handleVehicleChange}
              disabled={isProcessing}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select vehicle" />
              </SelectTrigger>
              <SelectContent>
                {vehicles.map((vehicle) => (
                  <SelectItem key={vehicle.id} value={vehicle.vehicle_number}>
                    {vehicle.vehicle_number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={saveChanges} disabled={isProcessing}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
