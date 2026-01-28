import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle, Package, Bell } from "lucide-react";
import { AdjustmentList } from "./AdjustmentList";
import { useAdjustments } from "@/hooks/useAdjustments";

interface AdjustmentInboxProps {
  onRefresh?: () => void;
  onDelete?: (id: string) => void;
}

export const AdjustmentInbox: React.FC<AdjustmentInboxProps> = ({
  onRefresh,
  onDelete,
}) => {
  const { adjustments, fetchAdjustments, loading } = useAdjustments();
  const [activeTab, setActiveTab] = useState("approved");
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    applied: 0,
    rejected: 0,
  });

  useEffect(() => {
    loadAdjustments();
  }, [activeTab]);

  useEffect(() => {
    calculateStats();
  }, [adjustments]);

  const loadAdjustments = async () => {
    const filters: any = {};
    
    if (activeTab === "pending") {
      filters.status = ["pending"];
    } else if (activeTab === "approved") {
      filters.status = ["approved"];
    } else if (activeTab === "applied") {
      filters.status = ["applied"];
    } else if (activeTab === "rejected") {
      filters.status = ["rejected"];
    }

    await fetchAdjustments(filters);
  };

  const calculateStats = () => {
    const newStats = {
      pending: 0,
      approved: 0,
      applied: 0,
      rejected: 0,
    };

    adjustments.forEach((adj) => {
      if (adj.status === "pending") newStats.pending++;
      if (adj.status === "approved") newStats.approved++;
      if (adj.status === "applied") newStats.applied++;
      if (adj.status === "rejected") newStats.rejected++;
    });

    setStats(newStats);
  };

  const handleDelete = async (id: string) => {
    if (onDelete) {
      await onDelete(id);
      loadAdjustments();
      if (onRefresh) onRefresh();
    }
  };

  const getFilteredAdjustments = () => {
    if (activeTab === "all") {
      return adjustments;
    }
    return adjustments.filter((adj) => adj.status === activeTab);
  };

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pending" className="relative">
            <Clock className="h-4 w-4 mr-2" />
            Pending
            {stats.pending > 0 && (
              <Badge className="ml-2 bg-yellow-500 text-white" variant="secondary">
                {stats.pending}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved" className="relative">
            <CheckCircle className="h-4 w-4 mr-2" />
            Approved
            {stats.approved > 0 && (
              <Badge className="ml-2 bg-green-500 text-white" variant="secondary">
                {stats.approved}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="applied" className="relative">
            <Package className="h-4 w-4 mr-2" />
            Applied
            {stats.applied > 0 && (
              <Badge className="ml-2 bg-blue-500 text-white" variant="secondary">
                {stats.applied}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="all" className="relative">
            <Bell className="h-4 w-4 mr-2" />
            All
            <Badge className="ml-2" variant="secondary">
              {adjustments.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-yellow-800">
              <strong>Pending adjustments</strong> are waiting for approval. They will not be reflected in driver reports until approved.
            </p>
          </div>
          <AdjustmentList
            adjustments={getFilteredAdjustments()}
            loading={loading}
            onDelete={handleDelete}
          />
        </TabsContent>

        <TabsContent value="approved" className="mt-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-green-800">
              <strong>Approved adjustments</strong> are ready to be applied to driver reports. When a driver submits a report on the adjustment date, the amount will be automatically applied.
            </p>
          </div>
          <AdjustmentList
            adjustments={getFilteredAdjustments()}
            loading={loading}
            onDelete={handleDelete}
          />
        </TabsContent>

        <TabsContent value="applied" className="mt-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-blue-800">
              <strong>Applied adjustments</strong> have been added to driver reports and reflected in their "Other Expense" field. These cannot be deleted.
            </p>
          </div>
          <AdjustmentList
            adjustments={getFilteredAdjustments()}
            loading={loading}
            showActions={false}
          />
        </TabsContent>

        <TabsContent value="all" className="mt-4">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                <p className="text-xs text-gray-600">Pending</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
                <p className="text-xs text-gray-600">Approved</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{stats.applied}</p>
                <p className="text-xs text-gray-600">Applied</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
                <p className="text-xs text-gray-600">Rejected</p>
              </div>
            </div>
          </div>
          <AdjustmentList
            adjustments={adjustments}
            loading={loading}
            onDelete={handleDelete}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};
