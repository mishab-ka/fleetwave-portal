import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Filter,
  Search,
  Users,
  Phone,
} from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  parseISO,
} from "date-fns";

interface CalendarEvent {
  date: string;
  lead_name: string;
  status_name: string;
  status_color: string;
  staff_name: string;
}

interface LeadStatus {
  id: string;
  name: string;
  display_name: string;
  color: string;
}

const HRCalendar: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<CalendarEvent[]>([]);
  const [leadStatuses, setLeadStatuses] = useState<LeadStatus[]>([]);
  const [loading, setLoading] = useState(false);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [staffFilter, setStaffFilter] = useState("all");

  useEffect(() => {
    fetchData();
  }, [currentDate]);

  useEffect(() => {
    filterEvents();
  }, [events, searchTerm, statusFilter, staffFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchCalendarEvents(), fetchLeadStatuses()]);
    } catch (error) {
      console.error("Error fetching calendar data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCalendarEvents = async () => {
    const startDate = startOfMonth(currentDate);
    const endDate = endOfMonth(currentDate);

    try {
      const { data, error } = await supabase.rpc("get_hr_calendar_data", {
        start_date: format(startDate, "yyyy-MM-dd"),
        end_date: format(endDate, "yyyy-MM-dd"),
      });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error("Error fetching calendar events:", error);
    }
  };

  const fetchLeadStatuses = async () => {
    const { data, error } = await supabase
      .from("hr_lead_statuses")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) throw error;
    setLeadStatuses(data || []);
  };

  const filterEvents = () => {
    let filtered = [...events];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (event) =>
          event.lead_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          event.staff_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((event) => event.status_name === statusFilter);
    }

    // Staff filter
    if (staffFilter !== "all") {
      filtered = filtered.filter((event) => event.staff_name === staffFilter);
    }

    setFilteredEvents(filtered);
  };

  const navigateMonth = (direction: "prev" | "next") => {
    if (direction === "prev") {
      setCurrentDate(subMonths(currentDate, 1));
    } else {
      setCurrentDate(addMonths(currentDate, 1));
    }
  };

  const getEventsForDate = (date: Date) => {
    return filteredEvents.filter((event) =>
      isSameDay(parseISO(event.date), date)
    );
  };

  const getUniqueStaff = () => {
    const staff = [...new Set(events.map((event) => event.staff_name))];
    return staff.sort();
  };

  const renderCalendar = () => {
    const startDate = startOfMonth(currentDate);
    const endDate = endOfMonth(currentDate);
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    // Get first day of week for the month
    const firstDayOfWeek = startDate.getDay();
    const emptyDays = Array.from({ length: firstDayOfWeek }, (_, i) => i);

    return (
      <div className="grid grid-cols-7 gap-1">
        {/* Day headers */}
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div
            key={day}
            className="p-2 text-center font-medium text-gray-600 bg-gray-50 rounded"
          >
            {day}
          </div>
        ))}

        {/* Empty days for the first week */}
        {emptyDays.map((_, index) => (
          <div
            key={`empty-${index}`}
            className="p-2 min-h-[100px] border rounded"
          ></div>
        ))}

        {/* Calendar days */}
        {days.map((day) => {
          const dayEvents = getEventsForDate(day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isToday = isSameDay(day, new Date());

          return (
            <div
              key={day.toISOString()}
              className={`p-2 min-h-[100px] border rounded ${
                isCurrentMonth ? "bg-white" : "bg-gray-50"
              } ${isToday ? "ring-2 ring-fleet-purple" : ""}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-sm font-medium ${
                    isCurrentMonth ? "text-gray-900" : "text-gray-400"
                  }`}
                >
                  {format(day, "d")}
                </span>
                {isToday && (
                  <div className="w-2 h-2 bg-fleet-purple rounded-full"></div>
                )}
              </div>

              <div className="space-y-1">
                {dayEvents.slice(0, 3).map((event, index) => (
                  <div
                    key={index}
                    className="text-xs p-1 rounded truncate"
                    style={{ backgroundColor: event.status_color + "20" }}
                    title={`${event.lead_name} - ${event.status_name} (${event.staff_name})`}
                  >
                    <div className="font-medium truncate">
                      {event.lead_name}
                    </div>
                    <div className="text-gray-600 truncate">
                      {event.staff_name}
                    </div>
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-xs text-gray-500">
                    +{dayEvents.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const getEventSummary = () => {
    const summary: { [key: string]: number } = {};
    filteredEvents.forEach((event) => {
      summary[event.status_name] = (summary[event.status_name] || 0) + 1;
    });
    return summary;
  };

  const eventSummary = getEventSummary();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-fleet-purple"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-fleet-purple">HR Calendar</h1>
          <p className="text-gray-600">Track joining dates and lead statuses</p>
        </div>
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => navigateMonth("prev")}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>
          <h2 className="text-xl font-semibold">
            {format(currentDate, "MMMM yyyy")}
          </h2>
          <Button
            variant="outline"
            onClick={() => navigateMonth("next")}
            className="flex items-center gap-2"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="search"
                  placeholder="Search by lead name or staff..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="status-filter">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {leadStatuses.map((status) => (
                    <SelectItem key={status.id} value={status.name}>
                      {status.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="staff-filter">Staff</Label>
              <Select value={staffFilter} onValueChange={setStaffFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Staff" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Staff</SelectItem>
                  {getUniqueStaff().map((staff) => (
                    <SelectItem key={staff} value={staff}>
                      {staff}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Event Summary */}
      {Object.keys(eventSummary).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              Event Summary for {format(currentDate, "MMMM yyyy")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {Object.entries(eventSummary).map(([status, count]) => (
                <div key={status} className="flex items-center gap-2">
                  <Badge variant="outline">{status}</Badge>
                  <span className="text-sm text-gray-600">{count} events</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calendar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            {format(currentDate, "MMMM yyyy")} Calendar
          </CardTitle>
        </CardHeader>
        <CardContent>{renderCalendar()}</CardContent>
      </Card>

      {/* Event Details */}
      {filteredEvents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Event Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredEvents.map((event, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: event.status_color }}
                    />
                    <div>
                      <p className="font-medium">{event.lead_name}</p>
                      <p className="text-sm text-gray-600">
                        {format(parseISO(event.date), "MMM dd, yyyy")} •{" "}
                        {event.staff_name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge style={{ backgroundColor: event.status_color }}>
                      {event.status_name}
                    </Badge>
                    <Button size="sm" variant="outline">
                      <Phone className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Events Message */}
      {filteredEvents.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Events Found
            </h3>
            <p className="text-gray-600">
              {searchTerm || statusFilter !== "all" || staffFilter !== "all"
                ? "Try adjusting your filters to see more events."
                : "No joining dates scheduled for this month."}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default HRCalendar;
