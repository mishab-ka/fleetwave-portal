import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Settings,
  Clock,
  Bell,
  Target,
  Save,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

/**
 * HR System Settings Component
 * Allows HR Managers to configure:
 * - Work hours and attendance settings
 * - Alert thresholds and notifications
 * - Default targets for new staff
 * - System-wide performance parameters
 */

interface SystemSettings {
  // Work Hours Settings
  standard_work_hours_per_day: number;
  max_work_hours_per_day: number;
  idle_timeout_minutes: number;
  auto_clock_out_enabled: boolean;
  auto_clock_out_after_hours: number;

  // Alert Settings
  alert_on_target_miss: boolean;
  alert_on_extended_idle: boolean;
  idle_alert_threshold_minutes: number;
  alert_on_low_quality: boolean;
  quality_score_threshold: number;

  // Target Settings
  default_daily_calls_target: number;
  default_weekly_calls_target: number;
  default_monthly_calls_target: number;
  default_conversion_rate_target: number;

  // Performance Settings
  min_call_duration_seconds: number;
  max_response_time_hours: number;
}

const HRSystemSettings: React.FC = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<SystemSettings>({
    standard_work_hours_per_day: 8,
    max_work_hours_per_day: 12,
    idle_timeout_minutes: 30,
    auto_clock_out_enabled: true,
    auto_clock_out_after_hours: 12,
    alert_on_target_miss: true,
    alert_on_extended_idle: true,
    idle_alert_threshold_minutes: 30,
    alert_on_low_quality: true,
    quality_score_threshold: 60,
    default_daily_calls_target: 50,
    default_weekly_calls_target: 250,
    default_monthly_calls_target: 1000,
    default_conversion_rate_target: 20,
    min_call_duration_seconds: 30,
    max_response_time_hours: 24,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      loadSettings();
    }
  }, [user]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      // In a real implementation, these would be stored in a settings table
      // For now, we'll use localStorage as a placeholder
      const savedSettings = localStorage.getItem("hr_system_settings");
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      console.error("Error loading settings:", error);
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      // In a real implementation, save to database
      localStorage.setItem("hr_system_settings", JSON.stringify(settings));
      toast.success("Settings saved successfully!");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key: keyof SystemSettings, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-purple-600">System Settings</h2>
          <p className="text-gray-600">
            Configure HR performance monitoring system parameters
          </p>
        </div>
        <Button onClick={saveSettings} disabled={saving}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </div>

      {/* Settings Tabs */}
      <Tabs defaultValue="work-hours" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
          <TabsTrigger value="work-hours" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span className="hidden sm:inline">Work Hours</span>
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            <span className="hidden sm:inline">Alerts</span>
          </TabsTrigger>
          <TabsTrigger value="targets" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            <span className="hidden sm:inline">Targets</span>
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Performance</span>
          </TabsTrigger>
        </TabsList>

        {/* Work Hours Settings */}
        <TabsContent value="work-hours" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Work Hours & Attendance Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="standard-hours">
                    Standard Work Hours Per Day
                  </Label>
                  <Input
                    id="standard-hours"
                    type="number"
                    value={settings.standard_work_hours_per_day}
                    onChange={(e) =>
                      updateSetting(
                        "standard_work_hours_per_day",
                        parseInt(e.target.value)
                      )
                    }
                    min="1"
                    max="24"
                  />
                  <p className="text-sm text-muted-foreground">
                    Expected work hours per day for staff
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max-hours">Maximum Work Hours Per Day</Label>
                  <Input
                    id="max-hours"
                    type="number"
                    value={settings.max_work_hours_per_day}
                    onChange={(e) =>
                      updateSetting(
                        "max_work_hours_per_day",
                        parseInt(e.target.value)
                      )
                    }
                    min="1"
                    max="24"
                  />
                  <p className="text-sm text-muted-foreground">
                    Maximum allowed work hours before auto clock-out
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="idle-timeout">
                    Idle Timeout (Minutes)
                  </Label>
                  <Input
                    id="idle-timeout"
                    type="number"
                    value={settings.idle_timeout_minutes}
                    onChange={(e) =>
                      updateSetting(
                        "idle_timeout_minutes",
                        parseInt(e.target.value)
                      )
                    }
                    min="5"
                    max="120"
                  />
                  <p className="text-sm text-muted-foreground">
                    Minutes of inactivity before marking as idle
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="auto-clock-out-hours">
                    Auto Clock-Out After (Hours)
                  </Label>
                  <Input
                    id="auto-clock-out-hours"
                    type="number"
                    value={settings.auto_clock_out_after_hours}
                    onChange={(e) =>
                      updateSetting(
                        "auto_clock_out_after_hours",
                        parseInt(e.target.value)
                      )
                    }
                    min="1"
                    max="24"
                  />
                  <p className="text-sm text-muted-foreground">
                    Automatically clock out staff after this many hours
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-clock-out">Enable Auto Clock-Out</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically clock out staff after extended periods
                  </p>
                </div>
                <Switch
                  id="auto-clock-out"
                  checked={settings.auto_clock_out_enabled}
                  onCheckedChange={(checked) =>
                    updateSetting("auto_clock_out_enabled", checked)
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alert Settings */}
        <TabsContent value="alerts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Alert & Notification Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label htmlFor="alert-target-miss">
                      Alert on Target Miss
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Generate alerts when staff miss their targets
                    </p>
                  </div>
                  <Switch
                    id="alert-target-miss"
                    checked={settings.alert_on_target_miss}
                    onCheckedChange={(checked) =>
                      updateSetting("alert_on_target_miss", checked)
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label htmlFor="alert-idle">Alert on Extended Idle</Label>
                    <p className="text-sm text-muted-foreground">
                      Generate alerts when staff are idle for too long
                    </p>
                  </div>
                  <Switch
                    id="alert-idle"
                    checked={settings.alert_on_extended_idle}
                    onCheckedChange={(checked) =>
                      updateSetting("alert_on_extended_idle", checked)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="idle-alert-threshold">
                    Idle Alert Threshold (Minutes)
                  </Label>
                  <Input
                    id="idle-alert-threshold"
                    type="number"
                    value={settings.idle_alert_threshold_minutes}
                    onChange={(e) =>
                      updateSetting(
                        "idle_alert_threshold_minutes",
                        parseInt(e.target.value)
                      )
                    }
                    min="5"
                    max="120"
                  />
                  <p className="text-sm text-muted-foreground">
                    Generate alert after this many minutes of inactivity
                  </p>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label htmlFor="alert-quality">
                      Alert on Low Quality Score
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Generate alerts when call quality is below threshold
                    </p>
                  </div>
                  <Switch
                    id="alert-quality"
                    checked={settings.alert_on_low_quality}
                    onCheckedChange={(checked) =>
                      updateSetting("alert_on_low_quality", checked)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quality-threshold">
                    Quality Score Threshold (%)
                  </Label>
                  <Input
                    id="quality-threshold"
                    type="number"
                    value={settings.quality_score_threshold}
                    onChange={(e) =>
                      updateSetting(
                        "quality_score_threshold",
                        parseInt(e.target.value)
                      )
                    }
                    min="0"
                    max="100"
                  />
                  <p className="text-sm text-muted-foreground">
                    Alert when quality score falls below this percentage
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Target Settings */}
        <TabsContent value="targets" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Default Target Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium">Default Targets</p>
                    <p className="mt-1">
                      These targets will be automatically assigned to new HR staff members.
                      You can customize individual targets later.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="daily-calls">Daily Calls Target</Label>
                  <Input
                    id="daily-calls"
                    type="number"
                    value={settings.default_daily_calls_target}
                    onChange={(e) =>
                      updateSetting(
                        "default_daily_calls_target",
                        parseInt(e.target.value)
                      )
                    }
                    min="1"
                  />
                  <p className="text-sm text-muted-foreground">
                    Expected number of calls per day
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="weekly-calls">Weekly Calls Target</Label>
                  <Input
                    id="weekly-calls"
                    type="number"
                    value={settings.default_weekly_calls_target}
                    onChange={(e) =>
                      updateSetting(
                        "default_weekly_calls_target",
                        parseInt(e.target.value)
                      )
                    }
                    min="1"
                  />
                  <p className="text-sm text-muted-foreground">
                    Expected number of calls per week
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="monthly-calls">Monthly Calls Target</Label>
                  <Input
                    id="monthly-calls"
                    type="number"
                    value={settings.default_monthly_calls_target}
                    onChange={(e) =>
                      updateSetting(
                        "default_monthly_calls_target",
                        parseInt(e.target.value)
                      )
                    }
                    min="1"
                  />
                  <p className="text-sm text-muted-foreground">
                    Expected number of calls per month
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="conversion-rate">
                    Conversion Rate Target (%)
                  </Label>
                  <Input
                    id="conversion-rate"
                    type="number"
                    value={settings.default_conversion_rate_target}
                    onChange={(e) =>
                      updateSetting(
                        "default_conversion_rate_target",
                        parseInt(e.target.value)
                      )
                    }
                    min="0"
                    max="100"
                  />
                  <p className="text-sm text-muted-foreground">
                    Expected conversion rate percentage
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Settings */}
        <TabsContent value="performance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Performance Metrics Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="min-call-duration">
                    Minimum Call Duration (Seconds)
                  </Label>
                  <Input
                    id="min-call-duration"
                    type="number"
                    value={settings.min_call_duration_seconds}
                    onChange={(e) =>
                      updateSetting(
                        "min_call_duration_seconds",
                        parseInt(e.target.value)
                      )
                    }
                    min="1"
                  />
                  <p className="text-sm text-muted-foreground">
                    Calls shorter than this are flagged for review
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max-response-time">
                    Maximum Response Time (Hours)
                  </Label>
                  <Input
                    id="max-response-time"
                    type="number"
                    value={settings.max_response_time_hours}
                    onChange={(e) =>
                      updateSetting(
                        "max_response_time_hours",
                        parseInt(e.target.value)
                      )
                    }
                    min="1"
                  />
                  <p className="text-sm text-muted-foreground">
                    Expected time to first contact after lead assignment
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default HRSystemSettings;

