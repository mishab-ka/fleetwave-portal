import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import {
  Car,
  Users,
  FileText,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Building2,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Leaderboard } from "@/components/Leaderboard";
import AdminVehicleAudit from "./AdminVehicleAudit";
import { Link } from "react-router-dom";
import TodoComponent from "@/components/admin/todo/TodoComponent";
const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalDrivers: 0,
    totalVehicles: 0,
    totalReports: 0,
    totalEarnings: 0,
  });

  const [loading, setLoading] = useState(true);
  const [reportsData, setReportsData] = useState<any[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { count: driversCount } = await supabase
          .from("users")
          .select("*", { count: "exact", head: true });

        const { count: vehiclesCount } = await supabase
          .from("vehicles")
          .select("*", { count: "exact", head: true });

        const { count: reportsCount } = await supabase
          .from("fleet_reports")
          .select("*", { count: "exact", head: true });

        const { data: earningsData } = await supabase
          .from("fleet_reports")
          .select("total_earnings, rent_paid_amount, toll, submission_date")
          .order("submission_date", { ascending: false })
          .limit(30);

        const totalEarnings =
          earningsData?.reduce(
            (sum, report) => sum + (report.total_earnings || 0),
            0
          ) || 0;

        setStats({
          totalDrivers: driversCount || 0,
          totalVehicles: vehiclesCount || 0,
          totalReports: reportsCount || 0,
          totalEarnings: totalEarnings,
        });

        if (earningsData) {
          const chartData = earningsData.reverse().map((report) => ({
            date: new Date(report.submission_date).toLocaleDateString(),
            earnings: report.total_earnings || 0,
            expenses: (report.rent_paid_amount || 0) + (report.toll || 0),
            profit:
              (report.total_earnings || 0) -
              ((report.rent_paid_amount || 0) + (report.toll || 0)),
          }));

          setReportsData(chartData);
        }
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <AdminLayout title="Dashboard">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-fleet-purple"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Dashboard">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="bg-gradient-to-br from-violet-100 to-violet-50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-violet-800">
              Total Revenue
            </CardTitle>
            <DollarSign className="h-5 w-5 text-violet-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-violet-900">
              ₹{stats.totalEarnings.toLocaleString()}
            </div>
            <div className="flex items-center text-xs text-violet-600 mt-2">
              <ArrowUpRight className="h-4 w-4 mr-1" />
              <span>12.5% from last month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-100 to-emerald-50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-emerald-800">
              Active Drivers
            </CardTitle>
            <Users className="h-5 w-5 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-900">
              {stats.totalDrivers}
            </div>
            <div className="flex items-center text-xs text-emerald-600 mt-2">
              <TrendingUp className="h-4 w-4 mr-1" />
              <span>5 new this week</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-sky-100 to-sky-50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-sky-800">
              Fleet Size
            </CardTitle>
            <Car className="h-5 w-5 text-sky-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-sky-900">
              {stats.totalVehicles}
            </div>
            <div className="flex items-center text-xs text-sky-600 mt-2">
              <ArrowUpRight className="h-4 w-4 mr-1" />
              <span>2 added this month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-100 to-amber-50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-amber-800">
              Reports
            </CardTitle>
            <FileText className="h-5 w-5 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-900">
              {stats.totalReports}
            </div>
            <div className="flex items-center text-xs text-amber-600 mt-2">
              <ArrowUpRight className="h-4 w-4 mr-1" />
              <span>98% submission rate</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="bg-gradient-to-br from-indigo-100 to-indigo-50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-indigo-800">
              Monthly Expenses
            </CardTitle>
            <CreditCard className="h-5 w-5 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-900">₹85,420</div>
            <div className="flex items-center text-xs text-indigo-600 mt-2">
              <TrendingDown className="h-4 w-4 mr-1" />
              <span>3.2% less than last month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-rose-100 to-rose-50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-rose-800">
              Net Profit
            </CardTitle>
            <Wallet className="h-5 w-5 text-rose-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-900">₹142,850</div>
            <div className="flex items-center text-xs text-rose-600 mt-2">
              <ArrowUpRight className="h-4 w-4 mr-1" />
              <span>8.7% increase</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-teal-100 to-teal-50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-teal-800">
              Assets Value
            </CardTitle>
            <Building2 className="h-5 w-5 text-teal-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-teal-900">₹2,450,000</div>
            <div className="flex items-center text-xs text-teal-600 mt-2">
              <TrendingUp className="h-4 w-4 mr-1" />
              <span>Total fleet value</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mb-8">
        <TodoComponent />
      </div>

      <div className="mb-8">
        <Leaderboard />
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
