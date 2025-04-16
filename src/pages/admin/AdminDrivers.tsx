
import React, { useEffect, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, CheckCircle, XCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { Tables } from '@/integrations/supabase/types';
import DriverDetailsModal from '@/components/admin/drivers/DriverDetailsModal';

type Driver = Tables<"users">;

const AdminDrivers = () => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  useEffect(() => {
    fetchDrivers();
  }, []);
  
  const fetchDrivers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('name');
        
      if (error) throw error;
      
      setDrivers(data || []);
    } catch (error) {
      console.error('Error fetching drivers:', error);
      toast.error('Failed to load drivers data');
    } finally {
      setLoading(false);
    }
  };
  
  const openDriverDetails = (driver: Driver) => {
    setSelectedDriver(driver);
    setIsModalOpen(true);
  };
  
  const toggleVerification = async (id: string, currentStatus: boolean | null) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_verified: !currentStatus })
        .eq('id', id);
        
      if (error) throw error;
      
      setDrivers(drivers.map(driver => 
        driver.id === id ? { ...driver, is_verified: !currentStatus } : driver
      ));
      
      toast.success(`Driver ${!currentStatus ? 'verified' : 'unverified'} successfully`);
    } catch (error) {
      console.error('Error updating driver:', error);
      toast.error('Failed to update driver verification status');
    }
  };
  
  const MobileDriverCard = ({ driver }: { driver: Driver }) => (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex items-center space-x-4 mb-4">
          <Avatar>
            <AvatarImage src={driver.profile_photo || undefined} />
            <AvatarFallback>{driver.name?.charAt(0) || 'U'}</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-medium">{driver.name}</h3>
            <p className="text-sm text-muted-foreground">{driver.email_id}</p>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Vehicle:</span>
            <span>{driver.vehicle_number || 'Not assigned'}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Shift:</span>
            {driver.shift ? (
              <Badge variant={driver.shift === 'morning' ? 'default' : 'secondary'}>
                {driver.shift}
              </Badge>
            ) : (
              'Not set'
            )}
          </div>
          
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Status:</span>
            <Badge variant={driver.online ? 'success' : 'destructive'}>
              {driver.online ? 'Online' : 'Offline'}
            </Badge>
          </div>
          
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Verification:</span>
            <Badge 
              variant={driver.is_verified ? 'success' : 'destructive'}
              className="cursor-pointer"
              onClick={() => toggleVerification(driver.id, driver.is_verified)}
            >
              {driver.is_verified ? 'Verified' : 'Unverified'}
            </Badge>
          </div>
          
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Documents:</span>
            <div className="flex space-x-1">
              {driver.license ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
              {driver.aadhar ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
              {driver.pan ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
            </div>
          </div>
        </div>
        
        <div className="mt-4 flex justify-end">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => openDriverDetails(driver)}
          >
            <Eye className="h-4 w-4 mr-1" /> View
          </Button>
        </div>
      </CardContent>
    </Card>
  );
  
  return (
    <AdminLayout title="Drivers Management">
      <Card>
        <CardContent className="p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-fleet-purple"></div>
            </div>
          ) : (
            <>
              <div className="md:hidden">
                {drivers.length === 0 ? (
                  <p className="text-center py-8">No drivers found</p>
                ) : (
                  drivers.map((driver) => (
                    <MobileDriverCard key={driver.id} driver={driver} />
                  ))
                )}
              </div>

              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Profile</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Shift</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Verified</TableHead>
                      <TableHead>Documents</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {drivers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8">
                          No drivers found
                        </TableCell>
                      </TableRow>
                    ) : (
                      drivers.map((driver) => (
                        <TableRow key={driver.id}>
                          <TableCell>
                            <Avatar>
                              <AvatarImage src={driver.profile_photo || undefined} />
                              <AvatarFallback>{driver.name?.charAt(0) || 'U'}</AvatarFallback>
                            </Avatar>
                          </TableCell>
                          <TableCell className="font-medium">{driver.name}</TableCell>
                          <TableCell>{driver.email_id}</TableCell>
                          <TableCell>{driver.vehicle_number || 'Not assigned'}</TableCell>
                          <TableCell>
                            {driver.shift ? (
                              <Badge variant={driver.shift === 'morning' ? 'default' : 'secondary'}>
                                {driver.shift}
                              </Badge>
                            ) : (
                              'Not set'
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={driver.online ? 'success' : 'destructive'}>
                              {driver.online ? 'Online' : 'Offline'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={driver.is_verified ? 'success' : 'destructive'}
                              className="cursor-pointer"
                              onClick={() => toggleVerification(driver.id, driver.is_verified)}
                            >
                              {driver.is_verified ? 'Verified' : 'Unverified'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-1">
                              {driver.license ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
                              {driver.aadhar ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
                              {driver.pan ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => openDriverDetails(driver)}
                            >
                              <Eye className="h-4 w-4 mr-1" /> View
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

      <DriverDetailsModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        driver={selectedDriver}
        onDriverUpdate={fetchDrivers}
      />
    </AdminLayout>
  );
};

export default AdminDrivers;
