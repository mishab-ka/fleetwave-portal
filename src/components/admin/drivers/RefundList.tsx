import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  Filter,
  Download,
  Phone,
  Mail,
  MapPin,
  Wallet,
  ArrowUpRight,
  User,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatter } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Driver {
  id: string;
  name: string;
  phone_number: string;
  email_id: string;
  vehicle_number: string;
  shift: string;
  online: boolean;
  pending_balance: number;
  profile_photo?: string;
  date_of_birth?: string;
}

const RefundList = () => {
  const { user } = useAuth();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [shiftFilter, setShiftFilter] = useState("all");
  const [onlineFilter, setOnlineFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"balance" | "name">("balance");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Refund modal state
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [refundDescription, setRefundDescription] = useState("");
  const [isRefundSubmitting, setIsRefundSubmitting] = useState(false);

  useEffect(() => {
    fetchDrivers();
  }, []);

  const fetchDrivers = async () => {
    try {
      setLoading(true);

      // Fetch all online drivers with their balance
      const { data, error } = await supabase
        .from("users")
        .select(
          `
          id,
          name,
          phone_number,
          email_id,
          vehicle_number,
          shift,
          online,
          pending_balance,
          profile_photo,
          date_of_birth
        `
        )
        .eq("role", "user")
        .gte("pending_balance", 2500) // Only drivers with balance >= 2500
        .order("pending_balance", { ascending: false });

      if (error) throw error;

      setDrivers(data || []);
    } catch (error) {
      console.error("Error fetching drivers:", error);
      toast.error("Failed to load drivers data");
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort drivers
  const filteredAndSortedDrivers = drivers
    .filter((driver) => {
      const matchesSearch =
        driver.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        driver.phone_number.includes(searchQuery) ||
        driver.vehicle_number
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase());

      const matchesShift =
        shiftFilter === "all" || driver.shift === shiftFilter;
      const matchesOnline =
        onlineFilter === "all" ||
        (onlineFilter === "online" && driver.online) ||
        (onlineFilter === "offline" && !driver.online);

      return matchesSearch && matchesShift && matchesOnline;
    })
    .sort((a, b) => {
      if (sortBy === "balance") {
        return sortOrder === "asc"
          ? a.pending_balance - b.pending_balance
          : b.pending_balance - a.pending_balance;
      } else {
        return sortOrder === "asc"
          ? (a.name || "").localeCompare(b.name || "")
          : (b.name || "").localeCompare(a.name || "");
      }
    });

  const totalRefundAmount = filteredAndSortedDrivers.reduce(
    (sum, driver) => sum + driver.pending_balance,
    0
  );
  const totalDrivers = filteredAndSortedDrivers.length;

  const handleExportRefundList = () => {
    const headers = [
      "Driver Name",
      "Phone Number",
      "Vehicle Number",
      "Shift",
      "Online Status",
      "Current Balance",
      "Extra Amount (Balance - 2500)",
    ];

    const rows = filteredAndSortedDrivers.map((driver) => [
      driver.name || "N/A",
      driver.phone_number,
      driver.vehicle_number || "N/A",
      driver.shift || "N/A",
      driver.online ? "Online" : "Offline",
      driver.pending_balance.toLocaleString(),
      (driver.pending_balance - 2500).toLocaleString(),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `refund_list_${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`Exported refund list with ${totalDrivers} drivers`);
  };

  const getExtraAmount = (balance: number) => {
    return Math.max(0, balance - 2500);
  };

  const getBalanceColor = (balance: number) => {
    if (balance >= 5000) return "text-red-600";
    if (balance >= 3500) return "text-orange-600";
    return "text-yellow-600";
  };

  const getExtraAmountColor = (extraAmount: number) => {
    if (extraAmount >= 2500) return "text-red-600";
    if (extraAmount >= 1000) return "text-orange-600";
    return "text-yellow-600";
  };

  const handleOpenRefundModal = (driver: Driver) => {
    setSelectedDriver(driver);
    setRefundDescription("");
    setIsRefundModalOpen(true);
  };

  const handleProcessRefund = async () => {
    if (!selectedDriver) return;

    const extraAmount = getExtraAmount(selectedDriver.pending_balance);
    if (extraAmount <= 0) {
      toast.error("No extra amount available for refund");
      return;
    }

    try {
      setIsRefundSubmitting(true);

      // Add due transaction to driver_balance_transactions table
      const { error: txError } = await supabase
        .from("driver_balance_transactions")
        .insert({
          user_id: selectedDriver.id,
          amount: extraAmount,
          type: "due",
          description:
            refundDescription.trim() ||
            `Due amount from extra balance (₹${extraAmount.toLocaleString()})`,
          created_by: user?.id,
        });

      if (txError) throw txError;

      // Update the driver's pending balance (subtract the refunded amount)
      const { error: userError } = await supabase
        .from("users")
        .update({
          pending_balance: selectedDriver.pending_balance - extraAmount,
        })
        .eq("id", selectedDriver.id);

      if (userError) throw userError;

      toast.success(
        `Due amount of ₹${extraAmount.toLocaleString()} added successfully`
      );

      // Close modal and refresh data
      setIsRefundModalOpen(false);
      setSelectedDriver(null);
      setRefundDescription("");
      fetchDrivers(); // Refresh the list
    } catch (error) {
      console.error("Error processing refund:", error);
      toast.error("Failed to process refund");
    } finally {
      setIsRefundSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Refund List</h2>
          <p className="text-gray-600">Drivers with balance exceeding ₹2,500</p>
        </div>
        <Button
          onClick={handleExportRefundList}
          className="bg-green-600 hover:bg-green-700"
        >
          <Download className="mr-2 h-4 w-4" />
          Export List
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Drivers
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  {totalDrivers}
                </p>
              </div>
              <User className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Balance
                </p>
                <p className="text-2xl font-bold text-green-600">
                  ₹{totalRefundAmount.toLocaleString()}
                </p>
              </div>
              <Wallet className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Extra Amount
                </p>
                <p className="text-2xl font-bold text-orange-600">
                  ₹{(totalRefundAmount - totalDrivers * 2500).toLocaleString()}
                </p>
              </div>
              <ArrowUpRight className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search drivers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={shiftFilter} onValueChange={setShiftFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by shift" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Shifts</SelectItem>
                <SelectItem value="morning">Morning</SelectItem>
                <SelectItem value="night">Night</SelectItem>
                <SelectItem value="24hr">24hr</SelectItem>
                <SelectItem value="none">No Shift</SelectItem>
              </SelectContent>
            </Select>

            <Select value={onlineFilter} onValueChange={setOnlineFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="offline">Offline</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={`${sortBy}-${sortOrder}`}
              onValueChange={(value) => {
                const [sort, order] = value.split("-");
                setSortBy(sort as "balance" | "name");
                setSortOrder(order as "asc" | "desc");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="balance-desc">
                  Balance (High to Low)
                </SelectItem>
                <SelectItem value="balance-asc">
                  Balance (Low to High)
                </SelectItem>
                <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                <SelectItem value="name-desc">Name (Z-A)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Drivers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Drivers Eligible for Refund</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-fleet-purple"></div>
            </div>
          ) : filteredAndSortedDrivers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Wallet className="mx-auto h-12 w-12 mb-4 text-gray-400" />
              <p className="text-lg font-medium">No drivers found</p>
              <p className="text-sm">
                No drivers have a balance exceeding ₹2,500
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[400px] w-full">
              <Table>
                <TableHeader className="sticky top-0 bg-white z-10">
                  <TableRow>
                    <TableHead>Driver</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Vehicle & Shift</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">
                      Current Balance
                    </TableHead>
                    <TableHead className="text-right">Extra Amount</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedDrivers.map((driver) => {
                    const extraAmount = getExtraAmount(driver.pending_balance);
                    return (
                      <TableRow key={driver.id} className="hover:bg-gray-50">
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={driver.profile_photo} />
                              <AvatarFallback>
                                {driver.name
                                  ? driver.name
                                      .split(" ")
                                      .map((n) => n[0])
                                      .join("")
                                      .toUpperCase()
                                  : "DR"}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">
                                {driver.name || "Unknown Driver"}
                              </div>
                              <div className="text-sm text-gray-500">
                                ID: {driver.id.slice(0, 8)}...
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center text-sm">
                              <Phone className="h-3 w-3 mr-1 text-gray-400" />
                              {driver.phone_number}
                            </div>
                            {driver.email_id && (
                              <div className="flex items-center text-sm text-gray-500">
                                <Mail className="h-3 w-3 mr-1" />
                                {driver.email_id}
                              </div>
                            )}
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="space-y-1">
                            <div className="text-sm font-medium">
                              {driver.vehicle_number || "N/A"}
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {driver.shift || "No Shift"}
                            </Badge>
                          </div>
                        </TableCell>

                        <TableCell>
                          <Badge
                            variant={driver.online ? "default" : "secondary"}
                            className={
                              driver.online
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            }
                          >
                            {driver.online ? "Online" : "Offline"}
                          </Badge>
                        </TableCell>

                        <TableCell className="text-right">
                          <div
                            className={`font-bold text-lg ${getBalanceColor(
                              driver.pending_balance
                            )}`}
                          >
                            ₹{driver.pending_balance.toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-500">
                            Base: ₹2,500
                          </div>
                        </TableCell>

                        <TableCell className="text-right">
                          <div
                            className={`font-bold text-lg ${getExtraAmountColor(
                              extraAmount
                            )}`}
                          >
                            ₹{extraAmount.toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-500">
                            Refundable
                          </div>
                        </TableCell>

                        <TableCell className="text-center">
                          {extraAmount > 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenRefundModal(driver)}
                              className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                            >
                              <ArrowUpRight className="h-4 w-4 mr-1" />
                              Process Refund
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Refund Modal */}
      <Dialog open={isRefundModalOpen} onOpenChange={setIsRefundModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Due Amount</DialogTitle>
            <DialogDescription>
              Add the extra amount as a due transaction to the driver's balance
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600 mb-2">Driver Details:</div>
              <div className="space-y-1 text-sm">
                <div>
                  <strong>Driver:</strong> {selectedDriver?.name || "Unknown"}
                </div>
                <div>
                  <strong>Current Balance:</strong> ₹
                  {selectedDriver?.pending_balance?.toLocaleString()}
                </div>
                <div>
                  <strong>Extra Amount:</strong> ₹
                  {selectedDriver
                    ? getExtraAmount(
                        selectedDriver.pending_balance
                      ).toLocaleString()
                    : "0"}
                </div>
                <div>
                  <strong>New Balance After Due:</strong> ₹
                  {selectedDriver
                    ? (
                        selectedDriver.pending_balance -
                        getExtraAmount(selectedDriver.pending_balance)
                      ).toLocaleString()
                    : "0"}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="refund-description">Description (Optional)</Label>
              <Textarea
                id="refund-description"
                placeholder="Enter a description for this refund transaction..."
                value={refundDescription}
                onChange={(e) => setRefundDescription(e.target.value)}
                rows={3}
              />
              <p className="text-xs text-gray-500">
                If left empty, a default description will be generated
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsRefundModalOpen(false);
                  setRefundDescription("");
                  setSelectedDriver(null);
                }}
                disabled={isRefundSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleProcessRefund}
                disabled={isRefundSubmitting}
                className="bg-green-600 hover:bg-green-700"
              >
                {isRefundSubmitting ? "Processing..." : "Add Due Amount"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RefundList;
