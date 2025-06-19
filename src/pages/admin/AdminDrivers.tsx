import React, { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Eye,
  CheckCircle,
  XCircle,
  Car,
  IndianRupee,
  Users,
  Filter,
  Search,
  WifiOff,
  Wifi,
  Download,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { DriverDetailsModal } from "@/components/admin/drivers/DriverDetailsModal";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/hooks/use-mobile";
import { format } from "date-fns";

const AdminDrivers = () => {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDriver, setSelectedDriver] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [shiftFilter, setShiftFilter] = useState<string>("all");
  const [verificationFilter, setVerificationFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [showLowDeposit, setShowLowDeposit] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Statistics state
  const [statistics, setStatistics] = useState({
    total: 0,
    online: 0,
    offline: 0,
    totalDeposit: 0,
  });

  const isMobile = useIsMobile();

  useEffect(() => {
    fetchDrivers();
    fetchStatistics();
  }, [
    currentPage,
    showOnlineOnly,
    searchQuery,
    shiftFilter,
    verificationFilter,
    showLowDeposit,
  ]);

  // Debounce search query to avoid too many API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentPage !== 1) {
        setCurrentPage(1);
      } else {
        fetchDrivers();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchDrivers = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("users")
        .select("*", { count: "exact" })
        .order("name");

      // Apply server-side filters
      if (showOnlineOnly) {
        query = query.eq("online", true);
      }

      if (searchQuery.trim() !== "") {
        const searchTerm = searchQuery.toLowerCase().trim();
        query = query.or(
          `name.ilike.%${searchTerm}%,email_id.ilike.%${searchTerm}%,vehicle_number.ilike.%${searchTerm}%,driver_id.ilike.%${searchTerm}%`
        );
      }

      if (shiftFilter !== "all") {
        query = query.eq("shift", shiftFilter);
      }

      if (verificationFilter !== "all") {
        const isVerified = verificationFilter === "verified";
        query = query.eq("is_verified", isVerified);
      }

      if (showLowDeposit) {
        query = query.lt("pending_balance", 2500);
      }

      // Apply pagination
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      setDrivers(data || []);
      setTotalCount(count || 0);
      setTotalPages(Math.ceil((count || 0) / pageSize));
    } catch (error) {
      console.error("Error fetching drivers:", error);
      toast.error("Failed to load drivers data");
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      // Get total count
      const { count: totalCount } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true });

      // Get online count
      const { count: onlineCount } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true })
        .eq("online", true);

      // Get total deposit
      const { data: depositData } = await supabase
        .from("users")
        .select("pending_balance");

      const totalDeposit =
        depositData?.reduce(
          (sum, driver) => sum + (driver.pending_balance || 0),
          0
        ) || 0;

      setStatistics({
        total: totalCount || 0,
        online: onlineCount || 0,
        offline: (totalCount || 0) - (onlineCount || 0),
        totalDeposit,
      });
    } catch (error) {
      console.error("Error fetching statistics:", error);
    }
  };

  const openDriverDetails = (driver) => {
    setSelectedDriver(driver);
    setIsModalOpen(true);
  };

  const toggleVerification = async (
    id: string,
    currentStatus: boolean | null
  ) => {
    try {
      const { error } = await supabase
        .from("users")
        .update({ is_verified: !currentStatus })
        .eq("id", id);

      if (error) throw error;

      setDrivers(
        drivers.map((driver) =>
          driver.id === id ? { ...driver, is_verified: !currentStatus } : driver
        )
      );

      toast.success(
        `Driver ${!currentStatus ? "verified" : "unverified"} successfully`
      );
    } catch (error) {
      console.error("Error updating driver:", error);
      toast.error("Failed to update driver verification status");
    }
  };

  const toggleOnlineStatus = async (
    id: string,
    currentStatus: boolean | null
  ) => {
    try {
      setIsUpdating(id);

      const updateData: any = {
        online: !currentStatus,
      };

      if (currentStatus) {
        // Going offline
        updateData.offline_from_date = new Date().toISOString().split("T")[0];
      } else {
        // Going online
        updateData.online_from_date = new Date().toISOString().split("T")[0];
        updateData.offline_from_date = null;
      }

      const { error } = await supabase
        .from("users")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;

      setDrivers(
        drivers.map((driver) =>
          driver.id === id
            ? {
                ...driver,
                online: !currentStatus,
                offline_from_date: updateData.offline_from_date,
                online_from_date: updateData.online_from_date,
              }
            : driver
        )
      );

      toast.success(`Driver is now ${!currentStatus ? "online" : "offline"}`);
    } catch (error) {
      console.error("Error updating driver status:", error);
      toast.error("Failed to update driver online status");
    } finally {
      setIsUpdating(null);
    }
  };

  const handleOnlineFilterToggle = (checked: boolean) => {
    setShowOnlineOnly(checked);
    setCurrentPage(1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleShiftFilterChange = (value: string) => {
    setShiftFilter(value);
    setCurrentPage(1);
  };

  const handleVerificationFilterChange = (value: string) => {
    setVerificationFilter(value);
    setCurrentPage(1);
  };

  const handleLowDepositToggle = (checked: boolean) => {
    setShowLowDeposit(checked);
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setSearchQuery("");
    setShiftFilter("all");
    setVerificationFilter("all");
    setShowOnlineOnly(false);
    setShowLowDeposit(false);
    setCurrentPage(1);
  };

  const toggleFilters = () => {
    setShowFilters(!showFilters);
  };

  const downloadDriverReport = async () => {
    try {
      // Fetch all drivers with current filters for complete export
      let query = supabase.from("users").select("*").order("name");

      // Apply the same filters as current view
      if (showOnlineOnly) {
        query = query.eq("online", true);
      }

      if (searchQuery.trim() !== "") {
        const searchTerm = searchQuery.toLowerCase().trim();
        query = query.or(
          `name.ilike.%${searchTerm}%,email_id.ilike.%${searchTerm}%,vehicle_number.ilike.%${searchTerm}%,driver_id.ilike.%${searchTerm}%`
        );
      }

      if (shiftFilter !== "all") {
        query = query.eq("shift", shiftFilter);
      }

      if (verificationFilter !== "all") {
        const isVerified = verificationFilter === "verified";
        query = query.eq("is_verified", isVerified);
      }

      if (showLowDeposit) {
        query = query.lt("pending_balance", 2500);
      }

      const { data: allDrivers, error } = await query;

      if (error) throw error;

      // Create CSV header
      const headers = [
        "Name",
        "Email",
        "Phone Number",
        "Vehicle Number",
        "Shift",
        "Status",
        "Verified",
        "Total Trips",
        "Deposit",
        "Joining Date",
        "Documents",
      ].join(",");

      // Create CSV rows
      const rows = (allDrivers || []).map((driver) => {
        const documents = [
          driver.license ? "License" : "",
          driver.aadhar ? "Aadhar" : "",
          driver.pan ? "PAN" : "",
        ]
          .filter(Boolean)
          .join("; ");

        return [
          `"${driver.name || ""}"`,
          `"${driver.email_id || ""}"`,
          `"${driver.phone_number || ""}"`,
          `"${driver.vehicle_number || ""}"`,
          `"${driver.shift || ""}"`,
          driver.online ? "Online" : "Offline",
          driver.is_verified ? "Yes" : "No",
          driver.total_trip || "0",
          driver.pending_balance || "0",
          driver.joining_date
            ? format(new Date(driver.joining_date), "dd MMM yyyy")
            : "Not available",
          `"${documents}"`,
        ].join(",");
      });

      // Combine header and rows
      const csvContent = [headers, ...rows].join("\n");

      // Create and trigger download
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `driver_report_${format(new Date(), "yyyy-MM-dd")}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(
        `Downloaded report with ${allDrivers?.length || 0} drivers`
      );
    } catch (error) {
      console.error("Error downloading report:", error);
      toast.error("Failed to download report");
    }
  };

  const MobileDriverCard = ({ driver }) => (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex items-center space-x-4 mb-4">
          <Avatar>
            <AvatarImage src={driver.profile_photo || undefined} />
            <AvatarFallback>{driver.name?.charAt(0) || "U"}</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-medium">{driver.name}</h3>
            <p className="text-sm text-muted-foreground">{driver.email_id}</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Vehicle:</span>
            <span>{driver.vehicle_number || "Not assigned"}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Shift:</span>
            {driver.shift ? (
              <Badge
                variant={driver.shift === "morning" ? "default" : "secondary"}
              >
                {driver.shift}
              </Badge>
            ) : (
              "Not set"
            )}
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Status:</span>
            <Switch
              checked={driver.online || false}
              onCheckedChange={() =>
                toggleOnlineStatus(driver.id, driver.online)
              }
              disabled={isUpdating === driver.id}
            />
          </div>

          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Verification:</span>
            <Badge
              variant={driver.is_verified ? "success" : "destructive"}
              className="cursor-pointer"
              onClick={() => toggleVerification(driver.id, driver.is_verified)}
            >
              {driver.is_verified ? "Verified" : "Unverified"}
            </Badge>
          </div>

          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Documents:</span>
            <div className="flex space-x-1">
              {driver.license ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
              {driver.aadhar ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
              {driver.pan ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
            </div>
          </div>

          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Total Trips:</span>
            <span>{driver.total_trip || "0"}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Deposit:</span>
            <span className="flex items-center">
              <IndianRupee className="h-3 w-3 mr-1" />
              {driver.pending_balance}
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

  const getContentHeight = () => {
    // Adjust the height calculation based on viewport and content
    return isMobile ? "calc(100vh - 300px)" : "calc(100vh - 280px)";
  };

  return (
    <AdminLayout title="Drivers Management">
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex flex-col items-center">
              <span className="text-sm font-medium text-gray-500">
                Total Drivers
              </span>
              <span className="text-2xl font-bold">{statistics.total}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-sm font-medium text-gray-500">
                Active Drivers
              </span>
              <span className="text-2xl font-bold text-green-500">
                {statistics.online}
              </span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-sm font-medium text-gray-500">
                Offline Drivers
              </span>
              <span className="text-2xl font-bold text-red-500">
                {statistics.offline}
              </span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-sm font-medium text-gray-500">
                Total Deposit
              </span>
              <span className="text-2xl font-bold text-blue-500">
                ₹{statistics.totalDeposit.toLocaleString()}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <span>
                Showing: {drivers.length} of {totalCount}
              </span>
              <span className="text-green-500 text-sm md:text-base md:ml-2">
                Online: {statistics.online}
              </span>
              <span className="text-red-500 text-sm md:text-base md:ml-2">
                Offline: {statistics.offline}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="online-filter"
                  checked={showOnlineOnly}
                  onCheckedChange={handleOnlineFilterToggle}
                />
                <Label
                  htmlFor="online-filter"
                  className="text-sm whitespace-nowrap"
                >
                  Show online only
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="low-deposit-filter"
                  checked={showLowDeposit}
                  onCheckedChange={handleLowDepositToggle}
                />
                <Label
                  htmlFor="low-deposit-filter"
                  className="text-sm whitespace-nowrap"
                >
                  Show low deposit (&lt; 2500)
                </Label>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={toggleFilters}
                className="flex items-center"
              >
                <Filter className="h-4 w-4 mr-1" />
                {showFilters ? "Hide Filters" : "Show Filters"}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={downloadDriverReport}
                className="flex items-center"
              >
                <Download className="h-4 w-4 mr-1" />
                Download Report
              </Button>
            </div>
          </div>

          {showFilters && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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

              <div className="flex justify-end col-span-full">
                <Button variant="outline" size="sm" onClick={resetFilters}>
                  Reset Filters
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 sm:p-6">
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
                  <ScrollArea className="h-[calc(100vh-320px)]">
                    <div className="pr-3">
                      {drivers.map((driver) => (
                        <MobileDriverCard key={driver.id} driver={driver} />
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>

              <div className="hidden md:block relative">
                <ScrollArea className="h-[calc(100vh-280px)] rounded-md">
                  <div className="pr-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {/* <TableHead className="w-12">Profile</TableHead> */}
                          <TableHead>Name</TableHead>
                          <TableHead>Joining Date</TableHead>
                          <TableHead>Ph No</TableHead>
                          <TableHead>Vehicle</TableHead>
                          <TableHead>Shift</TableHead>
                          <TableHead className="w-20">Status</TableHead>
                          <TableHead>Verified</TableHead>
                          <TableHead>Documents</TableHead>
                          <TableHead>Trips</TableHead>
                          <TableHead>Deposit</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {drivers.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={11}
                              className="text-center py-8"
                            >
                              No drivers found
                            </TableCell>
                          </TableRow>
                        ) : (
                          drivers.map((driver) => (
                            <TableRow key={driver.id}>
                              {/* <TableCell>
                                <Avatar className="h-8 w-8">
                                  <AvatarImage
                                    src={driver.profile_photo || undefined}
                                  />
                                  <AvatarFallback>
                                    {driver.name?.charAt(0) || "U"}
                                  </AvatarFallback>
                                </Avatar>
                              </TableCell> */}
                              <TableCell className="font-medium">
                                {driver.name}
                              </TableCell>
                              <TableCell>
                                {driver.joining_date
                                  ? format(
                                      new Date(driver.joining_date),
                                      "dd MMM yyyy"
                                    )
                                  : "Not available"}
                              </TableCell>
                              <TableCell>{driver.phone_number}</TableCell>
                              <TableCell>
                                {driver.vehicle_number || "Not assigned"}
                              </TableCell>
                              <TableCell>
                                {driver.shift ? (
                                  <Badge
                                    variant={
                                      driver.shift === "morning"
                                        ? "default"
                                        : "secondary"
                                    }
                                    className="px-2 py-1 text-xs"
                                  >
                                    {driver.shift}
                                  </Badge>
                                ) : (
                                  "Not set"
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center space-x-2">
                                  {isUpdating === driver.id ? (
                                    <div className="h-4 w-4 rounded-full border-2 border-t-transparent border-blue-500 animate-spin"></div>
                                  ) : (
                                    <>
                                      {driver.online ? (
                                        <Wifi className="h-4 w-4 text-green-500" />
                                      ) : (
                                        <WifiOff className="h-4 w-4 text-red-500" />
                                      )}
                                    </>
                                  )}
                                  <Switch
                                    checked={driver.online || false}
                                    onCheckedChange={() =>
                                      toggleOnlineStatus(
                                        driver.id,
                                        driver.online
                                      )
                                    }
                                    disabled={isUpdating === driver.id}
                                    className="data-[state=checked]:bg-green-500"
                                  />
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    driver.is_verified
                                      ? "success"
                                      : "destructive"
                                  }
                                  className="cursor-pointer px-2 py-1 text-xs"
                                  onClick={() =>
                                    toggleVerification(
                                      driver.id,
                                      driver.is_verified
                                    )
                                  }
                                >
                                  {driver.is_verified
                                    ? "Verified"
                                    : "Unverified"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex space-x-1">
                                  {driver.license ? (
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                  ) : (
                                    <XCircle className="h-4 w-4 text-red-500" />
                                  )}
                                  {driver.aadhar ? (
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                  ) : (
                                    <XCircle className="h-4 w-4 text-red-500" />
                                  )}
                                  {driver.pan ? (
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                  ) : (
                                    <XCircle className="h-4 w-4 text-red-500" />
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>{driver.total_trip || "0"}</TableCell>
                              <TableCell>
                                <div className="flex items-center">
                                  <IndianRupee className="h-3 w-3 mr-1" />
                                  {driver.pending_balance || "0"}
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
                </ScrollArea>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <Card className="mt-4">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * pageSize + 1} to{" "}
                {Math.min(currentPage * pageSize, totalCount)} of {totalCount}{" "}
                drivers
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1 || loading}
                >
                  Previous
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <Button
                        key={pageNum}
                        variant={
                          currentPage === pageNum ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        disabled={loading}
                        className="w-8 h-8 p-0"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages || loading}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <DriverDetailsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        driverId={selectedDriver?.id ?? ""}
        onDriverUpdate={fetchDrivers}
      />
    </AdminLayout>
  );
};

export default AdminDrivers;
