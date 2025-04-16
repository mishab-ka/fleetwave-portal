
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { AlertTriangle, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

type Driver = Tables<"users">;
type Vehicle = Tables<"vehicles">;

interface DriverDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  driver: Driver | null;
  onDriverUpdate: () => void;
}

const DriverDetailsModal: React.FC<DriverDetailsModalProps> = ({ isOpen, onClose, driver, onDriverUpdate }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isOnline, setIsOnline] = useState(false);
  const [shift, setShift] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [assignmentError, setAssignmentError] = useState('');
  const [assignedDrivers, setAssignedDrivers] = useState<{id: string, name: string}[]>([]);

  useEffect(() => {
    if (driver) {
      setName(driver.name || '');
      setEmail(driver.email_id || '');
      setIsOnline(driver.online || false);
      setShift(driver.shift || '');
      setVehicleNumber(driver.vehicle_number || '');
    }
    fetchVehicles();
  }, [driver]);

  const fetchVehicles = async () => {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .order('vehicle_number');
      
      if (error) throw error;
      setVehicles(data || []);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      toast.error('Failed to load vehicles data');
    }
  };

  const checkVehicleAssignment = async (selectedVehicle: string) => {
    if (!selectedVehicle) {
      setAssignmentError('');
      setAssignedDrivers([]);
      return true;
    }

    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('assigned_driver_1, assigned_driver_2, users!users_assigned_driver_1_fkey(id, name), users!users_assigned_driver_2_fkey(id, name)')
        .eq('vehicle_number', selectedVehicle)
        .single();

      if (error) throw error;

      // Create a list of currently assigned drivers
      const assignedDriversList: {id: string, name: string}[] = [];
      
      // Extract driver1 data
      const driver1 = data.users;
      if (driver1 && driver1.id) {
        assignedDriversList.push({ id: driver1.id, name: driver1.name || 'Unknown' });
      }
      
      // Extract driver2 data
      const driver2 = data.users_assigned_driver_2_fkey;
      if (driver2 && driver2.id) {
        assignedDriversList.push({ id: driver2.id, name: driver2.name || 'Unknown' });
      }

      setAssignedDrivers(assignedDriversList);

      // Check if we can assign this vehicle to the current driver
      if (assignedDriversList.length >= 2 && !assignedDriversList.some(d => d.id === driver?.id)) {
        setAssignmentError(`This vehicle already has two drivers assigned: ${assignedDriversList.map(d => d.name).join(', ')}`);
        return false;
      } else {
        setAssignmentError('');
        return true;
      }
    } catch (error) {
      console.error('Error checking vehicle assignment:', error);
      toast.error('Failed to check vehicle assignment');
      return false;
    }
  };

  const handleVehicleChange = async (value: string) => {
    const canAssign = await checkVehicleAssignment(value);
    if (canAssign) {
      setVehicleNumber(value);
    }
  };

  const handleOnlineToggle = async (checked: boolean) => {
    setIsOnline(checked);
  };

  const handleSubmit = async () => {
    if (!driver) return;
    
    setLoading(true);
    
    try {
      const now = new Date();
      const dateString = now.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      // Prepare update data
      const updateData: Partial<Driver> = {
        name,
        email_id: email,
        shift,
      };
      
      // Handle online status change
      if (isOnline !== driver.online) {
        updateData.online = isOnline;
        
        if (isOnline) {
          // Going online
          updateData.online_from_date = dateString;
          updateData.offline_from_date = null;
        } else {
          // Going offline
          updateData.offline_from_date = dateString;
        }
      }
      
      // Handle vehicle change if needed
      if (vehicleNumber !== driver.vehicle_number) {
        // Check vehicle assignment again before update
        const canAssign = await checkVehicleAssignment(vehicleNumber);
        if (!canAssign) {
          setLoading(false);
          return;
        }
        
        updateData.vehicle_number = vehicleNumber;
        
        // If there was a previous vehicle, update it to remove this driver
        if (driver.vehicle_number) {
          // Check which driver slot this user occupied in the previous vehicle
          const { data: prevVehicleData, error: prevVehicleError } = await supabase
            .from('vehicles')
            .select('assigned_driver_1, assigned_driver_2')
            .eq('vehicle_number', driver.vehicle_number)
            .single();
          
          if (prevVehicleError) throw prevVehicleError;
          
          const updateVehicle: { assigned_driver_1?: null, assigned_driver_2?: null } = {};
          
          if (prevVehicleData.assigned_driver_1 === driver.id) {
            updateVehicle.assigned_driver_1 = null;
          }
          
          if (prevVehicleData.assigned_driver_2 === driver.id) {
            updateVehicle.assigned_driver_2 = null;
          }
          
          const { error: vehicleUpdateError } = await supabase
            .from('vehicles')
            .update(updateVehicle)
            .eq('vehicle_number', driver.vehicle_number);
          
          if (vehicleUpdateError) throw vehicleUpdateError;
        }
        
        // Assign driver to new vehicle
        if (vehicleNumber) {
          const { data: vehicleData, error: getVehicleError } = await supabase
            .from('vehicles')
            .select('assigned_driver_1, assigned_driver_2')
            .eq('vehicle_number', vehicleNumber)
            .single();
          
          if (getVehicleError) throw getVehicleError;
          
          const vehicleUpdate: { assigned_driver_1?: string, assigned_driver_2?: string } = {};
          
          if (!vehicleData.assigned_driver_1) {
            vehicleUpdate.assigned_driver_1 = driver.id;
          } else if (!vehicleData.assigned_driver_2) {
            vehicleUpdate.assigned_driver_2 = driver.id;
          }
          
          const { error: updateVehicleError } = await supabase
            .from('vehicles')
            .update(vehicleUpdate)
            .eq('vehicle_number', vehicleNumber);
          
          if (updateVehicleError) throw updateVehicleError;
        }
      }
      
      // Update driver record
      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', driver.id);
      
      if (error) throw error;
      
      toast.success('Driver details updated successfully');
      onDriverUpdate();
      onClose();
    } catch (error) {
      console.error('Error updating driver:', error);
      toast.error('Failed to update driver details');
    } finally {
      setLoading(false);
    }
  };

  if (!driver) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Driver Details</DialogTitle>
          <DialogDescription>
            View and update driver information
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>

          <Separator />
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="online-status">Online Status</Label>
              <Switch 
                id="online-status" 
                checked={isOnline}
                onCheckedChange={handleOnlineToggle}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {isOnline ? 
                (driver.online_from_date ? `Online since ${driver.online_from_date}` : 'Currently online') : 
                (driver.offline_from_date ? `Offline since ${driver.offline_from_date}` : 'Currently offline')}
            </p>
          </div>

          <Separator />
          
          <div className="space-y-2">
            <Label htmlFor="shift">Shift</Label>
            <Select 
              value={shift} 
              onValueChange={setShift}
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

          <Separator />
          
          <div className="space-y-2">
            <Label htmlFor="vehicle">Vehicle Number</Label>
            <Select 
              value={vehicleNumber} 
              onValueChange={handleVehicleChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select vehicle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {vehicles.map((vehicle) => (
                  <SelectItem key={vehicle.vehicle_number} value={vehicle.vehicle_number}>
                    {vehicle.vehicle_number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {assignmentError && (
              <div className="flex items-start gap-2 mt-2 text-red-500 text-sm">
                <AlertTriangle className="h-4 w-4 mt-0.5" />
                <span>{assignmentError}</span>
              </div>
            )}
            
            {assignedDrivers.length > 0 && !assignmentError && (
              <div className="flex items-start gap-2 mt-2 text-amber-500 text-sm">
                <Info className="h-4 w-4 mt-0.5" />
                <span>
                  Currently assigned to: {assignedDrivers.map(d => d.name).join(', ')}
                </span>
              </div>
            )}
          </div>

          <Separator />
          
          <div className="space-y-2">
            <Label>Document Verification</Label>
            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col items-center p-2 border rounded">
                <span className="text-sm font-medium">License</span>
                <span className={`text-xs ${driver.license ? 'text-green-500' : 'text-red-500'}`}>
                  {driver.license ? 'Verified' : 'Not Verified'}
                </span>
              </div>
              <div className="flex flex-col items-center p-2 border rounded">
                <span className="text-sm font-medium">Aadhar</span>
                <span className={`text-xs ${driver.aadhar ? 'text-green-500' : 'text-red-500'}`}>
                  {driver.aadhar ? 'Verified' : 'Not Verified'}
                </span>
              </div>
              <div className="flex flex-col items-center p-2 border rounded">
                <span className="text-sm font-medium">PAN</span>
                <span className={`text-xs ${driver.pan ? 'text-green-500' : 'text-red-500'}`}>
                  {driver.pan ? 'Verified' : 'Not Verified'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !!assignmentError}>
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DriverDetailsModal;
