
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

interface Driver {
  id: string;
  name: string;
  email: string;
  profile_photo: string | null;
  vehicle_number: string | null;
  is_verified: boolean | null;
  license: string | null;
  aadhar: string | null;
  pan: string | null;
  shift: string | null;
  online: boolean | null;
}

const AdminDrivers = () => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  
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
  
  return (
    <AdminLayout title="Drivers Management">
      <Card>
        <CardContent className="p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-fleet-purple"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
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
                            <AvatarFallback>{driver.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                        </TableCell>
                        <TableCell className="font-medium">{driver.name}</TableCell>
                        <TableCell>{driver.email}</TableCell>
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
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4 mr-1" /> View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default AdminDrivers;
