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
import { useActivityLogger } from "@/hooks/useActivityLogger";
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
  CreditCard,
  User,
  Ban,
  AlertTriangle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BalanceTransactions } from "@/components/admin/drivers/BalanceTransactions";
import { PenaltyManagement } from "./PenaltyManagement";
import AccommodationAssignment from "./AccommodationAssignment";
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
import { useAuth } from "@/context/AuthContext";

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
  const { user } = useAuth();
  const { logActivity } = useActivityLogger();
  const [driver, setDriver] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isOnline, setIsOnline] = useState<boolean>(false);
  const [selectedShift, setSelectedShift] = useState<string>("");
  const [selectedVehicle, setSelectedVehicle] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<
    "hub_base" | "salary_base"
  >("hub_base");
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
  const [resigningDate, setResigningDate] = useState<string>("");
  const [resignationReason, setResignationReason] = useState<string>("");
  const [dateOfBirth, setDateOfBirth] = useState<string>("");
  const [isPenaltyModalOpen, setIsPenaltyModalOpen] = useState<boolean>(false);
  const [showOverdueWarning, setShowOverdueWarning] = useState(false);
  const [overdueAmount, setOverdueAmount] = useState(0);
  const [enableDepositCollection, setEnableDepositCollection] =
    useState<boolean>(true);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [showDocumentWarning, setShowDocumentWarning] = useState(false);
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
      checkAdminStatus();
    }
  }, [driverId, isOpen, user]);

  const checkAdminStatus = async () => {
    if (!user) {
      setIsAdmin(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      setIsAdmin(data?.role === "admin" || data?.role === "super_admin");
    } catch (error) {
      console.error("Error checking admin status:", error);
      setIsAdmin(false);
    }
  };

  const checkAllDocumentsUploaded = (): {
    allUploaded: boolean;
    missing: string[];
  } => {
    const requiredDocuments = [
      { key: "license_front", name: "License Front" },
      { key: "license_back", name: "License Back" },
      { key: "aadhar_front", name: "Aadhar Front" },
      { key: "aadhar_back", name: "Aadhar Back" },
      { key: "pan_front", name: "PAN Front" },
      { key: "pan_back", name: "PAN Back" },
    ];

    const missing: string[] = [];

    requiredDocuments.forEach((doc) => {
      if (!driver || !driver[doc.key]) {
        missing.push(doc.name);
      }
    });

    return {
      allUploaded: missing.length === 0,
      missing,
    };
  };

  const fetchDriverDetails = async () => {
    setLoading(true);
    try {
      // Fetch driver details with accommodation information
      const { data: driverData, error: driverError } = await supabase
        .from("users")
        .select(
          `
          *,
          current_bed_assignment:bed_assignments!bed_assignments_user_id_fkey(
            *,
            bed:beds(
              *,
              room:rooms(*)
            )
          )
        `,
        )
        .eq("id", driverId)
        .eq("current_bed_assignment.status", "active")
        .is("current_bed_assignment.end_date", null)
        .single();

      if (driverError) throw driverError;

      setDriver(driverData);
      setIsOnline(driverData.online || false);
      setSelectedShift(driverData.shift || "none");
      setSelectedVehicle(driverData.vehicle_number || "");
      setSelectedCategory(driverData.driver_category || "hub_base");
      setDeposit(driverData.deposit_amount?.toString() || "0");
      setTotalTrips(driverData.total_trip?.toString() || "0");
      setName(driverData.name || "");
      setEmail(driverData.email_id || "");
      setPhone(driverData.phone_number || "");
      setJoiningDate(driverData.joining_date || "");
      setDriverId2(driverData.driver_id || "");
      setDateOfBirth(driverData.date_of_birth || "");
      setResigningDate(driverData.resigning_date || "");
      setResignationReason(driverData.resignation_reason || "");
      setEnableDepositCollection(driverData.enable_deposit_collection ?? true);
    } catch (error) {
      console.error("Error fetching driver details:", error);
      toast.error("Failed to load driver details");
    } finally {
      setLoading(false);
    }
  };

  const fetchVehicles = async () => {
    try {
      const { data, error } = await supabase
        .from("vehicles")
        .select(
          `
          id,
          vehicle_number
        `,
        )
        .eq("online", true);

      if (error) throw error;

      setVehicles(data);
    } catch (error) {
      console.error("Error fetching vehicles:", error);
      toast.error("Failed to load vehicles");
    }
  };

  const handleToggleDepositCollection = async (enabled: boolean) => {
    if (!driverId) return;

    try {
      setIsProcessing(true);

      const { error } = await supabase
        .from("users")
        .update({ enable_deposit_collection: enabled })
        .eq("id", driverId);

      if (error) throw error;

      setEnableDepositCollection(enabled);
      toast.success(
        `Deposit collection ${enabled ? "enabled" : "disabled"} successfully`,
      );

      if (onDriverUpdate) {
        onDriverUpdate();
      }
    } catch (error) {
      console.error("Error toggling deposit collection:", error);
      toast.error("Failed to update deposit collection status");
      // Revert the state on error
      setEnableDepositCollection(!enabled);
    } finally {
      setIsProcessing(false);
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

  const checkOverduePayments = async (): Promise<number> => {
    try {
      // Check driver's pending balance
      const { data: driverData, error: driverError } = await supabase
        .from("users")
        .select("pending_balance, total_penalties, net_balance")
        .eq("id", driverId)
        .single();

      if (driverError) throw driverError;

      // Check for negative balance or penalties
      const negativeBalance = (driverData?.pending_balance || 0) < 0;
      const hasPenalties = (driverData?.total_penalties || 0) > 0;
      const negativeNetBalance = (driverData?.net_balance || 0) < 0;

      if (negativeBalance || hasPenalties || negativeNetBalance) {
        const overdueAmount =
          Math.abs(driverData?.pending_balance || 0) +
          (driverData?.total_penalties || 0) +
          Math.abs(Math.min(0, driverData?.net_balance || 0));
        return overdueAmount;
      }

      return 0;
    } catch (error) {
      console.error("Error checking overdue payments:", error);
      return 0;
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
    // Check if user is admin
    if (!isAdmin) {
      toast.error("Only admins can change driver online status");
      return;
    }

    // If trying to put driver online, check if all documents are uploaded
    if (!isOnline) {
      const documentCheck = checkAllDocumentsUploaded();
      if (!documentCheck.allUploaded) {
        setShowDocumentWarning(true);
        toast.error(
          `Cannot put driver online. Missing documents: ${documentCheck.missing.join(
            ", ",
          )}`,
        );
        return;
      }
    }

    // If trying to take driver offline, check for overdue payments
    if (isOnline) {
      const overdueAmount = await checkOverduePayments();
      if (overdueAmount > 0) {
        setOverdueAmount(overdueAmount);
        setShowOverdueWarning(true);

        // Auto-hide warning after 5 seconds
        setTimeout(() => {
          setShowOverdueWarning(false);
        }, 5000);

        return; // Don't proceed with offline action
      }
    }

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

      // Refresh driver details to get latest document status
      await fetchDriverDetails();

      toast.success(
        `Driver status updated to ${!isOnline ? "Online" : "Offline"}`,
      );

      if (onDriverUpdate) onDriverUpdate();
    } catch (error) {
      console.error("Error updating driver status:", error);
      toast.error("Failed to update driver status");
    } finally {
      setIsProcessing(false);
    }
  };

  // Validation function for vehicle/shift assignment
  const validateVehicleShiftAssignment = (
    vehicle: string | null,
    shift: string | null,
  ): { isValid: boolean; error?: string } => {
    const hasVehicle = vehicle && vehicle !== "No Vehicle";
    const hasShift = shift && shift !== "none";

    // Valid combinations:
    // 1. Both assigned: vehicle + shift
    // 2. Both not assigned: no vehicle + no shift

    // Invalid: vehicle without shift
    if (hasVehicle && !hasShift) {
      return {
        isValid: false,
        error:
          "Cannot assign vehicle without shift. Please assign a shift (morning/night) or remove the vehicle.",
      };
    }

    // Invalid: shift without vehicle
    if (hasShift && !hasVehicle) {
      return {
        isValid: false,
        error:
          "Cannot assign shift without vehicle. Please assign a vehicle number or set shift to 'none'.",
      };
    }

    return { isValid: true };
  };

  const handleVehicleChange = (vehicleNumber: string) => {
    // Just update the local state, don't save yet
    // If removing vehicle, also clear shift
    if (vehicleNumber === "No Vehicle") {
      setSelectedVehicle(vehicleNumber);
      setSelectedShift("none");
    } else {
      setSelectedVehicle(vehicleNumber);
    }
  };

  const handleShiftChange = (shift: string) => {
    // Just update the local state, don't save yet
    // If removing shift, also clear vehicle
    if (shift === "none") {
      setSelectedShift(shift);
      setSelectedVehicle("No Vehicle");
    } else {
      setSelectedShift(shift);
    }
  };

  const handleCategoryChange = async (category: "hub_base" | "salary_base") => {
    if (!category || category === selectedCategory) return;

    setIsProcessing(true);

    try {
      const { error } = await supabase
        .from("users")
        .update({ driver_category: category })
        .eq("id", driverId);

      if (error) throw error;

      setSelectedCategory(category);
      toast.success(
        `Driver category updated to ${
          category === "salary_base" ? "Salary Base" : "Hub Base"
        }`,
      );

      if (onDriverUpdate) onDriverUpdate();
    } catch (error) {
      console.error("Error updating category:", error);
      toast.error("Failed to update driver category");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDepositChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setDeposit(e.target.value);
  };

  const handleTotalTripsChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
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

      // Validate vehicle/shift combination before saving
      const newVehicle =
        selectedVehicle === "No Vehicle" ? null : selectedVehicle;
      const newShift = selectedShift; // Keep "none" as string, don't convert to null

      const validation = validateVehicleShiftAssignment(newVehicle, newShift);
      if (!validation.isValid) {
        toast.error(validation.error || "Invalid vehicle/shift combination");
        setIsProcessing(false);
        return;
      }

      const today = new Date().toISOString().split("T")[0];

      const { error } = await supabase
        .from("users")
        .update({
          name,
          email_id: email,
          phone_number: phone,
          joining_date: joiningDate,
          driver_id: driverId2,
          date_of_birth: dateOfBirth || null,
          deposit_amount: parseFloat(deposit) || 0,
          total_trip: parseFloat(totalTrips) || 0,
          resigning_date: resigningDate || null,
          resignation_reason: resignationReason || null,
          vehicle_number: newVehicle,
          shift: newShift,
        })
        .eq("id", driverId);

      if (error) throw error;

      // Add shift history if shift is being set (but not for "none")
      if (newShift && newShift !== "none") {
        try {
          await supabase.from("shift_history").insert({
            user_id: driverId,
            shift: newShift,
            effective_from_date: today,
          });
        } catch (historyError) {
          console.log("Could not save shift history:", historyError);
          // Continue anyway as this is not critical
        }
      }

      toast.success("Driver information updated successfully");

      // Log activity
      const changes = [];
      if (driver.vehicle_number !== newVehicle) {
        changes.push(
          `vehicle: ${driver.vehicle_number || "none"} → ${
            newVehicle || "none"
          }`,
        );
      }
      if (driver.shift !== newShift) {
        changes.push(
          `shift: ${driver.shift || "none"} → ${newShift || "none"}`,
        );
      }

      if (changes.length > 0) {
        await logActivity({
          actionType: "edit_driver",
          actionCategory: "drivers",
          description: `Updated driver ${name} - Changed ${changes.join(", ")}`,
          metadata: {
            driver_id: driverId,
            driver_name: name,
            old_vehicle: driver.vehicle_number,
            new_vehicle: newVehicle,
            old_shift: driver.shift,
            new_shift: newShift,
          },
          oldValue: `Vehicle: ${driver.vehicle_number || "none"}, Shift: ${
            driver.shift || "none"
          }`,
          newValue: `Vehicle: ${newVehicle || "none"}, Shift: ${
            newShift || "none"
          }`,
          pageName: "Driver Details Modal",
        });
      }

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
      <DialogContent className={isMobile ? "sm:max-w-lg" : "max-w-6xl"}>
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
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="details">View Details</TabsTrigger>
            <TabsTrigger value="edit">Edit Details</TabsTrigger>
            <TabsTrigger value="view">Deposit Management</TabsTrigger>
            <TabsTrigger value="balance">Penalty Management</TabsTrigger>
            <TabsTrigger value="accommodation">Accommodation</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[calc(100vh-220px)] w-full">
            <TabsContent value="view" className="w-full">
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

            <TabsContent value="details" className="w-full">
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

                    {/* Accommodation Information */}
                    {driver?.current_bed_assignment &&
                    driver.current_bed_assignment.length > 0 ? (
                      <>
                        <div className="flex items-center space-x-2">
                          <div className="h-4 w-4 text-muted-foreground flex items-center justify-center">
                            🏠
                          </div>
                          <span className="text-sm font-medium">Room:</span>
                          <span className="text-sm">
                            {driver.current_bed_assignment[0]?.bed?.room
                              ?.room_name || "Not assigned"}
                          </span>
                        </div>

                        <div className="flex items-center space-x-2">
                          <div className="h-4 w-4 text-muted-foreground flex items-center justify-center">
                            🛏️
                          </div>
                          <span className="text-sm font-medium">
                            Bed Space:
                          </span>
                          <span className="text-sm">
                            {driver.current_bed_assignment[0]?.bed?.bed_name ||
                              "Not assigned"}
                          </span>
                        </div>

                        <div className="flex items-center space-x-2">
                          <div className="h-4 w-4 text-muted-foreground flex items-center justify-center">
                            ⏰
                          </div>
                          <span className="text-sm font-medium">Shift:</span>
                          <Badge
                            variant={
                              driver.current_bed_assignment[0]?.shift ===
                              "morning"
                                ? "default"
                                : "secondary"
                            }
                            className="text-xs"
                          >
                            {driver.current_bed_assignment[0]?.shift ||
                              "Not assigned"}
                          </Badge>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <div className="h-4 w-4 text-muted-foreground flex items-center justify-center">
                          🏠
                        </div>
                        <span className="text-sm font-medium">
                          Accommodation:
                        </span>
                        <span className="text-sm text-gray-500 italic">
                          Not assigned
                        </span>
                      </div>
                    )}

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

                  {/* Account Details and DOB Section */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">
                      Account Details & Personal Info
                    </h4>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          Account Number:
                        </span>
                        <span className="text-sm">
                          {driver?.account_number || "Not provided"}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">IFSC Code:</span>
                        <span className="text-sm">
                          {driver?.ifsc_code || "Not provided"}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Bank Name:</span>
                        <span className="text-sm">
                          {driver?.bank_name || "Not provided"}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          Date of Birth:
                        </span>
                        <span className="text-sm">
                          {driver?.date_of_birth
                            ? format(
                                new Date(driver.date_of_birth),
                                "dd MMM yyyy",
                              )
                            : "Not provided"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Deposit Collection Toggle */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-blue-900 mb-1 flex items-center gap-2">
                          <IndianRupee className="h-4 w-4" />
                          Deposit Collection
                        </h4>
                        <p className="text-xs text-blue-700">
                          {enableDepositCollection
                            ? "Deposit cutting is enabled for this driver"
                            : "Deposit cutting is disabled for this driver"}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-medium text-blue-900">
                          {enableDepositCollection ? "ON" : "OFF"}
                        </span>
                        <Switch
                          checked={enableDepositCollection}
                          onCheckedChange={handleToggleDepositCollection}
                          disabled={isProcessing}
                          className="data-[state=checked]:bg-green-500"
                        />
                      </div>
                    </div>
                    {!enableDepositCollection && (
                      <div className="mt-3 flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                        <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                        <span>
                          No deposit will be collected from this driver's
                          reports until this is turned back on.
                        </span>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Resignation Details Section */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">
                      Resignation Details
                    </h4>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          Resigning Date:
                        </span>
                        <span className="text-sm">
                          {driver?.resigning_date
                            ? format(
                                new Date(driver.resigning_date),
                                "dd MMM yyyy",
                              )
                            : "Not set"}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          Resignation Reason:
                        </span>
                        <span className="text-sm">
                          {driver?.resignation_reason || "Not provided"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="text-sm font-medium mb-2">Documents</h4>
                    <div className="space-y-4">
                      {/* License - Front and Back */}
                      <div>
                        <div className="flex items-center space-x-2 mb-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            Driving License:
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 ml-6">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-500">
                              Front:
                            </span>
                            {driver?.license_front ? (
                              <div className="flex items-center space-x-1">
                                <CheckCircle className="h-3 w-3 text-green-500" />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 px-1 text-xs"
                                  onClick={() =>
                                    window.open(driver.license_front, "_blank")
                                  }
                                >
                                  View
                                </Button>
                              </div>
                            ) : (
                              <XCircle className="h-3 w-3 text-red-500" />
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-500">Back:</span>
                            {driver?.license_back ? (
                              <div className="flex items-center space-x-1">
                                <CheckCircle className="h-3 w-3 text-green-500" />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 px-1 text-xs"
                                  onClick={() =>
                                    window.open(driver.license_back, "_blank")
                                  }
                                >
                                  View
                                </Button>
                              </div>
                            ) : (
                              <XCircle className="h-3 w-3 text-red-500" />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Aadhar - Front and Back */}
                      <div>
                        <div className="flex items-center space-x-2 mb-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            Aadhar Card:
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 ml-6">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-500">
                              Front:
                            </span>
                            {driver?.aadhar_front ? (
                              <div className="flex items-center space-x-1">
                                <CheckCircle className="h-3 w-3 text-green-500" />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 px-1 text-xs"
                                  onClick={() =>
                                    window.open(driver.aadhar_front, "_blank")
                                  }
                                >
                                  View
                                </Button>
                              </div>
                            ) : (
                              <XCircle className="h-3 w-3 text-red-500" />
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-500">Back:</span>
                            {driver?.aadhar_back ? (
                              <div className="flex items-center space-x-1">
                                <CheckCircle className="h-3 w-3 text-green-500" />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 px-1 text-xs"
                                  onClick={() =>
                                    window.open(driver.aadhar_back, "_blank")
                                  }
                                >
                                  View
                                </Button>
                              </div>
                            ) : (
                              <XCircle className="h-3 w-3 text-red-500" />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* PAN - Front and Back */}
                      <div>
                        <div className="flex items-center space-x-2 mb-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">PAN Card:</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 ml-6">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-500">
                              Front:
                            </span>
                            {driver?.pan_front ? (
                              <div className="flex items-center space-x-1">
                                <CheckCircle className="h-3 w-3 text-green-500" />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 px-1 text-xs"
                                  onClick={() =>
                                    window.open(driver.pan_front, "_blank")
                                  }
                                >
                                  View
                                </Button>
                              </div>
                            ) : (
                              <XCircle className="h-3 w-3 text-red-500" />
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-500">Back:</span>
                            {driver?.pan_back ? (
                              <div className="flex items-center space-x-1">
                                <CheckCircle className="h-3 w-3 text-green-500" />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 px-1 text-xs"
                                  onClick={() =>
                                    window.open(driver.pan_back, "_blank")
                                  }
                                >
                                  View
                                </Button>
                              </div>
                            ) : (
                              <XCircle className="h-3 w-3 text-red-500" />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Bank Document - Front and Back */}
                      <div>
                        <div className="flex items-center space-x-2 mb-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            Bank Document:
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 ml-6">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-500">
                              Front:
                            </span>
                            {driver?.bank_front ? (
                              <div className="flex items-center space-x-1">
                                <CheckCircle className="h-3 w-3 text-green-500" />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 px-1 text-xs"
                                  onClick={() =>
                                    window.open(driver.bank_front, "_blank")
                                  }
                                >
                                  View
                                </Button>
                              </div>
                            ) : (
                              <XCircle className="h-3 w-3 text-red-500" />
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-500">Back:</span>
                            {driver?.bank_back ? (
                              <div className="flex items-center space-x-1">
                                <CheckCircle className="h-3 w-3 text-green-500" />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 px-1 text-xs"
                                  onClick={() =>
                                    window.open(driver.bank_back, "_blank")
                                  }
                                >
                                  View
                                </Button>
                              </div>
                            ) : (
                              <XCircle className="h-3 w-3 text-red-500" />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Uber Profile - Single */}
                      <div>
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
                  </div>

                  <Separator />

                  {/* Cash Trip Blocking Section */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">
                      Cash Trip Management
                    </h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Ban className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            Cash Trip Blocked:
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-muted-foreground">
                            {driver?.cash_trip_blocked ? "Blocked" : "Allowed"}
                          </span>
                          <Switch
                            checked={driver?.cash_trip_blocked || false}
                            onCheckedChange={async (checked) => {
                              try {
                                const { error } = await supabase
                                  .from("users")
                                  .update({ cash_trip_blocked: checked })
                                  .eq("id", driverId);

                                if (error) throw error;

                                toast.success(
                                  `Cash trip ${
                                    checked ? "blocked" : "unblocked"
                                  } for ${driver?.name}`,
                                );
                                fetchDriverDetails(); // Refresh data
                                if (onDriverUpdate) onDriverUpdate();
                              } catch (error) {
                                console.error(
                                  "Error updating cash trip block:",
                                  error,
                                );
                                toast.error(
                                  "Failed to update cash trip block status",
                                );
                              }
                            }}
                          />
                        </div>
                      </div>

                      {driver?.cash_trip_blocked && (
                        <div className="text-xs text-muted-foreground bg-yellow-50 p-2 rounded">
                          <AlertTriangle className="h-3 w-3 inline mr-1" />
                          This driver is blocked from cash trips due to overdue
                          payments or missing submissions.
                        </div>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Penalty Management Section */}
                  {/* <div>
                    <h4 className="text-sm font-medium mb-2">
                      Penalty Management
                    </h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <AlertCircle className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            Total Penalties:
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-red-600 font-medium">
                            ₹{driver?.total_penalties?.toLocaleString() || "0"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <AlertCircle className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            Net Balance:
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span
                            className={`text-sm font-medium ${
                              (driver?.net_balance || 0) >= 0
                                ? "text-blue-600"
                                : "text-red-600"
                            }`}
                          >
                            ₹{driver?.net_balance?.toLocaleString() || "0"}
                          </span>
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsPenaltyModalOpen(true)}
                        className="w-full"
                      >
                        <AlertCircle className="h-4 w-4 mr-2" />
                        Manage Penalties
                      </Button>
                    </div>
                  </div> */}

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

                  <div className="space-y-2">
                    <Label htmlFor="dateOfBirth">Date of Birth</Label>
                    <Input
                      id="dateOfBirth"
                      type="date"
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      disabled={isProcessing}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="resigningDate">Resigning Date</Label>
                    <Input
                      id="resigningDate"
                      type="date"
                      value={resigningDate}
                      onChange={(e) => setResigningDate(e.target.value)}
                      disabled={isProcessing}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="resignationReason">
                      Resignation Reason
                    </Label>
                    <Input
                      id="resignationReason"
                      value={resignationReason}
                      onChange={(e) => setResignationReason(e.target.value)}
                      placeholder="Enter resignation reason"
                      disabled={isProcessing}
                    />
                  </div>

                  <Separator />

                  {/* <div className="flex flex-col gap-1">
                    <h3 className="text-sm font-medium">Driver Status</h3>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="online-status"
                        checked={isOnline}
                        onCheckedChange={handleOnlineToggle}
                        disabled={isProcessing || !isAdmin}
                      />
                      <Label htmlFor="online-status">
                        {isOnline ? "Online" : "Offline"}
                      </Label>

                      {!isAdmin && (
                        <span className="text-xs text-amber-600">
                          (Admin only)
                        </span>
                      )}

                      {!isOnline && driver?.offline_from_date && (
                        <span className="text-xs text-muted-foreground">
                          (Offline since{" "}
                          {format(new Date(driver.offline_from_date), "PP")})
                        </span>
                      )}
                    </div>
                    {!isOnline && isAdmin && (
                      <div className="mt-2">
                        {(() => {
                          const docCheck = checkAllDocumentsUploaded();
                          if (!docCheck.allUploaded) {
                            return (
                              <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                                <AlertTriangle className="h-3 w-3 inline mr-1" />
                                Missing documents: {docCheck.missing.join(", ")}
                              </div>
                            );
                          }
                          return (
                            <div className="text-xs text-green-700 bg-green-50 border border-green-200 rounded p-2">
                              <CheckCircle className="h-3 w-3 inline mr-1" />
                              All documents uploaded - can be put online
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div> */}

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
                        <SelectItem value="none">No Shift</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <Label htmlFor="category">Driver Category</Label>
                    <Select
                      value={selectedCategory}
                      onValueChange={handleCategoryChange}
                      disabled={isProcessing}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hub_base">Hub Base</SelectItem>
                        <SelectItem value="salary_base">Salary Base</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Hub Base: Trip-based reporting | Salary Base:
                      Hours/attendance-based reporting
                    </p>
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
                              .includes(searchQuery),
                          ),
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
                        <SelectItem key="no-vehicle" value="No Vehicle">
                          N/A
                        </SelectItem>
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

                  {/* <div className="flex flex-col gap-1">
                    <Label htmlFor="deposit">Deposit Amount</Label>
                    <Input
                      id="deposit"
                      type="number"
                      value={deposit}
                      onChange={handleDepositChange}
                      placeholder="Enter deposit amount"
                      disabled={isProcessing}
                    />
                  </div> */}

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
                  <PenaltyManagement
                    driverId={driverId}
                    currentPenalties={driver?.total_penalties || 0}
                    onPenaltyUpdate={fetchDriverDetails}
                  />
                </div>
              )}
            </TabsContent>

            <TabsContent value="accommodation" className="w-full">
              {driverId && (
                <div className="w-full">
                  <AccommodationAssignment
                    driverId={driverId}
                    driverName={driver?.name || ""}
                    onAssignmentUpdate={fetchDriverDetails}
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
                                        "dd MMM yyyy",
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
                                              ? "pending"
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

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg font-medium">
                        Deposit Transaction History
                      </CardTitle>
                      <CardDescription>
                        View all deposit, refund, due, penalty, and bonus transactions
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <BalanceTransactions
                        driverId={driverId}
                        currentBalance={driver?.pending_balance || 0}
                        onBalanceUpdate={fetchDriverDetails}
                      />
                    </CardContent>
                  </Card>
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

      {/* Penalty Management Modal */}
      <Dialog open={isPenaltyModalOpen} onOpenChange={setIsPenaltyModalOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Penalty Management - {driver?.name}</DialogTitle>
            <DialogDescription>
              Manage penalties, penalty payments, and bonuses for this driver
            </DialogDescription>
          </DialogHeader>
          <PenaltyManagement
            driverId={driverId || ""}
            currentPenalties={driver?.total_penalties || 0}
            onPenaltyUpdate={() => {
              fetchDriverDetails();
              if (onDriverUpdate) onDriverUpdate();
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Overdue Warning Popup */}
      <Dialog open={showOverdueWarning} onOpenChange={setShowOverdueWarning}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <AlertTriangle className="h-5 w-5" />
              Pending Balance Warning
            </DialogTitle>
            <DialogDescription>
              This driver has a pending balance. You can still make them
              offline.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-orange-800">
                <AlertCircle className="h-4 w-4" />
                <span className="font-medium">
                  Pending Amount: ₹{overdueAmount.toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-orange-600 mt-2">
                This driver has a pending balance. You can still make them
                offline if needed.
              </p>
            </div>
            <div className="text-sm text-gray-600">
              <p>• The pending balance will remain on their account</p>
              <p>• They can be made online again later</p>
              <p>• Balance will be settled when they come back online</p>
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowOverdueWarning(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                setShowOverdueWarning(false);
                // Proceed with offline action
                setIsProcessing(true);
                try {
                  const updateData: any = {
                    online: false,
                    offline_from_date: new Date().toISOString().split("T")[0],
                  };

                  const { error } = await supabase
                    .from("users")
                    .update(updateData)
                    .eq("id", driverId);

                  if (error) throw error;

                  // Update local state
                  setIsOnline(false);
                  toast.success("Driver taken offline successfully");
                } catch (error) {
                  console.error("Error taking driver offline:", error);
                  toast.error("Failed to take driver offline");
                } finally {
                  setIsProcessing(false);
                }
              }}
            >
              Offline Anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Warning Dialog */}
      <Dialog open={showDocumentWarning} onOpenChange={setShowDocumentWarning}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              Missing Documents
            </DialogTitle>
            <DialogDescription>
              All required documents must be uploaded before a driver can be put
              online.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-amber-800 mb-2">
                <AlertCircle className="h-4 w-4" />
                <span className="font-medium">Driver: {driver?.name}</span>
              </div>
              <div className="mt-2">
                <p className="text-sm font-medium text-amber-800 mb-2">
                  Missing Documents:
                </p>
                <ul className="list-disc list-inside text-sm text-amber-700 space-y-1">
                  {checkAllDocumentsUploaded().missing.map((doc, index) => (
                    <li key={index}>{doc}</li>
                  ))}
                </ul>
              </div>
              <p className="text-sm text-amber-600 mt-3">
                Please ensure all required documents (License Front/Back, Aadhar
                Front/Back, PAN Front/Back) are uploaded before putting the
                driver online.
              </p>
            </div>
            <div className="text-sm text-gray-600">
              <p>• All 6 document sides must be uploaded</p>
              <p>• Documents can be uploaded in the Documents section</p>
              <p>
                • Driver status will remain offline until documents are complete
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDocumentWarning(false)}
            >
              Close
            </Button>
            <Button
              onClick={() => {
                setShowDocumentWarning(false);
                setCurrentTab("details");
              }}
              className="bg-amber-500 hover:bg-amber-600"
            >
              View Documents
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};
