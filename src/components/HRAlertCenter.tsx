import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle,
  X,
  Filter,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  getAllAlerts,
  getAlerts,
  markAlertAsRead,
  resolveAlert,
  type PerformanceAlert,
  type AlertSeverity,
} from "@/services/hrTargetsService";
import { toast } from "sonner";

interface HRAlertCenterProps {
  staffView?: boolean; // If true, show only current user's alerts
  compact?: boolean;
}

const HRAlertCenter: React.FC<HRAlertCenterProps> = ({
  staffView = false,
  compact = false,
}) => {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  useEffect(() => {
    if (user) {
      fetchAlerts();
    }
  }, [user, severityFilter, showUnreadOnly]);

  const fetchAlerts = async () => {
    if (!user) return;

    setLoading(true);
    try {
      let alertsData: any[];

      if (staffView) {
        // Get alerts for current staff member
        alertsData = await getAlerts(user.id, {
          unreadOnly: showUnreadOnly,
          limit: compact ? 5 : 50,
        });
      } else {
        // Get all alerts for managers
        alertsData = await getAllAlerts({
          unreadOnly: showUnreadOnly,
          severity: severityFilter !== "all" ? (severityFilter as AlertSeverity) : undefined,
          limit: compact ? 10 : 100,
        });
      }

      setAlerts(alertsData);
    } catch (error) {
      console.error("Error fetching alerts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (alertId: string) => {
    const result = await markAlertAsRead(alertId);
    if (result.success) {
      toast.success("Alert marked as read");
      fetchAlerts();
    } else {
      toast.error("Failed to mark alert as read");
    }
  };

  const handleResolve = async (alertId: string) => {
    if (!user) return;

    const result = await resolveAlert(alertId, user.id);
    if (result.success) {
      toast.success("Alert resolved");
      fetchAlerts();
    } else {
      toast.error("Failed to resolve alert");
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <AlertCircle className="w-4 h-4" />;
      case "warning":
        return <AlertTriangle className="w-4 h-4" />;
      case "info":
        return <Info className="w-4 h-4" />;
      default:
        return <Info className="w-4 h-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-100 text-red-800 border-red-200";
      case "warning":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "info":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getAlertTypeLabel = (type: string): string => {
    const labels: { [key: string]: string } = {
      target_missed: "Target Missed",
      low_activity: "Low Activity",
      no_clock_in: "No Clock-In",
      idle_time: "Idle Time",
      late_clock_in: "Late Clock-In",
      early_clock_out: "Early Clock-Out",
      low_conversion: "Low Conversion",
      no_calls: "No Calls",
      target_50_percent: "50% Target",
      target_achieved: "Target Achieved",
      excellent_performance: "Excellent Performance",
    };
    return labels[type] || type;
  };

  const unreadCount = alerts.filter((a) => !a.is_read).length;

  if (compact) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Recent Alerts
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {unreadCount}
                </Badge>
              )}
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowUnreadOnly(!showUnreadOnly)}
            >
              <Filter className="w-3 h-3 mr-1" />
              {showUnreadOnly ? "All" : "Unread"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            <div className="text-center py-4">
              <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            </div>
          ) : alerts.length === 0 ? (
            <div className="text-center py-4 text-gray-500 text-sm">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
              No alerts
            </div>
          ) : (
            alerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-3 rounded-lg border ${
                  alert.is_read ? "bg-gray-50" : "bg-white"
                } ${getSeverityColor(alert.severity)}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 flex-1">
                    {getSeverityIcon(alert.severity)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          {getAlertTypeLabel(alert.alert_type)}
                        </Badge>
                        {!staffView && alert.users && (
                          <span className="text-xs font-medium">
                            {alert.users.name || alert.users.phone_number}
                          </span>
                        )}
                      </div>
                      <p className="text-sm">{alert.message}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(alert.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  {!alert.is_read && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMarkAsRead(alert.id)}
                      className="h-6 w-6 p-0"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium">Filters:</span>
            </div>

            {!staffView && (
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                </SelectContent>
              </Select>
            )}

            <Button
              variant={showUnreadOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setShowUnreadOnly(!showUnreadOnly)}
            >
              {showUnreadOnly ? "Showing Unread" : "Show Unread Only"}
            </Button>

            <div className="ml-auto text-sm text-gray-600">
              {unreadCount > 0 && (
                <Badge variant="destructive">{unreadCount} unread</Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerts List */}
      <Card>
        <CardHeader>
          <CardTitle>Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-gray-500 mt-2">Loading alerts...</p>
            </div>
          ) : alerts.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
              <p className="text-gray-900 font-medium">No alerts found</p>
              <p className="text-gray-500 text-sm mt-1">
                {showUnreadOnly
                  ? "All alerts have been read"
                  : "Everything is running smoothly"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-4 rounded-lg border transition-all ${
                    alert.is_read
                      ? "bg-gray-50 border-gray-200"
                      : "bg-white border-gray-300 shadow-sm"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${getSeverityColor(
                          alert.severity
                        )}`}
                      >
                        {getSeverityIcon(alert.severity)}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge
                            variant="outline"
                            className={getSeverityColor(alert.severity)}
                          >
                            {getAlertTypeLabel(alert.alert_type)}
                          </Badge>
                          {!staffView && alert.users && (
                            <span className="text-sm font-medium text-gray-900">
                              {alert.users.name || alert.users.phone_number}
                            </span>
                          )}
                          {alert.is_resolved && (
                            <Badge variant="success" className="text-xs">
                              Resolved
                            </Badge>
                          )}
                        </div>

                        <p className="text-gray-900 mb-2">{alert.message}</p>

                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>
                            {new Date(alert.created_at).toLocaleString()}
                          </span>
                          <span>•</span>
                          <span>
                            {new Date(alert.date).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      {!alert.is_read && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleMarkAsRead(alert.id)}
                        >
                          Mark Read
                        </Button>
                      )}
                      {!alert.is_resolved && !staffView && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleResolve(alert.id)}
                        >
                          Resolve
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default HRAlertCenter;

