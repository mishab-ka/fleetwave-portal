import React, { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { 
  Activity, 
  Download, 
  Search, 
  Filter, 
  Calendar as CalendarIcon,
  TrendingUp,
  Users,
  BarChart3,
  FileCheck,
  UserCog,
  Car,
  DollarSign,
  ClipboardList,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  XCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  StaffActivityLog,
  subscribeToStaffActivity,
  fetchStaffActivityLogs,
  getActivityStatistics,
} from "@/services/staffActivityService";
import { cn } from "@/lib/utils";

const StaffActivityMonitor: React.FC = () => {
  const [activities, setActivities] = useState<StaffActivityLog[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<StaffActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [staffMembers, setStaffMembers] = useState<{ id: string; name: string }[]>([]);
  
  // Filters
  const [selectedStaff, setSelectedStaff] = useState<string>("");
  const [selectedActionType, setSelectedActionType] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  
  // Statistics
  const [statistics, setStatistics] = useState<any>(null);
  
  // Pagination
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const ITEMS_PER_PAGE = 50;

  // Fetch staff members
  useEffect(() => {
    const fetchStaffMembers = async () => {
      const { data } = await supabase
        .from("users")
        .select("id, name")
        .in("role", ["admin", "manager", "accountant", "hr_manager", "hr_staff", "hr"])
        .order("name");
      
      if (data) {
        setStaffMembers(data);
      }
    };
    fetchStaffMembers();
  }, []);

  // Fetch activities
  const fetchActivities = async (append = false) => {
    try {
      setLoading(true);
      const offset = append ? activities.length : 0;
      
      const data = await fetchStaffActivityLogs({
        staffUserId: selectedStaff || undefined,
        actionType: selectedActionType || undefined,
        actionCategory: selectedCategory || undefined,
        dateFrom: dateFrom,
        dateTo: dateTo,
        limit: ITEMS_PER_PAGE,
        offset: offset,
      });

      if (append) {
        setActivities((prev) => [...prev, ...data]);
      } else {
        setActivities(data);
        setPage(0);
      }

      setHasMore(data.length === ITEMS_PER_PAGE);
    } catch (error) {
      console.error("Error fetching activities:", error);
      toast.error("Failed to fetch activities");
    } finally {
      setLoading(false);
    }
  };

  // Fetch statistics
  const fetchStatistics = async () => {
    try {
      const stats = await getActivityStatistics(dateFrom, dateTo);
      setStatistics(stats);
    } catch (error) {
      console.error("Error fetching statistics:", error);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchActivities();
    fetchStatistics();
  }, [selectedStaff, selectedActionType, selectedCategory, dateFrom, dateTo]);

  // Real-time subscription
  useEffect(() => {
    const channel = subscribeToStaffActivity((payload) => {
      const newActivity = payload.new as StaffActivityLog;
      setActivities((prev) => [newActivity, ...prev]);
      toast.success(`New activity: ${newActivity.description}`, {
        duration: 3000,
      });
      
      // Refresh statistics
      fetchStatistics();
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [dateFrom, dateTo]);

  // Apply search filter
  useEffect(() => {
    if (searchQuery) {
      const filtered = activities.filter((activity) =>
        activity.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        activity.staff_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        JSON.stringify(activity.metadata).toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredActivities(filtered);
    } else {
      setFilteredActivities(activities);
    }
  }, [activities, searchQuery]);

  // Export to CSV
  const exportToCSV = () => {
    const csv = [
      ["Timestamp", "Staff Name", "Role", "Action", "Category", "Description", "Details"],
      ...filteredActivities.map((a) => [
        format(new Date(a.created_at), "yyyy-MM-dd HH:mm:ss"),
        a.staff_name,
        a.staff_role,
        a.action_type,
        a.action_category,
        a.description,
        JSON.stringify(a.metadata),
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `staff-activity-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success("Activity log exported successfully");
  };

  // Clear filters
  const clearFilters = () => {
    setSelectedStaff("");
    setSelectedActionType("");
    setSelectedCategory("");
    setSearchQuery("");
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  // Get icon for action type
  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case "approve_report":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "reject_report":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "edit_report":
      case "edit_driver":
        return <Edit className="h-5 w-5 text-blue-500" />;
      case "create_driver":
        return <Users className="h-5 w-5 text-green-500" />;
      case "delete_driver":
        return <Trash2 className="h-5 w-5 text-red-500" />;
      case "driver_online":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "driver_offline":
        return <XCircle className="h-5 w-5 text-orange-500" />;
      case "assign_vehicle":
      case "change_shift":
        return <Car className="h-5 w-5 text-blue-500" />;
      case "submit_audit":
      case "approve_audit":
        return <FileCheck className="h-5 w-5 text-purple-500" />;
      case "view_page":
        return <Eye className="h-5 w-5 text-gray-500" />;
      case "export_data":
        return <Download className="h-5 w-5 text-blue-500" />;
      default:
        return <Activity className="h-5 w-5 text-gray-500" />;
    }
  };

  // Get color for category
  const getCategoryColor = (category: string) => {
    switch (category) {
      case "reports":
        return "bg-blue-100 text-blue-800";
      case "drivers":
        return "bg-green-100 text-green-800";
      case "vehicles":
        return "bg-purple-100 text-purple-800";
      case "finance":
        return "bg-yellow-100 text-yellow-800";
      case "hr":
        return "bg-pink-100 text-pink-800";
      case "audit":
        return "bg-indigo-100 text-indigo-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <AdminLayout title="Staff Activity Monitor">
      <div className="space-y-6">
        {/* Statistics Section */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Activities</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statistics.totalActivities}</div>
                <p className="text-xs text-muted-foreground">
                  {dateFrom ? `Since ${format(dateFrom, "MMM d")}` : "All time"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Most Active Staff</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statistics.mostActiveStaff[0]?.name || "N/A"}
                </div>
                <p className="text-xs text-muted-foreground">
                  {statistics.mostActiveStaff[0]?.count || 0} activities
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Activity Breakdown</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {Object.entries(statistics.categoryCounts)
                    .slice(0, 3)
                    .map(([category, count]) => (
                      <div key={category} className="flex justify-between text-xs">
                        <span className="capitalize">{category}</span>
                        <span className="font-medium">{count as number}</span>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
            <CardDescription>Filter activities by staff, action, category, and date range</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div>
                <Label>Staff Member</Label>
                <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                  <SelectTrigger>
                    <SelectValue placeholder="All staff" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All staff</SelectItem>
                    {staffMembers.map((staff) => (
                      <SelectItem key={staff.id} value={staff.id}>
                        {staff.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Action Type</Label>
                <Select value={selectedActionType} onValueChange={setSelectedActionType}>
                  <SelectTrigger>
                    <SelectValue placeholder="All actions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All actions</SelectItem>
                    <SelectItem value="approve_report">Approve Report</SelectItem>
                    <SelectItem value="reject_report">Reject Report</SelectItem>
                    <SelectItem value="edit_driver">Edit Driver</SelectItem>
                    <SelectItem value="driver_online">Driver Online</SelectItem>
                    <SelectItem value="driver_offline">Driver Offline</SelectItem>
                    <SelectItem value="submit_audit">Submit Audit</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Category</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    <SelectItem value="reports">Reports</SelectItem>
                    <SelectItem value="drivers">Drivers</SelectItem>
                    <SelectItem value="vehicles">Vehicles</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                    <SelectItem value="hr">HR</SelectItem>
                    <SelectItem value="audit">Audit</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Date From</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateFrom ? format(dateFrom, "MMM d, yyyy") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label>Date To</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateTo ? format(dateTo, "MMM d, yyyy") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={dateTo} onSelect={setDateTo} />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex items-end">
                <Button variant="outline" onClick={clearFilters} className="w-full">
                  Clear Filters
                </Button>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search activities..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              <Button onClick={exportToCSV} variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Activity Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Activity Timeline</CardTitle>
            <CardDescription>
              Showing {filteredActivities.length} activities
              {searchQuery && ` matching "${searchQuery}"`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading && activities.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              </div>
            ) : filteredActivities.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No activities found
              </div>
            ) : (
              <ScrollArea className="h-[600px]">
                <div className="space-y-4">
                  {filteredActivities.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex gap-4 p-4 border rounded-lg hover:bg-accent transition-colors"
                    >
                      <div className="flex-shrink-0 mt-1">
                        {getActionIcon(activity.action_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="font-medium">{activity.description}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {activity.staff_name}
                              </Badge>
                              <Badge className={cn("text-xs", getCategoryColor(activity.action_category))}>
                                {activity.action_category}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                              </span>
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground whitespace-nowrap">
                            {format(new Date(activity.created_at), "MMM d, HH:mm")}
                          </div>
                        </div>
                        {Object.keys(activity.metadata).length > 0 && (
                          <details className="mt-2">
                            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                              View details
                            </summary>
                            <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-x-auto">
                              {JSON.stringify(activity.metadata, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {hasMore && (
                  <div className="flex justify-center mt-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setPage(page + 1);
                        fetchActivities(true);
                      }}
                      disabled={loading}
                    >
                      Load More
                    </Button>
                  </div>
                )}
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default StaffActivityMonitor;
