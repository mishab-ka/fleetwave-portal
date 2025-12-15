import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3,
  Target,
  AlertCircle,
  Activity,
  Users,
  Trophy,
  Clock,
} from "lucide-react";
import HRLiveActivityDashboard from "./HRLiveActivityDashboard";
import HRAlertCenter from "./HRAlertCenter";
import HRTargetManagement from "./HRTargetManagement";
import HRPerformanceAnalytics from "./HRPerformanceAnalytics";

/**
 * Enhanced HR Performance Analytics Component for Managers
 * Provides comprehensive team monitoring with tabs for:
 * - Performance metrics and rankings
 * - Live activity monitoring
 * - Target management
 * - Alert center
 * - Attendance tracking
 */
const HRPerformanceAnalyticsEnhanced: React.FC = () => {
  const [activeTab, setActiveTab] = useState("performance");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-fleet-purple">
            Team Performance Analytics
          </h2>
          <p className="text-gray-600">
            Monitor and manage your HR team's performance
          </p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5">
          <TabsTrigger value="performance" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">Performance</span>
          </TabsTrigger>
          <TabsTrigger value="live" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            <span className="hidden sm:inline">Live Activity</span>
          </TabsTrigger>
          <TabsTrigger value="targets" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            <span className="hidden sm:inline">Targets</span>
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Alerts</span>
          </TabsTrigger>
          <TabsTrigger value="rankings" className="flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            <span className="hidden sm:inline">Rankings</span>
          </TabsTrigger>
        </TabsList>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          <HRPerformanceAnalytics />
        </TabsContent>

        {/* Live Activity Tab */}
        <TabsContent value="live" className="space-y-6">
          <HRLiveActivityDashboard />
        </TabsContent>

        {/* Targets Tab */}
        <TabsContent value="targets" className="space-y-6">
          <HRTargetManagement />
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-6">
          <HRAlertCenter />
        </TabsContent>

        {/* Rankings Tab */}
        <TabsContent value="rankings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                Team Rankings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Team rankings and leaderboards coming soon!</p>
                <p className="text-sm mt-2">
                  This will show top performers based on calls, conversions, and quality scores.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default HRPerformanceAnalyticsEnhanced;

