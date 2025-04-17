
import React, { useEffect, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, CheckCircle, XCircle, Car, IndianRupee, Users, Filter, Search } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { Tables } from '@/integrations/supabase/types';
import { DriverDetailsModal } from '@/components/admin/drivers/DriverDetailsModal';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Driver = Tables<"users">;

const AdminDrivers = () => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [filteredDrivers, setFilteredDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [shiftFilter, setShiftFilter] = useState<string>('all');
  const [verificationFilter, setVerificationFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  
  useEffect(() => {
    fetchDrivers();
  }, []);
  
  useEffect(() => {
    // Apply filters when any filter changes
    applyFilters();
  }, [drivers, showOnlineOnly, searchQuery, shiftFilter, verificationFilter]);
  
  const fetchDrivers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('name');
        
      if (error) throw error;
      
      setDrivers(data || []);
      setFilteredDrivers(data || []);
    } catch (error) {
      console.error('Error fetching drivers:', error);
      toast.error('Failed to load drivers data');
    } finally {
      setLoading(false);
    }
  };
  
  const applyFilters = () => {
    let result = [...drivers];
    
    // Filter by online status
    if (showOnlineOnly) {
      result = result.filter(driver => driver.online);
    }
    
    // Filter by search query (name, email, vehicle number)
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(driver => 
        (driver.name?.toLowerCase().includes(query)) || 
        (driver.email_id?.toLowerCase().includes(query)) || 
        (driver.vehicle_number?.toLowerCase().includes(query)) ||
        (driver.driver_id?.toLowerCase().includes(query))
      );
    }
    
    // Filter by shift
    if (shiftFilter !== 'all') {
      result = result.filter(driver => driver.shift === shiftFilter);
    }
    
    // Filter by verification status
    if (verificationFilter !== 'all') {
      const isVerified = verificationFilter === 'verified';
      result = result.filter(driver => driver.is_verified === isVerified);
    }
    
    setFilteredDrivers(result);
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

  const handleOnlineFilterToggle = (checked: boolean) => {
    setShowOnlineOnly(checked);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleShiftFilterChange = (value: string) => {
    setShiftFilter(value);
  };

  const handleVerificationFilterChange = (value: string) => {
    setVerificationFilter(value);
  };

  const resetFilters = () => {
    setSearchQuery('');
    setShiftFilter('all');
    setVerificationFilter('all');
    setShowOnlineOnly(false);
  };

  const toggleFilters = () => {
    setShowFilters(!showFilters);
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

          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Total Trips:</span>
            <span>{driver.total_trip || '0'}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Deposit:</span>
            <span className="flex items-center">
              <IndianRupee className="h-3 w-3 mr-1" /> 
              {driver.deposit_amount || '0'}
            </span>
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
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <span>Total Drivers: {drivers.length}</span>
              <span className="ml-2 text-green-500">Online: {drivers.filter(d => d.online).length}</span>
              <span className="ml-2 text-red-500">Offline: {drivers.filter(d => !d.online).length}</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Switch 
                  id="online-filter" 
                  checked={showOnlineOnly} 
                  onCheckedChange={handleOnlineFilterToggle}
                />
                <Label htmlFor="online-filter">Show online drivers only</Label>
              </div>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={toggleFilters}
                className="flex items-center"
              >
                <Filter className="h-4 w-4 mr-1" />
                {showFilters ? 'Hide Filters' : 'Show Filters'}
              </Button>
            </div>
          </div>
          
          {showFilters && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label htmlFor="search">Search</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search by name, email, vehicle..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                    className="pl-8"
                  />
                </div>
              </div>
              
              <div className="space-y-1">
                <Label htmlFor="shift-filter">Shift</Label>
                <Select 
                  value={shiftFilter} 
                  onValueChange={handleShiftFilterChange}
                >
                  <SelectTrigger id="shift-filter">
                    <SelectValue placeholder="Filter by shift" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Shifts</SelectItem>
                    <SelectItem value="morning">Morning</SelectItem>
                    <SelectItem value="night">Night</SelectItem>
                    <SelectItem value="24hr">24 Hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-1">
                <Label htmlFor="verification-filter">Verification</Label>
                <Select 
                  value={verificationFilter} 
                  onValueChange={handleVerificationFilterChange}
                >
                  <SelectTrigger id="verification-filter">
                    <SelectValue placeholder="Filter by verification" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="verified">Verified</SelectItem>
                    <SelectItem value="unverified">Unverified</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="md:col-span-3 flex justify-end">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={resetFilters}
                >
                  Reset Filters
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-fleet-purple"></div>
            </div>
          ) : (
            <>
              <div className="md:hidden">
                {filteredDrivers.length === 0 ? (
                  <p className="text-center py-8">No drivers found</p>
                ) : (
                  filteredDrivers.map((driver) => (
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
                      <TableHead>Trips</TableHead>
                      <TableHead>Deposit</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDrivers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center py-8">
                          No drivers found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredDrivers.map((driver) => (
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
                          <TableCell>{driver.total_trip || '0'}</TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <IndianRupee className="h-3 w-3 mr-1" />
                              {driver.deposit_amount || '0'}
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
        driverId={selectedDriver?.id}
        onDriverUpdate={fetchDrivers}
      />
    </AdminLayout>
  );
};

export default AdminDrivers;
