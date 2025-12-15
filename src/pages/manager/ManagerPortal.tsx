import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useManager } from "@/context/ManagerContext";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { format, addDays, startOfWeek, parseISO } from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import {
  Users,
  Car,
  Calendar,
  Clock,
  Search,
  LogOut,
  Menu,
  Wifi,
  WifiOff,
  Phone,
  Eye,
  ChevronLeft,
  ChevronRight,
  IndianRupee,
  AlertTriangle,
  RefreshCw,
  User,
  Home,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

// Types
interface Driver {
  id: string;
  name: string;
  driver_id: string;
  phone_number: string;
  vehicle_number: string;
  shift: string;
  online: boolean;
  balance: number;
  deposit_collected: number;
  photo_url?: string;
  joining_date?: string;
}

interface Vehicle {
  vehicle_number: string;
  fleet_name: string | null;
  total_trips: number | null;
  online: boolean | null;
  deposit: number | null;
}

interface ShiftAssignment {
  id: string;
  driver_id: string;
  driver_name: string;
  vehicle_number: string;
  shift_type: "morning" | "night" | "24" | "none";
  online: boolean;
  phone_number?: string;
}

interface CalendarEntry {
  date: string;
  userId: string;
  driverName: string;
  vehicleNumber: string;
  status: "paid" | "pending" | "overdue" | "leave" | "not_joined";
  shift: string;
}

const ManagerPortal = () => {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { isManager, loading: managerLoading } = useManager();
  const isMobile = useIsMobile();

  // State
  const [activeTab, setActiveTab] = useState("drivers");
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Drivers State
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [driverSearch, setDriverSearch] = useState("");
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [shiftFilter, setShiftFilter] = useState("all");

  // Vehicles State
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [showActiveOnly, setShowActiveOnly] = useState(true);

  // Shifts State
  const [shifts, setShifts] = useState<ShiftAssignment[]>([]);
  const [shiftSearchQuery, setShiftSearchQuery] = useState("");

  // Calendar State
  const [calendarData, setCalendarData] = useState<CalendarEntry[]>([]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [mobileStartIndex, setMobileStartIndex] = useState(0);
  const [calendarShiftFilter, setCalendarShiftFilter] = useState("all");

  // Menu state for mobile
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    if (!managerLoading && !isManager) {
      toast.error("You do not have manager privileges");
      navigate("/");
    }
  }, [isManager, managerLoading, navigate]);

  useEffect(() => {
    if (isManager) {
      fetchAllData();
    }
  }, [isManager]);

  const fetchAllData = async () => {
    setIsLoading(true);
    await Promise.all([
      fetchDrivers(),
      fetchVehicles(),
      fetchShifts(),
      fetchCalendarData(),
    ]);
    setIsLoading(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAllData();
    setRefreshing(false);
    toast.success("Data refreshed");
  };

  // Fetch Drivers
  const fetchDrivers = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("role", "user")
        .order("name");

      if (error) throw error;
      setDrivers(data || []);
    } catch (error) {
      console.error("Error fetching drivers:", error);
    }
  };

  // Fetch Vehicles
  const fetchVehicles = async () => {
    try {
      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .order("vehicle_number");

      if (error) throw error;
      setVehicles(data || []);
    } catch (error) {
      console.error("Error fetching vehicles:", error);
    }
  };

  // Fetch Shifts
  const fetchShifts = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, name, vehicle_number, shift, online, phone_number")
        .eq("role", "user")
        .eq("online", true)
        .order("vehicle_number");

      if (error) throw error;

      const shiftAssignments: ShiftAssignment[] = (data || []).map((d) => ({
        id: d.id,
        driver_id: d.id,
        driver_name: d.name || "Unknown",
        vehicle_number: d.vehicle_number || "Unassigned",
        shift_type: d.shift as "morning" | "night" | "24" | "none",
        online: d.online,
        phone_number: d.phone_number,
      }));

      setShifts(shiftAssignments);
    } catch (error) {
      console.error("Error fetching shifts:", error);
    }
  };

  // Fetch Calendar Data
  const fetchCalendarData = async () => {
    try {
      const startDate = startOfWeek(addDays(currentDate, weekOffset * 7), {
        weekStartsOn: 0,
      });
      const endDate = addDays(startDate, 6);

      const formattedStartDate = format(startDate, "yyyy-MM-dd");
      const formattedEndDate = format(endDate, "yyyy-MM-dd");

      // Fetch fleet reports for the date range
      const { data: reportsData, error: reportsError } = await supabase
        .from("fleet_reports")
        .select("*")
        .gte("rent_date", formattedStartDate)
        .lte("rent_date", formattedEndDate);

      if (reportsError) throw reportsError;

      // Fetch online drivers
      const { data: driversData, error: driversError } = await supabase
        .from("users")
        .select("id, name, vehicle_number, shift, online, joining_date")
        .eq("online", true)
        .eq("role", "user");

      if (driversError) throw driversError;

      // Create all dates in range
      const allDates: string[] = [];
      let currentDateInRange = new Date(formattedStartDate);
      const endDateObj = new Date(formattedEndDate);

      while (currentDateInRange <= endDateObj) {
        allDates.push(format(currentDateInRange, "yyyy-MM-dd"));
        currentDateInRange.setDate(currentDateInRange.getDate() + 1);
      }

      // Process reports
      const processedData: CalendarEntry[] = [];

      // Add existing reports
      reportsData?.forEach((report) => {
        let status: CalendarEntry["status"] = "not_joined";
        if (report.status === "leave") {
          status = "leave";
        } else if (report.rent_paid_status) {
          status = "paid";
        } else if (
          report.rent_verified === false &&
          report.rent_paid_amount > 0
        ) {
          status = "pending";
        } else {
          const reportDate = new Date(report.rent_date);
          const now = new Date();
          if (reportDate < now) {
            status = "overdue";
          }
        }

        processedData.push({
          date: report.rent_date,
          userId: report.user_id,
          driverName: report.driver_name || "Unknown",
          vehicleNumber: report.vehicle_number || "",
          status,
          shift: report.shift || "unknown",
        });
      });

      // Add missing entries for online drivers
      driversData?.forEach((driver) => {
        allDates.forEach((dateStr) => {
          const existingEntry = processedData.find(
            (entry) => entry.userId === driver.id && entry.date === dateStr
          );

          if (!existingEntry) {
            // Check if driver has joined before this date
            if (
              driver.joining_date &&
              new Date(driver.joining_date) > new Date(dateStr)
            ) {
              return; // Skip if not joined yet
            }

            const checkDate = new Date(dateStr);
            const now = new Date();
            let status: CalendarEntry["status"] = "not_joined";

            if (checkDate < now) {
              status = "overdue";
            }

            processedData.push({
              date: dateStr,
              userId: driver.id,
              driverName: driver.name || "Unknown",
              vehicleNumber: driver.vehicle_number || "",
              status,
              shift: driver.shift || "unknown",
            });
          }
        });
      });

      setCalendarData(processedData);
    } catch (error) {
      console.error("Error fetching calendar data:", error);
    }
  };

  // Re-fetch calendar when week changes
  useEffect(() => {
    if (isManager) {
      fetchCalendarData();
    }
  }, [weekOffset]);

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  // Filter drivers
  const filteredDrivers = drivers.filter((driver) => {
    const matchesSearch =
      !driverSearch ||
      driver.name?.toLowerCase().includes(driverSearch.toLowerCase()) ||
      driver.driver_id?.toLowerCase().includes(driverSearch.toLowerCase()) ||
      driver.vehicle_number?.toLowerCase().includes(driverSearch.toLowerCase());

    const matchesOnline = !showOnlineOnly || driver.online;
    const matchesShift = shiftFilter === "all" || driver.shift === shiftFilter;

    return matchesSearch && matchesOnline && matchesShift;
  });

  // Filter vehicles
  const filteredVehicles = vehicles.filter((vehicle) => {
    const matchesSearch =
      !vehicleSearch ||
      vehicle.vehicle_number
        ?.toLowerCase()
        .includes(vehicleSearch.toLowerCase()) ||
      vehicle.fleet_name?.toLowerCase().includes(vehicleSearch.toLowerCase());

    const matchesActive = !showActiveOnly || vehicle.online;

    return matchesSearch && matchesActive;
  });

  // Filter shifts
  const filteredShifts = shifts.filter((shift) => {
    return (
      !shiftSearchQuery ||
      shift.driver_name
        .toLowerCase()
        .includes(shiftSearchQuery.toLowerCase()) ||
      shift.vehicle_number
        .toLowerCase()
        .includes(shiftSearchQuery.toLowerCase())
    );
  });

  // Group shifts by vehicle
  const groupedShifts = filteredShifts.reduce((acc, shift) => {
    const key = shift.vehicle_number;
    if (!acc[key]) {
      acc[key] = { vehicle_number: key, drivers: [] };
    }
    acc[key].drivers.push(shift);
    return acc;
  }, {} as Record<string, { vehicle_number: string; drivers: ShiftAssignment[] }>);

  // Calendar navigation
  const handlePreviousWeek = () => setWeekOffset(weekOffset - 1);
  const handleNextWeek = () => setWeekOffset(weekOffset + 1);
  const handlePreviousDay = () => {
    if (mobileStartIndex > 0) {
      setMobileStartIndex(mobileStartIndex - 1);
    } else {
      setWeekOffset(weekOffset - 1);
      setMobileStartIndex(5);
    }
  };
  const handleNextDay = () => {
    if (mobileStartIndex < 5) {
      setMobileStartIndex(mobileStartIndex + 1);
    } else {
      setWeekOffset(weekOffset + 1);
      setMobileStartIndex(0);
    }
  };

  // Get calendar dates
  const getCalendarDates = () => {
    const startDate = startOfWeek(addDays(currentDate, weekOffset * 7), {
      weekStartsOn: 0,
    });
    return Array.from({ length: 7 }, (_, i) => addDays(startDate, i));
  };

  const calendarDates = getCalendarDates();
  const visibleDates = isMobile
    ? calendarDates.slice(mobileStartIndex, mobileStartIndex + 2)
    : calendarDates;

  // Filter calendar by shift
  const filteredCalendarDrivers = drivers
    .filter((d) => d.online)
    .filter(
      (d) => calendarShiftFilter === "all" || d.shift === calendarShiftFilter
    );

  // Status color helper
  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-500";
      case "pending":
        return "bg-yellow-500";
      case "overdue":
        return "bg-red-500";
      case "leave":
        return "bg-blue-500";
      default:
        return "bg-gray-300";
    }
  };

  if (managerLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isManager) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                <div className="p-4 border-b bg-purple-600">
                  <h2 className="text-xl font-bold text-white">
                    Manager Portal
                  </h2>
                </div>
                <nav className="p-4 space-y-2">
                  <Button
                    variant={activeTab === "drivers" ? "default" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => {
                      setActiveTab("drivers");
                      setIsMenuOpen(false);
                    }}
                  >
                    <Users className="mr-2 h-4 w-4" />
                    Drivers
                  </Button>
                  <Button
                    variant={activeTab === "vehicles" ? "default" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => {
                      setActiveTab("vehicles");
                      setIsMenuOpen(false);
                    }}
                  >
                    <Car className="mr-2 h-4 w-4" />
                    Vehicles
                  </Button>
                  <Button
                    variant={activeTab === "shifts" ? "default" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => {
                      setActiveTab("shifts");
                      setIsMenuOpen(false);
                    }}
                  >
                    <Clock className="mr-2 h-4 w-4" />
                    Shifts
                  </Button>
                  <Button
                    variant={activeTab === "calendar" ? "default" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => {
                      setActiveTab("calendar");
                      setIsMenuOpen(false);
                    }}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    Rent Calendar
                  </Button>
                </nav>
                <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleLogout}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
            <h1 className="text-lg font-bold text-purple-700">
              Manager Portal
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw
                className={cn("h-5 w-5", refreshing && "animate-spin")}
              />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="hidden md:flex"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Desktop Tabs */}
        <div className="hidden md:block border-t">
          <div className="flex px-4">
            <button
              onClick={() => setActiveTab("drivers")}
              className={cn(
                "flex items-center gap-2 px-4 py-3 border-b-2 transition-colors",
                activeTab === "drivers"
                  ? "border-purple-600 text-purple-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              )}
            >
              <Users className="h-4 w-4" />
              Drivers
            </button>
            <button
              onClick={() => setActiveTab("vehicles")}
              className={cn(
                "flex items-center gap-2 px-4 py-3 border-b-2 transition-colors",
                activeTab === "vehicles"
                  ? "border-purple-600 text-purple-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              )}
            >
              <Car className="h-4 w-4" />
              Vehicles
            </button>
            <button
              onClick={() => setActiveTab("shifts")}
              className={cn(
                "flex items-center gap-2 px-4 py-3 border-b-2 transition-colors",
                activeTab === "shifts"
                  ? "border-purple-600 text-purple-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              )}
            >
              <Clock className="h-4 w-4" />
              Shifts
            </button>
            <button
              onClick={() => setActiveTab("calendar")}
              className={cn(
                "flex items-center gap-2 px-4 py-3 border-b-2 transition-colors",
                activeTab === "calendar"
                  ? "border-purple-600 text-purple-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              )}
            >
              <Calendar className="h-4 w-4" />
              Rent Calendar
            </button>
          </div>
        </div>

        {/* Mobile Bottom Tab Navigation */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t z-50">
          <div className="grid grid-cols-4 gap-1 p-2">
            <button
              onClick={() => setActiveTab("drivers")}
              className={cn(
                "flex flex-col items-center py-2 rounded-lg transition-colors",
                activeTab === "drivers"
                  ? "bg-purple-100 text-purple-600"
                  : "text-gray-500"
              )}
            >
              <Users className="h-5 w-5" />
              <span className="text-xs mt-1">Drivers</span>
            </button>
            <button
              onClick={() => setActiveTab("vehicles")}
              className={cn(
                "flex flex-col items-center py-2 rounded-lg transition-colors",
                activeTab === "vehicles"
                  ? "bg-purple-100 text-purple-600"
                  : "text-gray-500"
              )}
            >
              <Car className="h-5 w-5" />
              <span className="text-xs mt-1">Vehicles</span>
            </button>
            <button
              onClick={() => setActiveTab("shifts")}
              className={cn(
                "flex flex-col items-center py-2 rounded-lg transition-colors",
                activeTab === "shifts"
                  ? "bg-purple-100 text-purple-600"
                  : "text-gray-500"
              )}
            >
              <Clock className="h-5 w-5" />
              <span className="text-xs mt-1">Shifts</span>
            </button>
            <button
              onClick={() => setActiveTab("calendar")}
              className={cn(
                "flex flex-col items-center py-2 rounded-lg transition-colors",
                activeTab === "calendar"
                  ? "bg-purple-100 text-purple-600"
                  : "text-gray-500"
              )}
            >
              <Calendar className="h-5 w-5" />
              <span className="text-xs mt-1">Calendar</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 pb-24 md:pb-4 max-w-7xl mx-auto">
        {/* DRIVERS TAB */}
        {activeTab === "drivers" && (
          <div className="space-y-4">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="bg-gradient-to-br from-purple-500 to-purple-600">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-100 text-xs">Total Drivers</p>
                      <p className="text-2xl font-bold text-white">
                        {drivers.length}
                      </p>
                    </div>
                    <Users className="h-8 w-8 text-purple-200" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-green-500 to-green-600">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-100 text-xs">Online</p>
                      <p className="text-2xl font-bold text-white">
                        {drivers.filter((d) => d.online).length}
                      </p>
                    </div>
                    <Wifi className="h-8 w-8 text-green-200" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-red-500 to-red-600">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-red-100 text-xs">Offline</p>
                      <p className="text-2xl font-bold text-white">
                        {drivers.filter((d) => !d.online).length}
                      </p>
                    </div>
                    <WifiOff className="h-8 w-8 text-red-200" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-blue-500 to-blue-600">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-xs">With Vehicle</p>
                      <p className="text-2xl font-bold text-white">
                        {drivers.filter((d) => d.vehicle_number).length}
                      </p>
                    </div>
                    <Car className="h-8 w-8 text-blue-200" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Search & Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search drivers..."
                      value={driverSearch}
                      onChange={(e) => setDriverSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <div className="flex gap-3 items-center">
                    <div className="flex items-center gap-2">
                      <Switch
                        id="online-filter"
                        checked={showOnlineOnly}
                        onCheckedChange={setShowOnlineOnly}
                      />
                      <Label
                        htmlFor="online-filter"
                        className="text-sm whitespace-nowrap"
                      >
                        Online Only
                      </Label>
                    </div>
                    <Select value={shiftFilter} onValueChange={setShiftFilter}>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Shift" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Shifts</SelectItem>
                        <SelectItem value="morning">Morning</SelectItem>
                        <SelectItem value="night">Night</SelectItem>
                        <SelectItem value="24">24 Hours</SelectItem>
                        <SelectItem value="none">No Shift</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Drivers List */}
            <div className="space-y-3">
              {filteredDrivers.map((driver) => (
                <Card
                  key={driver.id}
                  className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setSelectedDriver(driver)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={driver.photo_url} />
                        <AvatarFallback className="bg-purple-100 text-purple-600">
                          {driver.name?.charAt(0) || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900 truncate">
                            {driver.name || "Unknown"}
                          </h3>
                          {driver.online ? (
                            <Badge className="bg-green-100 text-green-700 text-xs">
                              <Wifi className="h-3 w-3 mr-1" />
                              Online
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              <WifiOff className="h-3 w-3 mr-1" />
                              Offline
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2 mt-1 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Car className="h-3 w-3" />
                            {driver.vehicle_number || "No Vehicle"}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {driver.shift || "No Shift"}
                          </span>
                        </div>
                      </div>
                      <div className="text-right hidden md:block">
                        <p className="text-sm text-gray-500">Balance</p>
                        <p
                          className={cn(
                            "font-semibold",
                            (driver.balance || 0) < 0
                              ? "text-red-600"
                              : "text-green-600"
                          )}
                        >
                          ₹{(driver.balance || 0).toLocaleString()}
                        </p>
                      </div>
                      <Eye className="h-5 w-5 text-gray-400" />
                    </div>
                  </CardContent>
                </Card>
              ))}

              {filteredDrivers.length === 0 && (
                <Card>
                  <CardContent className="p-8 text-center text-gray-500">
                    No drivers found matching your criteria
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* VEHICLES TAB */}
        {activeTab === "vehicles" && (
          <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Card className="bg-gradient-to-br from-blue-500 to-blue-600">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-xs">Total Vehicles</p>
                      <p className="text-2xl font-bold text-white">
                        {vehicles.length}
                      </p>
                    </div>
                    <Car className="h-8 w-8 text-blue-200" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-green-500 to-green-600">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-100 text-xs">Active</p>
                      <p className="text-2xl font-bold text-white">
                        {vehicles.filter((v) => v.online).length}
                      </p>
                    </div>
                    <Wifi className="h-8 w-8 text-green-200" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-gray-500 to-gray-600">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-100 text-xs">Inactive</p>
                      <p className="text-2xl font-bold text-white">
                        {vehicles.filter((v) => !v.online).length}
                      </p>
                    </div>
                    <WifiOff className="h-8 w-8 text-gray-200" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Search & Filter */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search vehicles..."
                      value={vehicleSearch}
                      onChange={(e) => setVehicleSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="active-filter"
                      checked={showActiveOnly}
                      onCheckedChange={setShowActiveOnly}
                    />
                    <Label
                      htmlFor="active-filter"
                      className="text-sm whitespace-nowrap"
                    >
                      Active Only
                    </Label>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Vehicles Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredVehicles.map((vehicle) => (
                <Card key={vehicle.vehicle_number} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <Car className="h-5 w-5 text-purple-600" />
                          <h3 className="font-bold text-lg">
                            {vehicle.vehicle_number}
                          </h3>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          {vehicle.fleet_name || "No Fleet"}
                        </p>
                      </div>
                      {vehicle.online ? (
                        <Badge className="bg-green-100 text-green-700">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </div>
                    <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500">Total Trips</p>
                        <p className="font-semibold">
                          {vehicle.total_trips || 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Deposit</p>
                        <p className="font-semibold">₹{vehicle.deposit || 0}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredVehicles.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center text-gray-500">
                  No vehicles found matching your criteria
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* SHIFTS TAB */}
        {activeTab === "shifts" && (
          <div className="space-y-4">
            {/* Search */}
            <Card>
              <CardContent className="p-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by driver or vehicle..."
                    value={shiftSearchQuery}
                    onChange={(e) => setShiftSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Shift Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="bg-gradient-to-br from-amber-500 to-amber-600">
                <CardContent className="p-4">
                  <p className="text-amber-100 text-xs">Morning</p>
                  <p className="text-2xl font-bold text-white">
                    {shifts.filter((s) => s.shift_type === "morning").length}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-indigo-500 to-indigo-600">
                <CardContent className="p-4">
                  <p className="text-indigo-100 text-xs">Night</p>
                  <p className="text-2xl font-bold text-white">
                    {shifts.filter((s) => s.shift_type === "night").length}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-purple-500 to-purple-600">
                <CardContent className="p-4">
                  <p className="text-purple-100 text-xs">24 Hours</p>
                  <p className="text-2xl font-bold text-white">
                    {shifts.filter((s) => s.shift_type === "24").length}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-gray-500 to-gray-600">
                <CardContent className="p-4">
                  <p className="text-gray-100 text-xs">No Shift</p>
                  <p className="text-2xl font-bold text-white">
                    {
                      shifts.filter(
                        (s) => s.shift_type === "none" || !s.shift_type
                      ).length
                    }
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Shifts by Vehicle */}
            <div className="space-y-3">
              {Object.values(groupedShifts).map((group) => (
                <Card key={group.vehicle_number}>
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-center gap-2">
                      <Car className="h-5 w-5 text-purple-600" />
                      <CardTitle className="text-lg">
                        {group.vehicle_number}
                      </CardTitle>
                      <Badge variant="outline">
                        {group.drivers.length} driver(s)
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="space-y-2">
                      {group.drivers.map((shift) => (
                        <div
                          key={shift.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback className="bg-purple-100 text-purple-600">
                                {shift.driver_name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{shift.driver_name}</p>
                              {shift.phone_number && (
                                <a
                                  href={`tel:${shift.phone_number}`}
                                  className="text-sm text-blue-600 flex items-center gap-1"
                                >
                                  <Phone className="h-3 w-3" />
                                  {shift.phone_number}
                                </a>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              className={cn(
                                shift.shift_type === "morning" &&
                                  "bg-amber-100 text-amber-700",
                                shift.shift_type === "night" &&
                                  "bg-indigo-100 text-indigo-700",
                                shift.shift_type === "24" &&
                                  "bg-purple-100 text-purple-700",
                                (!shift.shift_type ||
                                  shift.shift_type === "none") &&
                                  "bg-gray-100 text-gray-700"
                              )}
                            >
                              {shift.shift_type === "24"
                                ? "24 Hours"
                                : shift.shift_type || "No Shift"}
                            </Badge>
                            {shift.online ? (
                              <Wifi className="h-4 w-4 text-green-500" />
                            ) : (
                              <WifiOff className="h-4 w-4 text-gray-400" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {Object.keys(groupedShifts).length === 0 && (
                <Card>
                  <CardContent className="p-8 text-center text-gray-500">
                    No shift assignments found
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* CALENDAR TAB */}
        {activeTab === "calendar" && (
          <div className="space-y-4">
            {/* Calendar Header */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={
                        isMobile ? handlePreviousDay : handlePreviousWeek
                      }
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="text-center min-w-[200px]">
                      <p className="font-semibold">
                        {format(visibleDates[0], "MMM d")} -{" "}
                        {format(
                          visibleDates[visibleDates.length - 1],
                          "MMM d, yyyy"
                        )}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={isMobile ? handleNextDay : handleNextWeek}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setWeekOffset(0);
                        setMobileStartIndex(0);
                      }}
                    >
                      Today
                    </Button>
                  </div>
                  <Select
                    value={calendarShiftFilter}
                    onValueChange={setCalendarShiftFilter}
                  >
                    <SelectTrigger className="w-36">
                      <SelectValue placeholder="Filter Shift" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Shifts</SelectItem>
                      <SelectItem value="morning">Morning</SelectItem>
                      <SelectItem value="night">Night</SelectItem>
                      <SelectItem value="24">24 Hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 px-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-green-500"></div>
                <span className="text-xs">Paid</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-yellow-500"></div>
                <span className="text-xs">Pending</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-red-500"></div>
                <span className="text-xs">Overdue</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-blue-500"></div>
                <span className="text-xs">Leave</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-gray-300"></div>
                <span className="text-xs">Not Paid</span>
              </div>
            </div>

            {/* Calendar Grid */}
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="p-3 text-left font-medium text-gray-600 sticky left-0 bg-gray-50 z-10 min-w-[150px]">
                        Driver
                      </th>
                      {visibleDates.map((date) => (
                        <th
                          key={date.toISOString()}
                          className={cn(
                            "p-3 text-center font-medium min-w-[80px]",
                            format(date, "yyyy-MM-dd") ===
                              format(new Date(), "yyyy-MM-dd")
                              ? "bg-purple-100 text-purple-700"
                              : "text-gray-600"
                          )}
                        >
                          <div className="text-xs">{format(date, "EEE")}</div>
                          <div className="text-lg">{format(date, "d")}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCalendarDrivers.map((driver) => (
                      <tr key={driver.id} className="border-t hover:bg-gray-50">
                        <td className="p-3 sticky left-0 bg-white z-10">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-purple-100 text-purple-600 text-xs">
                                {driver.name?.charAt(0) || "?"}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">
                                {driver.name}
                              </p>
                              <p className="text-xs text-gray-500 truncate">
                                {driver.vehicle_number}
                              </p>
                            </div>
                          </div>
                        </td>
                        {visibleDates.map((date) => {
                          const dateStr = format(date, "yyyy-MM-dd");
                          const entry = calendarData.find(
                            (e) => e.userId === driver.id && e.date === dateStr
                          );
                          const status = entry?.status || "not_joined";

                          return (
                            <td key={dateStr} className="p-2 text-center">
                              <div
                                className={cn(
                                  "w-8 h-8 mx-auto rounded-lg flex items-center justify-center",
                                  getStatusColor(status)
                                )}
                              >
                                {status === "paid" && (
                                  <span className="text-white text-xs">✓</span>
                                )}
                                {status === "pending" && (
                                  <span className="text-white text-xs">⏳</span>
                                )}
                                {status === "overdue" && (
                                  <AlertTriangle className="h-4 w-4 text-white" />
                                )}
                                {status === "leave" && (
                                  <span className="text-white text-xs">L</span>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>

                {filteredCalendarDrivers.length === 0 && (
                  <div className="p-8 text-center text-gray-500">
                    No drivers found for the selected shift
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* Driver Details Modal */}
      <Dialog
        open={!!selectedDriver}
        onOpenChange={() => setSelectedDriver(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Driver Details</DialogTitle>
          </DialogHeader>
          {selectedDriver && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={selectedDriver.photo_url} />
                  <AvatarFallback className="bg-purple-100 text-purple-600 text-xl">
                    {selectedDriver.name?.charAt(0) || "?"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-bold text-lg">{selectedDriver.name}</h3>
                  <p className="text-gray-500">{selectedDriver.driver_id}</p>
                  {selectedDriver.online ? (
                    <Badge className="bg-green-100 text-green-700 mt-1">
                      <Wifi className="h-3 w-3 mr-1" />
                      Online
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="mt-1">
                      <WifiOff className="h-3 w-3 mr-1" />
                      Offline
                    </Badge>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Vehicle</p>
                  <p className="font-semibold">
                    {selectedDriver.vehicle_number || "Not Assigned"}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Shift</p>
                  <p className="font-semibold capitalize">
                    {selectedDriver.shift || "None"}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Balance</p>
                  <p
                    className={cn(
                      "font-semibold",
                      (selectedDriver.balance || 0) < 0
                        ? "text-red-600"
                        : "text-green-600"
                    )}
                  >
                    ₹{(selectedDriver.balance || 0).toLocaleString()}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Deposit</p>
                  <p className="font-semibold">
                    ₹{(selectedDriver.deposit_collected || 0).toLocaleString()}
                  </p>
                </div>
              </div>

              {selectedDriver.phone_number && (
                <Button
                  className="w-full"
                  onClick={() =>
                    window.open(`tel:${selectedDriver.phone_number}`, "_self")
                  }
                >
                  <Phone className="h-4 w-4 mr-2" />
                  Call {selectedDriver.phone_number}
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManagerPortal;
