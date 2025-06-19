import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { format, isValid, parseISO, differenceInDays } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  CheckCircle,
  XCircle,
  Mail,
  Phone,
  Calendar,
  FileText,
  Car,
  IndianRupee,
  AlertCircle,
  Clock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BalanceTransactions } from "@/components/admin/drivers/BalanceTransactions";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
  TableHead,
} from "@/components/ui/table";
import { RentStatusBadge } from "@/components/RentStatusBadge";

interface DriverDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  driverId?: string;
  onDriverUpdate?: () => void;
}

type Vehicle = {
  vehicle_number: string;
  id: string;
};

export const DriverDetailsModal = ({
  isOpen,
  onClose,
  driverId,
  onDriverUpdate,
}: DriverDetailsModalProps) => {
  const [driver, setDriver] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isOnline, setIsOnline] = useState<boolean>(false);
  const [selectedShift, setSelectedShift] = useState<string>("");
  const [selectedVehicle, setSelectedVehicle] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [deposit, setDeposit] = useState<string>("0");
  const [totalTrips, setTotalTrips] = useState<string>("0");
  const [currentTab, setCurrentTab] = useState<string>("view");
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [joiningDate, setJoiningDate] = useState<string>("");
  const [driverId2, setDriverId2] = useState<string>("");
  const [rentalDays, setRentalDays] = useState<any>(null);
  const [rentHistory, setRentHistory] = useState<any[]>([]);
  const [isLoadingRent, setIsLoadingRent] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (currentTab === "balance" && driverId) {
      fetchDriverDetails();
    }
  }, [currentTab, driverId]);

  useEffect(() => {
    if (driverId && isOpen) {
      fetchDriverDetails();
      fetchVehicles();
      fetchOverdueData();
      fetchRentHistory();
    }
  }, [driverId, isOpen]);

  const fetchDriverDetails = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", driverId)
        .single();

      if (error) throw error;
      setDriver(data);
      setIsOnline(data.online || false);
      setSelectedShift(data.shift || "");
      setSelectedVehicle(data.vehicle_number || "");
      setDeposit(data.deposit_amount?.toString() || "0");
      setTotalTrips(data.total_trip?.toString() || "0");
      setName(data.name || "");
      setEmail(data.email_id || "");
      setPhone(data.phone_number || "");
      setJoiningDate(data.joining_date || "");
      setDriverId2(data.driver_id || "");
    } catch (error) {
      console.error("Error fetching driver details:", error);
      toast.error("Failed to load driver details");
    } finally {
      setLoading(false);
    }
  };

  const fetchVehicles = async () => {
    try {
      const { data, error } = await supabase.from("vehicles").select(`
          id,
          vehicle_number
        `);

      if (error) throw error;

      setVehicles(data);
    } catch (error) {
      console.error("Error fetching vehicles:", error);
      toast.error("Failed to load vehicles");
    }
  };

  const fetchOverdueData = async () => {
    try {
      const { data, error } = await supabase
        .from("fleet_reports")
        .select("*")
        .eq("user_id", driverId)
        .eq("status", "approved");
      // .eq("type", "due")
      // .order("created_at", { ascending: false });

      if (error) throw error;

      // Calculate overdue amounts
      const today = new Date();
      const rentaldays = data.length;
      setRentalDays(rentaldays);
    } catch (error) {
      console.error("Error fetching overdue data:", error);
    }
  };

  const fetchRentHistory = async () => {
    setIsLoadingRent(true);
    try {
      const { data, error } = await supabase
        .from("fleet_reports")
        .select("*")
        .eq("user_id", driverId)
        .order("rent_date", { ascending: false });

      if (error) throw error;
      setRentHistory(data || []);
    } catch (error) {
      console.error("Error fetching rent history:", error);
      toast.error("Failed to load rent history");
    } finally {
      setIsLoadingRent(false);
    }
  };
  function getWorkedDays(joiningDate: string | Date): number {
    const startDate = new Date(joiningDate);
    const endDate = new Date(); // Current date

    // Normalize time components to avoid partial day discrepancies
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);

    // Calculate the difference in milliseconds
    const diffInMilliseconds = endDate.getTime() - startDate.getTime();

    // Convert milliseconds to days
    const millisecondsInADay = 1000 * 60 * 60 * 24;
    const workedDays = Math.floor(diffInMilliseconds / millisecondsInADay);

    return workedDays;
  }

  const handleOnlineToggle = async () => {
    setIsProcessing(true);

    try {
      const updateData: any = {
        online: !isOnline,
      };

      if (isOnline) {
        updateData.offline_from_date = new Date().toISOString().split("T")[0];
      } else {
        updateData.online_from_date = new Date().toISOString().split("T")[0];
        updateData.offline_from_date = null;
      }

      const { error } = await supabase
        .from("users")
        .update(updateData)
        .eq("id", driverId);

      if (error) throw error;

      if (!isOnline) {
        const { error: historyError } = await supabase
          .from("rent_history")
          .insert({
            user_id: driverId,
            rent_date: new Date().toISOString().split("T")[0],
            is_online: true,
            payment_status: "active",
            shift: selectedShift,
          });

        if (historyError) throw historyError;
      }

      setIsOnline(!isOnline);
      toast.success(
        `Driver status updated to ${!isOnline ? "Online" : "Offline"}`
      );

      if (onDriverUpdate) onDriverUpdate();
    } catch (error) {
      console.error("Error updating driver status:", error);
      toast.error("Failed to update driver status");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVehicleChange = async (vehicleNumber: string) => {
    if (!vehicleNumber || vehicleNumber === selectedVehicle) return;

    setIsProcessing(true);

    try {
      const { error: updateError } = await supabase
        .from("users")
        .update({ vehicle_number: vehicleNumber })
        .eq("id", driverId);

      if (updateError) throw updateError;

      setSelectedVehicle(vehicleNumber);
      toast.success(`Vehicle assigned successfully: ${vehicleNumber}`);

      if (onDriverUpdate) onDriverUpdate();
    } catch (error) {
      console.error("Error assigning vehicle:", error);
      toast.error("Failed to assign vehicle");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleShiftChange = async (shift: string) => {
    if (!shift || shift === selectedShift) return;

    setIsProcessing(true);

    try {
      const today = new Date().toISOString().split("T")[0];

      const { error } = await supabase
        .from("users")
        .update({ shift })
        .eq("id", driverId);

      if (error) throw error;

      const { error: historyError } = await supabase
        .from("shift_history")
        .insert({
          user_id: driverId,
          shift,
          effective_from_date: today,
        });

      if (historyError) throw historyError;

      setSelectedShift(shift);
      toast.success(`Shift updated to ${shift}`);

      if (onDriverUpdate) onDriverUpdate();
    } catch (error) {
      console.error("Error updating shift:", error);
      toast.error("Failed to update shift");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDepositChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setDeposit(e.target.value);
  };

  const handleTotalTripsChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setTotalTrips(e.target.value);
  };

  const saveChanges = async () => {
    setIsProcessing(true);
    try {
      if (!name.trim()) {
        toast.error("Name is required");
        setIsProcessing(false);
        return;
      }

      const { error } = await supabase
        .from("users")
        .update({
          name,
          email_id: email,
          phone_number: phone,
          joining_date: joiningDate,
          driver_id: driverId2,
          deposit_amount: parseFloat(deposit) || 0,
          total_trip: parseFloat(totalTrips) || 0,
        })
        .eq("id", driverId);

      if (error) throw error;

      toast.success("Driver information updated successfully");
      if (onDriverUpdate) onDriverUpdate();
      onClose();
    } catch (error) {
      console.error("Error saving changes:", error);
      toast.error("Failed to save changes");
    } finally {
      setIsProcessing(false);
    }
  };

  const formattedJoiningDate = driver?.joining_date
    ? format(parseISO(driver.joining_date), "dd MMM yyyy")
    : "Not available";

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
      <DialogContent className={isMobile ? "sm:max-w-lg" : "max-w-4xl"}>
        <DialogHeader>
          <DialogTitle>Driver Details</DialogTitle>
          <DialogDescription>
            View and manage driver information
          </DialogDescription>
        </DialogHeader>

        <Tabs
          defaultValue="view"
          value={currentTab}
          onValueChange={setCurrentTab}
        >
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="view">View Details</TabsTrigger>
            <TabsTrigger value="edit">Edit Details</TabsTrigger>
            <TabsTrigger value="balance">Balance</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[calc(100vh-220px)] w-full">
            <TabsContent value="view" className="w-full">
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={driver?.profile_photo || undefined} />
                      <AvatarFallback>
                        {driver?.name?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle>{driver?.name}</CardTitle>
                      <CardDescription>
                        Driver ID: {driver?.driver_id}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    <Badge variant={driver?.online ? "success" : "destructive"}>
                      {driver?.online ? "Online" : "Offline"}
                    </Badge>
                    {driver?.shift && (
                      <Badge
                        variant={
                          driver?.shift === "morning" ? "default" : "secondary"
                        }
                      >
                        {driver?.shift}
                      </Badge>
                    )}
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Email:</span>
                      <span className="text-sm">
                        {driver?.email_id || "Not available"}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Phone:</span>
                      <span className="text-sm">
                        {driver?.phone_number || "Not available"}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Joining Date:</span>
                      <span className="text-sm">{formattedJoiningDate}, </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Car className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Vehicle:</span>
                      <span className="text-sm">
                        {driver?.vehicle_number || "Not assigned"}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Car className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        Total Rentals:
                      </span>
                      <span className="text-sm">{rentalDays} days</span>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="text-sm font-medium mb-2">Documents</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">License:</span>
                        {driver?.license ? (
                          <div className="flex items-center space-x-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2"
                              onClick={() =>
                                window.open(driver.license, "_blank")
                              }
                            >
                              View
                            </Button>
                          </div>
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Aadhar:</span>
                        {driver?.aadhar ? (
                          <div className="flex items-center space-x-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2"
                              onClick={() =>
                                window.open(driver.aadhar, "_blank")
                              }
                            >
                              View
                            </Button>
                          </div>
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">PAN:</span>
                        {driver?.pan ? (
                          <div className="flex items-center space-x-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2"
                              onClick={() => window.open(driver.pan, "_blank")}
                            >
                              View
                            </Button>
                          </div>
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Uber Profile:</span>
                        {driver?.uber_profile ? (
                          <div className="flex items-center space-x-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2"
                              onClick={() =>
                                window.open(driver.uber_profile, "_blank")
                              }
                            >
                              View
                            </Button>
                          </div>
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Total Trips:</span>
                      <span>{driver?.total_trip || "0"}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">
                        Deposit Amount:
                      </span>
                      <div className="flex items-center">
                        <IndianRupee className="h-3 w-3 mr-1" />
                        <span>{driver?.deposit_amount || "0"}</span>
                      </div>
                    </div>
                  </div>

                  {/* {overdueData && overdueData.totalOverdue > 0 && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2 text-red-500">
                          <AlertCircle className="h-4 w-4" />
                          <span className="text-sm font-medium">
                            Overdue Amounts
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Total Overdue:</span>
                          <div className="flex items-center text-red-500">
                            <IndianRupee className="h-3 w-3 mr-1" />
                            <span>{overdueData.totalOverdue}</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Overdue Count:</span>
                          <span>{overdueData.overdueCount}</span>
                        </div>
                        {overdueData.lastOverdueDate && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm">Last Overdue:</span>
                            <span>
                              {format(
                                new Date(overdueData.lastOverdueDate),
                                "dd MMM yyyy"
                              )}
                            </span>
                          </div>
                        )}
                      </div>
                    </>
                  )} */}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="edit" className="w-full">
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
                        {isOnline ? "Online" : "Offline"}
                      </Label>

                      {!isOnline && driver?.offline_from_date && (
                        <span className="text-xs text-muted-foreground">
                          (Offline since{" "}
                          {format(new Date(driver.offline_from_date), "PP")})
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

                  <div className="space-y-2">
                    <Label htmlFor="vehicle">Assigned Vehicle</Label>
                    <Input
                      id="vehicle-search"
                      placeholder="Search last 4 digits of vehicle number..."
                      onChange={(e) => {
                        const searchQuery = e.target.value.toLowerCase();
                        setVehicles((prevVehicles) =>
                          prevVehicles.filter((vehicle) =>
                            vehicle.vehicle_number
                              .slice(-4) // Extract last 4 digits
                              .toLowerCase()
                              .includes(searchQuery)
                          )
                        );
                      }}
                    />
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
                          <SelectItem
                            key={vehicle.id}
                            value={vehicle.vehicle_number}
                          >
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

            <TabsContent value="balance" className="w-full">
              {driverId && (
                <div className="w-full">
                  <BalanceTransactions
                    driverId={driverId}
                    currentBalance={driver?.pending_balance || 0}
                    onBalanceUpdate={fetchDriverDetails}
                  />
                </div>
              )}
            </TabsContent>

            <TabsContent value="transactions" className="w-full">
              {driverId && (
                <div className="w-full space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg font-medium">
                        Rent History
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {isLoadingRent ? (
                        <div className="flex justify-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                        </div>
                      ) : (
                        <div className="rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Shift</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Amount</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {rentHistory.map((record) => (
                                <TableRow key={record.id}>
                                  <TableCell className="font-medium">
                                    <div className="flex items-center gap-2">
                                      <Calendar className="h-4 w-4 text-muted-foreground" />
                                      {format(
                                        new Date(record.rent_date),
                                        "dd MMM yyyy"
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell className="capitalize">
                                    {record.shift}
                                  </TableCell>
                                  <TableCell>
                                    <Badge
                                      variant={
                                        record.status === "approved"
                                          ? "success"
                                          : record.status === "leave"
                                          ? "default"
                                          : record.status ===
                                            "pending_verification"
                                          ? "secondary"
                                          : "destructive"
                                      }
                                    >
                                      {record.status}
                                    </Badge>
                                  </TableCell>
                                  <TableCell
                                    className={`whitespace-nowrap ${
                                      record.rent_paid_amount < 0
                                        ? "text-green-500"
                                        : "text-red-500"
                                    }`}
                                  >
                                    ₹
                                    {(record.rent_paid_amount > 0
                                      ? -record.rent_paid_amount
                                      : Math.abs(record.rent_paid_amount)
                                    ).toLocaleString()}
                                  </TableCell>
                                </TableRow>
                              ))}
                              {(!rentHistory || rentHistory.length === 0) && (
                                <TableRow>
                                  <TableCell
                                    colSpan={4}
                                    className="h-24 text-center"
                                  >
                                    No rent history found
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* <Card>
                    <CardHeader>
                      <CardTitle className="text-lg font-medium">
                        Balance Transactions
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <BalanceTransactions
                        driverId={driverId}
                        currentBalance={driver?.pending_balance || 0}
                        onBalanceUpdate={fetchDriverDetails}
                      />
                    </CardContent>
                  </Card> */}
                </div>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {currentTab === "edit" && (
            <Button onClick={saveChanges} disabled={isProcessing}>
              Save Changes
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
