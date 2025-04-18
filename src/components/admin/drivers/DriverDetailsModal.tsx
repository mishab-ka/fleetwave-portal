
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { format, isValid, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CheckCircle, XCircle, Mail, Phone, Calendar, FileText, Car, IndianRupee } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BalanceTransactions } from '@/components/admin/drivers/BalanceTransactions';

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
  driver1_name?: string | null;
  driver2_name?: string | null;
};

export const DriverDetailsModal = ({ isOpen, onClose, driverId, onDriverUpdate }: DriverDetailsModalProps) => {
  const [driver, setDriver] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isOnline, setIsOnline] = useState<boolean>(false);
  const [selectedShift, setSelectedShift] = useState<string>('');
  const [selectedVehicle, setSelectedVehicle] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [deposit, setDeposit] = useState<string>('0');
  const [totalTrips, setTotalTrips] = useState<string>('0');
  const [currentTab, setCurrentTab] = useState<string>('view');
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [joiningDate, setJoiningDate] = useState<string>('');
  const [driverId2, setDriverId2] = useState<string>('');

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
      setDeposit(data.deposit_amount?.toString() || '0');
      setTotalTrips(data.total_trip?.toString() || '0');
      setName(data.name || '');
      setEmail(data.email_id || '');
      setPhone(data.phone_number || '');
      setJoiningDate(data.joining_date || '');
      setDriverId2(data.driver_id || '');
    } catch (error) {
      console.error('Error fetching driver details:', error);
      toast.error('Failed to load driver details');
    } finally {
      setLoading(false);
    }
  };

  const fetchVehicles = async () => {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select(`
          id,
          vehicle_number,
          assigned_driver_1,
          assigned_driver_2
        `);

      if (error) throw error;

      const driverIds = data
        .flatMap(vehicle => [vehicle.assigned_driver_1, vehicle.assigned_driver_2])
        .filter(id => id !== null && id !== undefined);

      const { data: driversData, error: driversError } = await supabase
        .from('users')
        .select('id, name')
        .in('id', driverIds);

      if (driversError) throw driversError;

      const driverMap = {};
      driversData.forEach(driver => {
        driverMap[driver.id] = driver.name;
      });

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

  const handleDepositChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setDeposit(e.target.value);
  };

  const handleTotalTripsChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setTotalTrips(e.target.value);
  };

  const saveChanges = async () => {
    setIsProcessing(true);
    try {
      if (!name.trim()) {
        toast.error('Name is required');
        setIsProcessing(false);
        return;
      }

      const { error } = await supabase
        .from('users')
        .update({
          name,
          email_id: email,
          phone_number: phone,
          joining_date: joiningDate,
          driver_id: driverId2,
          deposit_amount: parseFloat(deposit) || 0,
          total_trip: parseFloat(totalTrips) || 0
        })
        .eq('id', driverId);

      if (error) throw error;
      
      toast.success('Driver information updated successfully');
      if (onDriverUpdate) onDriverUpdate();
      onClose();
    } catch (error) {
      console.error('Error saving changes:', error);
      toast.error('Failed to save changes');
    } finally {
      setIsProcessing(false);
    }
  };

  const formattedJoiningDate = driver?.joining_date ? 
    (isValid(parseISO(driver.joining_date)) ? 
      format(parseISO(driver.joining_date), 'PPP') : 
      'Invalid date') : 
    'Not available';

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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Driver Details</DialogTitle>
          <DialogDescription>
            View and manage driver information
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="view" value={currentTab} onValueChange={setCurrentTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="view">View Details</TabsTrigger>
            <TabsTrigger value="edit">Edit Details</TabsTrigger>
            <TabsTrigger value="balance">Balance</TabsTrigger>
          </TabsList>
          
          <ScrollArea className="h-[calc(100vh-220px)]">
            <TabsContent value="view">
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={driver?.profile_photo || undefined} />
                      <AvatarFallback>{driver?.name?.charAt(0) || 'U'}</AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle>{driver?.name}</CardTitle>
                      <CardDescription>Driver ID: {driver?.driver_id}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    <Badge variant={driver?.online ? 'success' : 'destructive'}>
                      {driver?.online ? 'Online' : 'Offline'}
                    </Badge>
                    {driver?.shift && (
                      <Badge variant={driver?.shift === 'morning' ? 'default' : 'secondary'}>
                        {driver?.shift}
                      </Badge>
                    )}
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Email:</span>
                      <span className="text-sm">{driver?.email_id || 'Not available'}</span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Phone:</span>
                      <span className="text-sm">{driver?.phone_number || 'Not available'}</span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Joining Date:</span>
                      <span className="text-sm">{formattedJoiningDate}</span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Car className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Vehicle:</span>
                      <span className="text-sm">{driver?.vehicle_number || 'Not assigned'}</span>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="text-sm font-medium mb-2">Documents</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">License:</span>
                        {driver?.license ? 
                          <CheckCircle className="h-4 w-4 text-green-500" /> : 
                          <XCircle className="h-4 w-4 text-red-500" />
                        }
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Aadhar:</span>
                        {driver?.aadhar ? 
                          <CheckCircle className="h-4 w-4 text-green-500" /> : 
                          <XCircle className="h-4 w-4 text-red-500" />
                        }
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">PAN:</span>
                        {driver?.pan ? 
                          <CheckCircle className="h-4 w-4 text-green-500" /> : 
                          <XCircle className="h-4 w-4 text-red-500" />
                        }
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Total Trips:</span>
                      <span>{driver?.total_trip || '0'}</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Deposit Amount:</span>
                      <div className="flex items-center">
                        <IndianRupee className="h-3 w-3 mr-1" />
                        <span>{driver?.deposit_amount || '0'}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="edit">
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Driver name"
                      disabled={isProcessing}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="driverId">Driver ID</Label>
                    <Input
                      id="driverId"
                      value={driverId2}
                      onChange={(e) => setDriverId2(e.target.value)}
                      placeholder="Driver ID"
                      disabled={isProcessing}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email address"
                      disabled={isProcessing}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Phone number"
                      disabled={isProcessing}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="joiningDate">Joining Date</Label>
                    <Input
                      id="joiningDate"
                      type="date"
                      value={joiningDate}
                      onChange={(e) => setJoiningDate(e.target.value)}
                      disabled={isProcessing}
                    />
                  </div>

                  <Separator />

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

                  <div className="flex flex-col gap-1">
                    <Label htmlFor="deposit">Deposit Amount</Label>
                    <Input
                      id="deposit"
                      type="number"
                      value={deposit}
                      onChange={handleDepositChange}
                      placeholder="Enter deposit amount"
                      disabled={isProcessing}
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <Label htmlFor="totalTrips">Total Trips</Label>
                    <Input
                      id="totalTrips"
                      type="number"
                      value={totalTrips}
                      onChange={handleTotalTripsChange}
                      placeholder="Enter total trips"
                      disabled={isProcessing}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="balance">
              {driverId && (
                <BalanceTransactions 
                  driverId={driverId} 
                  currentBalance={driver?.pending_balance || 0}
                  onBalanceUpdate={fetchDriverDetails}
                />
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          {currentTab === 'edit' && (
            <Button onClick={saveChanges} disabled={isProcessing}>Save Changes</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
