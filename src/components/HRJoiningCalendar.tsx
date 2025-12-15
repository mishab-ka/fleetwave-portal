import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Calendar as CalendarIcon,
  Users,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Check,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
  format,
  startOfDay,
  endOfDay,
  addDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  isSameDay,
  parseISO,
  isWithinInterval,
} from "date-fns";

interface JoiningEvent {
  id: string;
  name: string;
  phone_number: string;
  joining_date: string;
  status: string;
  source: string;
  assigned_staff_user_id: string;
  staff_name?: string;
}

type FilterType = "today" | "tomorrow" | "this_week" | "this_month";

const HRJoiningCalendar: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [events, setEvents] = useState<JoiningEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<JoiningEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [markingAsJoined, setMarkingAsJoined] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>("tomorrow");
  const [stats, setStats] = useState({
    today: 0,
    tomorrow: 0,
    thisWeek: 0,
    thisMonth: 0,
  });

  useEffect(() => {
    fetchJoiningEvents();
  }, [user]);

  useEffect(() => {
    applyFilter();
  }, [events, activeFilter]);

  const fetchJoiningEvents = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      // Fetch leads with joining dates - only show confirmed leads (not joined or not_interested)
      const { data: leads, error } = await supabase
        .from("hr_leads")
        .select("*")
        .not("joining_date", "is", null)
        .not("status", "in", '("joined","not_interested")')
        .order("joining_date", { ascending: true });

      if (error) {
        console.error("Error fetching leads:", error);
        throw error;
      }

      console.log("Fetched leads with joining dates:", leads);

      // Fetch staff names separately
      const staffIds = [
        ...new Set(
          (leads || [])
            .map((lead: any) => lead.assigned_staff_user_id)
            .filter(Boolean)
        ),
      ];

      const staffNames: Record<string, string> = {};
      if (staffIds.length > 0) {
        const { data: staffData } = await supabase
          .from("users")
          .select("id, name")
          .in("id", staffIds);

        if (staffData) {
          staffData.forEach((staff: any) => {
            staffNames[staff.id] = staff.name;
          });
        }
      }

      const formattedEvents: JoiningEvent[] = (leads || []).map(
        (lead: any) => ({
          id: lead.id,
          name: lead.name,
          phone_number: lead.phone || lead.phone_number, // Handle both column names
          joining_date: lead.joining_date,
          status: lead.status,
          source: lead.source || "Unknown",
          assigned_staff_user_id: lead.assigned_staff_user_id,
          staff_name:
            staffNames[lead.assigned_staff_user_id] || "Unknown Staff",
        })
      );

      console.log("Formatted events:", formattedEvents);

      setEvents(formattedEvents);
      calculateStats(formattedEvents);
    } catch (error) {
      console.error("Error fetching joining events:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (allEvents: JoiningEvent[]) => {
    const now = new Date();
    const today = startOfDay(now);
    const tomorrow = startOfDay(addDays(now, 1));
    const weekStart = startOfWeek(now);
    const weekEnd = endOfWeek(now);
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const stats = {
      today: 0,
      tomorrow: 0,
      thisWeek: 0,
      thisMonth: 0,
    };

    allEvents.forEach((event) => {
      const eventDate = parseISO(event.joining_date);

      if (isSameDay(eventDate, today)) {
        stats.today++;
      }
      if (isSameDay(eventDate, tomorrow)) {
        stats.tomorrow++;
      }
      if (isWithinInterval(eventDate, { start: weekStart, end: weekEnd })) {
        stats.thisWeek++;
      }
      if (isWithinInterval(eventDate, { start: monthStart, end: monthEnd })) {
        stats.thisMonth++;
      }
    });

    setStats(stats);
  };

  const markAsJoined = async (leadId: string) => {
    setMarkingAsJoined(leadId);
    try {
      // Update lead status to joined
      const { error: updateError } = await supabase
        .from("hr_leads")
        .update({ status: "joined" })
        .eq("id", leadId);

      if (updateError) throw updateError;

      // Log the activity
      await supabase.from("hr_lead_activities").insert([
        {
          lead_id: leadId,
          staff_user_id: user?.id,
          activity_type: "status_change",
          description: "Status updated to Joined from calendar",
        },
      ]);

      toast({
        title: "Success",
        description: "Lead marked as joined successfully!",
      });

      // Refresh the events list
      await fetchJoiningEvents();
    } catch (error) {
      console.error("Error marking as joined:", error);
      toast({
        title: "Error",
        description: "Failed to mark lead as joined. Please try again.",
        variant: "destructive",
      });
    } finally {
      setMarkingAsJoined(null);
    }
  };

  const applyFilter = () => {
    const now = new Date();
    let filtered: JoiningEvent[] = [];

    switch (activeFilter) {
      case "today":
        filtered = events.filter((event) =>
          isSameDay(parseISO(event.joining_date), startOfDay(now))
        );
        break;
      case "tomorrow":
        filtered = events.filter((event) =>
          isSameDay(parseISO(event.joining_date), startOfDay(addDays(now, 1)))
        );
        break;
      case "this_week":
        filtered = events.filter((event) =>
          isWithinInterval(parseISO(event.joining_date), {
            start: startOfWeek(now),
            end: endOfWeek(now),
          })
        );
        break;
      case "this_month":
        filtered = events.filter((event) =>
          isWithinInterval(parseISO(event.joining_date), {
            start: startOfMonth(now),
            end: endOfMonth(now),
          })
        );
        break;
    }

    // Sort by date
    filtered.sort(
      (a, b) =>
        parseISO(a.joining_date).getTime() - parseISO(b.joining_date).getTime()
    );

    setFilteredEvents(filtered);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      new: "bg-blue-100 text-blue-800 border-blue-200",
      contacted: "bg-yellow-100 text-yellow-800 border-yellow-200",
      hot_lead: "bg-red-100 text-red-800 border-red-200",
      cold_lead: "bg-gray-100 text-gray-800 border-gray-200",
      callback: "bg-purple-100 text-purple-800 border-purple-200",
      joined: "bg-green-100 text-green-800 border-green-200",
      not_interested: "bg-gray-100 text-gray-600 border-gray-200",
    };
    return colors[status] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  const getStatusIcon = (status: string) => {
    if (status === "joined") return <CheckCircle className="w-4 h-4" />;
    if (status === "not_interested") return <XCircle className="w-4 h-4" />;
    return <Clock className="w-4 h-4" />;
  };

  const getFilterLabel = (filter: FilterType) => {
    switch (filter) {
      case "today":
        return "Today";
      case "tomorrow":
        return "Tomorrow";
      case "this_week":
        return "This Week";
      case "this_month":
        return "This Month";
    }
  };

  const groupEventsByDate = () => {
    const grouped: Record<string, JoiningEvent[]> = {};

    filteredEvents.forEach((event) => {
      const dateKey = format(parseISO(event.joining_date), "yyyy-MM-dd");
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(event);
    });

    return grouped;
  };

  const groupedEvents = groupEventsByDate();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CalendarIcon className="w-7 h-7 text-purple-600" />
            Joining Calendar
          </h2>
          <p className="text-gray-600 mt-1">
            Track confirmed leads scheduled to join
          </p>
          <div className="mt-2">
            <Badge variant="outline" className="text-xs">
              <CheckCircle className="w-3 h-3 mr-1" />
              Showing only confirmed leads
            </Badge>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card
          className={`cursor-pointer transition-all ${
            activeFilter === "today"
              ? "ring-2 ring-green-500 shadow-lg"
              : "hover:shadow-md"
          }`}
          onClick={() => setActiveFilter("today")}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Today</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.today}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all ${
            activeFilter === "tomorrow"
              ? "ring-2 ring-blue-500 shadow-lg"
              : "hover:shadow-md"
          }`}
          onClick={() => setActiveFilter("tomorrow")}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Tomorrow</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.tomorrow}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all ${
            activeFilter === "this_week"
              ? "ring-2 ring-purple-500 shadow-lg"
              : "hover:shadow-md"
          }`}
          onClick={() => setActiveFilter("this_week")}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">This Week</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.thisWeek}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <CalendarIcon className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all ${
            activeFilter === "this_month"
              ? "ring-2 ring-orange-500 shadow-lg"
              : "hover:shadow-md"
          }`}
          onClick={() => setActiveFilter("this_month")}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">This Month</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.thisMonth}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                <Users className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Events List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>
              {getFilterLabel(activeFilter)} ({filteredEvents.length})
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchJoiningEvents}
              disabled={loading}
            >
              {loading ? "Loading..." : "Refresh"}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] pr-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="text-center py-12">
                <CalendarIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">
                  No joining dates for{" "}
                  {getFilterLabel(activeFilter).toLowerCase()}
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedEvents).map(([date, dayEvents]) => (
                  <div key={date} className="space-y-3">
                    {/* Date Header */}
                    <div className="flex items-center gap-3 pb-2 border-b-2 border-purple-200">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                        <span className="text-white font-bold text-lg">
                          {format(parseISO(date), "dd")}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">
                          {format(parseISO(date), "EEEE")}
                        </p>
                        <p className="text-sm text-gray-600">
                          {format(parseISO(date), "MMMM d, yyyy")}
                        </p>
                      </div>
                      <Badge variant="secondary" className="ml-auto">
                        {dayEvents.length} joining
                        {dayEvents.length !== 1 ? "s" : ""}
                      </Badge>
                    </div>

                    {/* Events for this date */}
                    <div className="space-y-2 pl-4">
                      {dayEvents.map((event) => (
                        <Card
                          key={event.id}
                          className="hover:shadow-md transition-all border-l-4 border-l-purple-500"
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h4 className="font-semibold text-gray-900">
                                    {event.name}
                                  </h4>
                                  <Badge
                                    className={`${getStatusColor(
                                      event.status
                                    )} border flex items-center gap-1`}
                                  >
                                    {getStatusIcon(event.status)}
                                    {event.status.replace("_", " ")}
                                  </Badge>
                                </div>

                                <div className="space-y-1 text-sm text-gray-600">
                                  <p className="flex items-center gap-2">
                                    <span className="font-medium">Phone:</span>
                                    <a
                                      href={`tel:${event.phone_number}`}
                                      className="text-blue-600 hover:underline"
                                    >
                                      {event.phone_number}
                                    </a>
                                  </p>
                                  <p className="flex items-center gap-2">
                                    <span className="font-medium">Staff:</span>
                                    {event.staff_name}
                                  </p>
                                  {event.source && (
                                    <p className="flex items-center gap-2">
                                      <span className="font-medium">
                                        Source:
                                      </span>
                                      <Badge
                                        variant="outline"
                                        className="text-xs"
                                      >
                                        {event.source}
                                      </Badge>
                                    </p>
                                  )}
                                </div>

                                {/* Mark as Joined Button */}
                                <div className="mt-3">
                                  <Button
                                    onClick={() => markAsJoined(event.id)}
                                    disabled={markingAsJoined === event.id}
                                    size="sm"
                                    className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-sm"
                                  >
                                    {markingAsJoined === event.id ? (
                                      <>
                                        <Clock className="w-4 h-4 mr-2 animate-spin" />
                                        Marking...
                                      </>
                                    ) : (
                                      <>
                                        <Check className="w-4 h-4 mr-2" />
                                        Mark as Joined
                                      </>
                                    )}
                                  </Button>
                                </div>
                              </div>

                              <div className="text-right">
                                <p className="text-sm font-medium text-gray-900">
                                  {format(
                                    parseISO(event.joining_date),
                                    "h:mm a"
                                  )}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default HRJoiningCalendar;
