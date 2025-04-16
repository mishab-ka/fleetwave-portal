import React, { useEffect, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PlusCircle, Edit, Car } from 'lucide-react';
import { toast } from 'sonner';
import { Tables } from '@/integrations/supabase/types';

type Vehicle = Tables<"vehicles">;

const AdminVehicles = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchVehicles();
  }, []);
  
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
    } finally {
      setLoading(false);
    }
  };
  
  const toggleVehicleStatus = async (id: string | null, currentStatus: boolean | null) => {
    if (!id) return;
    
    try {
      const { error } = await supabase
        .from('vehicles')
        .update({ online: !currentStatus })
        .eq('id', id);
        
      if (error) throw error;
      
      setVehicles(vehicles.map(vehicle => 
        vehicle.id === id ? { ...vehicle, online: !currentStatus } : vehicle
      ));
      
      toast.success(`Vehicle status updated successfully`);
    } catch (error) {
      console.error('Error updating vehicle:', error);
      toast.error('Failed to update vehicle status');
    }
  };

  const MobileVehicleCard = ({ vehicle }: { vehicle: Vehicle }) => (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex justify-between">
            <h3 className="font-medium">{vehicle.vehicle_number}</h3>
            <Badge 
              variant={vehicle.online ? 'success' : 'destructive'}
              className="cursor-pointer"
              onClick={() => toggleVehicleStatus(vehicle.id, vehicle.online)}
            >
              {vehicle.online ? 'Active' : 'Inactive'}
            </Badge>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Fleet:</span>
              <span>{vehicle.fleet_name || 'N/A'}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Total Trips:</span>
              <span>{vehicle.total_trips || 0}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Deposit:</span>
              <span>₹{vehicle.deposit?.toLocaleString() || '0'}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Added On:</span>
              <span>
                {vehicle.created_at 
                  ? new Date(vehicle.created_at).toLocaleDateString() 
                  : 'N/A'}
              </span>
            </div>
          </div>

          <div className="mt-3 flex justify-end">
            <Button variant="ghost" size="sm">
              <Edit className="h-4 w-4 mr-1" /> Edit
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const StatsCards = () => (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Total Vehicles</CardTitle>
          <Car className="h-5 w-5 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{vehicles.length}</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Active Vehicles</CardTitle>
          <Car className="h-5 w-5 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {vehicles.filter(v => v.online).length}
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Inactive Vehicles</CardTitle>
          <Car className="h-5 w-5 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {vehicles.filter(v => !v.online).length}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <AdminLayout title="Vehicles Management">
      <div className="flex justify-end mb-6">
        <Button>
          <PlusCircle className="h-4 w-4 mr-2" /> Add New Vehicle
        </Button>
      </div>

      <StatsCards />
      
      <Card>
        <CardContent className="p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-fleet-purple"></div>
            </div>
          ) : (
            <>
              <div className="md:hidden">
                {vehicles.length === 0 ? (
                  <p className="text-center py-8">No vehicles found</p>
                ) : (
                  vehicles.map((vehicle) => (
                    <MobileVehicleCard key={vehicle.id} vehicle={vehicle} />
                  ))
                )}
              </div>

              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vehicle Number</TableHead>
                      <TableHead>Fleet Name</TableHead>
                      <TableHead>Total Trips</TableHead>
                      <TableHead>Deposit Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Added On</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vehicles.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          No vehicles found
                        </TableCell>
                      </TableRow>
                    ) : (
                      vehicles.map((vehicle) => (
                        <TableRow key={vehicle.id || vehicle.vehicle_number}>
                          <TableCell className="font-medium">{vehicle.vehicle_number}</TableCell>
                          <TableCell>{vehicle.fleet_name || 'N/A'}</TableCell>
                          <TableCell>{vehicle.total_trips || 0}</TableCell>
                          <TableCell>₹{vehicle.deposit?.toLocaleString() || '0'}</TableCell>
                          <TableCell>
                            <Badge 
                              variant={vehicle.online ? 'success' : 'destructive'}
                              className="cursor-pointer"
                              onClick={() => toggleVehicleStatus(vehicle.id, vehicle.online)}
                            >
                              {vehicle.online ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {vehicle.created_at 
                              ? new Date(vehicle.created_at).toLocaleDateString() 
                              : 'N/A'}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4 mr-1" /> Edit
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default AdminVehicles;
