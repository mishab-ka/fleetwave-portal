import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, Gift, AlertCircle, RefreshCw, Receipt, Wrench, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { CommonAdjustment } from "@/hooks/useAdjustments";

interface AdjustmentListProps {
  adjustments: CommonAdjustment[];
  loading?: boolean;
  onDelete?: (id: string) => void;
  showActions?: boolean;
}

const CATEGORY_ICONS = {
  service_day: { icon: Wrench, color: "text-purple-600 bg-purple-50" },
  bonus: { icon: Gift, color: "text-green-600 bg-green-50" },
  penalty: { icon: AlertCircle, color: "text-red-600 bg-red-50" },
  refund: { icon: RefreshCw, color: "text-blue-600 bg-blue-50" },
  expense: { icon: Receipt, color: "text-orange-600 bg-orange-50" },
  custom: { icon: DollarSign, color: "text-gray-600 bg-gray-50" },
};

const STATUS_STYLES = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  applied: "bg-blue-100 text-blue-800",
  rejected: "bg-red-100 text-red-800",
};

export const AdjustmentList: React.FC<AdjustmentListProps> = ({
  adjustments,
  loading = false,
  onDelete,
  showActions = true,
}) => {
  const getCategoryIcon = (category: string) => {
    const config = CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS] || CATEGORY_ICONS.custom;
    const Icon = config.icon;
    return <Icon className={cn("h-4 w-4", config.color)} />;
  };

  const getCategoryBadge = (category: string) => {
    const config = CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS] || CATEGORY_ICONS.custom;
    return (
      <Badge variant="outline" className={cn("gap-1", config.color)}>
        {getCategoryIcon(category)}
        {category.replace("_", " ")}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    return (
      <Badge className={STATUS_STYLES[status as keyof typeof STATUS_STYLES] || "bg-gray-100 text-gray-800"}>
        {status}
      </Badge>
    );
  };

  const getAmountDisplay = (amount: number) => {
    const isNegative = amount < 0;
    return (
      <span className={cn("font-semibold", isNegative ? "text-green-600" : "text-red-600")}>
        {isNegative ? "-" : "+"}₹{Math.abs(amount).toFixed(2)}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-fleet-purple"></div>
      </div>
    );
  }

  if (adjustments.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <DollarSign className="h-12 w-12 mx-auto mb-3 text-gray-400" />
        <p className="font-medium">No adjustments found</p>
        <p className="text-sm mt-1">Create a new adjustment to get started</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Driver</TableHead>
            <TableHead>Vehicle</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created By</TableHead>
            <TableHead>Created At</TableHead>
            {showActions && <TableHead>Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {adjustments.map((adjustment) => (
            <TableRow key={adjustment.id}>
              <TableCell className="font-medium">
                {format(new Date(adjustment.adjustment_date), "dd MMM yyyy")}
              </TableCell>
              <TableCell>{adjustment.driver_name}</TableCell>
              <TableCell>{adjustment.vehicle_number || "N/A"}</TableCell>
              <TableCell>{getCategoryBadge(adjustment.category)}</TableCell>
              <TableCell>{getAmountDisplay(adjustment.amount)}</TableCell>
              <TableCell className="max-w-[200px]">
                <div className="truncate" title={adjustment.description}>
                  {adjustment.description}
                </div>
              </TableCell>
              <TableCell>{getStatusBadge(adjustment.status)}</TableCell>
              <TableCell>{adjustment.creator_name || "Unknown"}</TableCell>
              <TableCell className="text-sm text-gray-500">
                {format(new Date(adjustment.created_at), "dd MMM yyyy, HH:mm")}
              </TableCell>
              {showActions && (
                <TableCell>
                  {onDelete && adjustment.status !== "applied" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(adjustment.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
