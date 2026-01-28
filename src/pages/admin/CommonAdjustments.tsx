import React, { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, DollarSign, TrendingUp, TrendingDown, Package } from "lucide-react";
import { AdjustmentForm } from "@/components/admin/adjustments/AdjustmentForm";
import { AdjustmentInbox } from "@/components/admin/adjustments/AdjustmentInbox";
import { useAdjustments } from "@/hooks/useAdjustments";
import { useAuth } from "@/context/AuthContext";
import { useAdmin } from "@/context/AdminContext";
import { useActivityLogger } from "@/hooks/useActivityLogger";
import { toast } from "sonner";

const CommonAdjustments: React.FC = () => {
  const { user } = useAuth();
  const { isAdmin, isManager } = useAdmin();
  const { logActivity } = useActivityLogger();
  const { deleteAdjustment, getAdjustmentStats } = useAdjustments();
  
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    applied: 0,
    rejected: 0,
    totalAmount: 0,
  });

  useEffect(() => {
    if (user && (isAdmin || isManager)) {
      loadStats();
    }
  }, [user, isAdmin, isManager]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const statsData = await getAdjustmentStats();
      if (statsData) {
        setStats(statsData);
      }
    } catch (error) {
      console.error("Error loading stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFormSuccess = async () => {
    await loadStats();
    
    // Log activity
    await logActivity({
      actionType: "other",
      actionCategory: "reports",
      description: "Created a new adjustment",
      pageName: "Common Adjustments",
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this adjustment?")) {
      return;
    }

    try {
      await deleteAdjustment(id);
      await loadStats();
      
      // Log activity
      await logActivity({
        actionType: "other",
        actionCategory: "reports",
        description: "Deleted an adjustment",
        metadata: { adjustment_id: id },
        pageName: "Common Adjustments",
      });
    } catch (error) {
      console.error("Error deleting adjustment:", error);
      toast.error("Failed to delete adjustment");
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Common Adjustments">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-fleet-purple"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Common Adjustments">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Common Adjustments</h1>
            <p className="text-sm text-gray-600 mt-1">
              Manage driver adjustments with custom amounts and categories
            </p>
          </div>
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Adjustment
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                Approved
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
              <p className="text-xs text-gray-500 mt-1">Ready to apply</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Package className="h-4 w-4 text-blue-500" />
                Applied
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.applied}</div>
              <p className="text-xs text-gray-500 mt-1">Added to reports</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-yellow-500" />
                Pending
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
              <p className="text-xs text-gray-500 mt-1">Awaiting approval</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-purple-500" />
                Total Applied
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                ₹{stats.totalAmount.toFixed(2)}
              </div>
              <p className="text-xs text-gray-500 mt-1">In other expenses</p>
            </CardContent>
          </Card>
        </div>

        {/* Inbox */}
        <Card>
          <CardHeader>
            <CardTitle>Adjustment Management</CardTitle>
          </CardHeader>
          <CardContent>
            <AdjustmentInbox onRefresh={loadStats} onDelete={handleDelete} />
          </CardContent>
        </Card>

        {/* Form Modal */}
        <AdjustmentForm
          open={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onSuccess={handleFormSuccess}
        />
      </div>
    </AdminLayout>
  );
};

export default CommonAdjustments;
