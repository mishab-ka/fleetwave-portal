import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Phone,
  MessageSquare,
  Search,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Send,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { logActivity } from "@/services/hrActivityTracker";

interface WhatsAppNumber {
  id: string;
  phone_number: string;
  status: string;
  created_at: string;
  last_contact_date?: string;
  callback_date?: string;
  notes?: string;
}

interface WhatsAppActivity {
  id: string;
  phone_number: string;
  activity_type: string;
  description: string;
  created_at: string;
}

const HRStaffWhatsApp: React.FC = () => {
  const { user } = useAuth();
  const [whatsappNumbers, setWhatsappNumbers] = useState<WhatsAppNumber[]>([]);
  const [filteredNumbers, setFilteredNumbers] = useState<WhatsAppNumber[]>([]);
  const [activities, setActivities] = useState<WhatsAppActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    if (user) {
      fetchWhatsAppNumbers();
      fetchActivities();
      // Log page view activity
      logActivity(user.id, "page_viewed", { page: "whatsapp" });
    }
  }, [user]);

  useEffect(() => {
    filterNumbers();
  }, [whatsappNumbers, searchTerm, statusFilter]);

  const fetchWhatsAppNumbers = async () => {
    try {
      const { data, error } = await supabase
        .from("hr_whatsapp_numbers")
        .select("*")
        .eq("assigned_staff_user_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setWhatsappNumbers(data || []);
    } catch (error) {
      console.error("Error fetching WhatsApp numbers:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchActivities = async () => {
    try {
      const { data, error } = await supabase
        .from("hr_whatsapp_activities")
        .select("*")
        .eq("staff_user_id", user?.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      console.error("Error fetching WhatsApp activities:", error);
    }
  };

  const filterNumbers = () => {
    let filtered = [...whatsappNumbers];

    if (searchTerm) {
      filtered = filtered.filter((number) =>
        number.phone_number.includes(searchTerm)
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((number) => number.status === statusFilter);
    }

    setFilteredNumbers(filtered);
  };

  const handleWhatsAppChat = async (phoneNumber: string, numberId: string) => {
    try {
      // Log the WhatsApp chat attempt
      const { error } = await supabase.from("hr_whatsapp_activities").insert([
        {
          whatsapp_number_id: numberId,
          staff_user_id: user?.id,
          activity_type: "chat_initiated",
          description: `WhatsApp chat initiated with ${phoneNumber}`,
        },
      ]);

      if (error) {
        console.error("Error logging WhatsApp chat:", error);
        // Continue with opening WhatsApp even if logging fails
      }

      // Log activity to activity tracker
      if (user) {
        await logActivity(user.id, "whatsapp_sent", {
          phone: phoneNumber,
          whatsapp_number_id: numberId,
        });
      }

      // Open WhatsApp with the phone number
      const cleanNumber = phoneNumber.replace(/\D/g, ""); // Remove non-digits

      // Handle different phone number formats
      let formattedNumber = cleanNumber;
      if (cleanNumber.startsWith("91")) {
        formattedNumber = cleanNumber;
      } else if (cleanNumber.startsWith("+91")) {
        formattedNumber = cleanNumber.substring(1);
      } else if (cleanNumber.length === 10) {
        formattedNumber = "91" + cleanNumber;
      }

      const whatsappUrl = `https://wa.me/${formattedNumber}`;

      // Try to open WhatsApp in a new tab
      const newWindow = window.open(
        whatsappUrl,
        "_blank",
        "noopener,noreferrer"
      );

      if (!newWindow) {
        // If popup was blocked, try alternative method
        const link = document.createElement("a");
        link.href = whatsappUrl;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      // Update last contact date
      await supabase
        .from("hr_whatsapp_numbers")
        .update({
          last_contact_date: new Date().toISOString(),
          status: "contacted",
        })
        .eq("id", numberId);

      // Refresh activities and numbers
      await fetchActivities();
      await fetchWhatsAppNumbers();
    } catch (error) {
      console.error("Error in WhatsApp chat:", error);

      // Still try to open WhatsApp even if there's an error
      const cleanNumber = phoneNumber.replace(/\D/g, "");
      let formattedNumber = cleanNumber;
      if (cleanNumber.startsWith("91")) {
        formattedNumber = cleanNumber;
      } else if (cleanNumber.startsWith("+91")) {
        formattedNumber = cleanNumber.substring(1);
      } else if (cleanNumber.length === 10) {
        formattedNumber = "91" + cleanNumber;
      }

      const whatsappUrl = `https://wa.me/${formattedNumber}`;

      // Try multiple methods to open WhatsApp
      try {
        window.open(whatsappUrl, "_blank", "noopener,noreferrer");
      } catch (e) {
        // Fallback: create a link and click it
        const link = document.createElement("a");
        link.href = whatsappUrl;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }
  };

  const updateNumberStatus = async (numberId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("hr_whatsapp_numbers")
        .update({ status: newStatus })
        .eq("id", numberId);

      if (error) throw error;

      // Log status change
      await supabase.from("hr_whatsapp_activities").insert([
        {
          whatsapp_number_id: numberId,
          staff_user_id: user?.id,
          activity_type: "status_change",
          description: `Status changed to ${newStatus}`,
        },
      ]);

      await fetchWhatsAppNumbers();
      await fetchActivities();
    } catch (error) {
      console.error("Error updating number status:", error);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      new: "bg-blue-100 text-blue-800",
      contacted: "bg-green-100 text-green-800",
      responded: "bg-orange-100 text-orange-800",
      not_interested: "bg-red-100 text-red-800",
      callback: "bg-purple-100 text-purple-800",
      converted: "bg-emerald-100 text-emerald-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "converted":
        return <CheckCircle className="w-4 h-4" />;
      case "not_interested":
        return <XCircle className="w-4 h-4" />;
      case "callback":
        return <Clock className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-fleet-purple"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-fleet-purple">
            WhatsApp Numbers
          </h2>
          <p className="text-gray-600">
            Manage your assigned WhatsApp numbers and track conversations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-green-500/10 rounded-full flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-green-500" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search by phone number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="responded">Responded</SelectItem>
                  <SelectItem value="callback">Callback</SelectItem>
                  <SelectItem value="converted">Converted</SelectItem>
                  <SelectItem value="not_interested">Not Interested</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* WhatsApp Numbers Cards */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Assigned Numbers ({filteredNumbers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredNumbers.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No WhatsApp numbers assigned yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredNumbers.map((number) => (
                <Card
                  key={number.id}
                  className="hover:shadow-md transition-shadow"
                >
                  <CardContent className="p-3">
                    <div className="space-y-3">
                      {/* Phone Number */}
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-sm truncate">
                          {number.phone_number}
                        </span>
                      </div>

                      {/* Status Badge */}
                      <div className="flex justify-center">
                        <Badge className={getStatusColor(number.status)}>
                          <div className="flex items-center gap-1">
                            {getStatusIcon(number.status)}
                            <span className="text-xs">
                              {number.status.replace("_", " ").toUpperCase()}
                            </span>
                          </div>
                        </Badge>
                      </div>

                      {/* Dates */}
                      <div className="space-y-1 text-xs text-gray-500">
                        <div>
                          Assigned:{" "}
                          {new Date(number.created_at).toLocaleDateString()}
                        </div>
                        <div>
                          Last Contact:{" "}
                          {number.last_contact_date
                            ? new Date(
                                number.last_contact_date
                              ).toLocaleDateString()
                            : "Never"}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="space-y-2">
                        <Button
                          size="sm"
                          onClick={() =>
                            handleWhatsAppChat(number.phone_number, number.id)
                          }
                          className="w-full bg-green-600 hover:bg-green-700 text-xs"
                        >
                          <Send className="w-3 h-3 mr-1" />
                          Chat on WhatsApp
                        </Button>
                        <Select
                          value={number.status}
                          onValueChange={(value) =>
                            updateNumberStatus(number.id, value)
                          }
                        >
                          <SelectTrigger className="w-full text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="new">New</SelectItem>
                            <SelectItem value="contacted">Contacted</SelectItem>
                            <SelectItem value="responded">Responded</SelectItem>
                            <SelectItem value="callback">Callback</SelectItem>
                            <SelectItem value="converted">Converted</SelectItem>
                            <SelectItem value="not_interested">
                              Not Interested
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Activities */}
      {activities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Recent Activities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                >
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <MessageSquare className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {activity.description}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(activity.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default HRStaffWhatsApp;
