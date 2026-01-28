import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  Clock,
  AlertTriangle,
  Sun,
  UserMinus,
  UserX,
  XCircle,
} from "lucide-react";

type RentStatus =
  | "paid"
  | "overdue"
  | "pending"
  | "pending_verification"
  | "rejected"
  | "leave"
  | "offline"
  | "not_joined";

interface RentStatusBadgeProps {
  status: RentStatus;
  className?: string;
  showText?: boolean;
  hasAdjustment?: boolean; // Flag for adjustment
}

const statusConfig = {
  paid: {
    icon: Check,
    bg: "bg-green-300 text-green-700 border-green-200",
    text: "Paid",
  },
  paid_with_adjustment: {
    icon: Check,
    bg: "bg-purple-300 text-purple-700 border-purple-200",
    text: "Paid",
  },
  overdue: {
    icon: AlertTriangle,
    bg: "bg-red-100 text-red-700 border-red-200",
    text: "Overdue",
  },
  pending: {
    icon: Clock,
    bg: "bg-yellow-100 text-yellow-700 border-yellow-200",
    text: "Pending",
  },
  pending_verification: {
    icon: Clock,
    bg: "bg-yellow-100 text-yellow-700 border-yellow-200",
    text: "Pending",
  },
  rejected: {
    icon: XCircle,
    bg: "bg-orange-100 text-orange-700 border-orange-200",
    text: "Rejected",
  },
  leave: {
    icon: Sun,
    bg: "bg-blue-100 text-blue-700 border-blue-200",
    text: "Leave",
  },
  offline: {
    icon: UserMinus,
    bg: "bg-gray-100 text-gray-700 border-gray-200",
    text: "Offline",
  },
  not_joined: {
    icon: UserX,
    bg: "bg-slate-100 text-slate-700 border-slate-200",
    text: "Not Paid",
  },
};

export const RentStatusBadge = ({
  status,
  className,
  showText = true,
  hasAdjustment = false,
}: RentStatusBadgeProps) => {
  // Use purple variant if paid/approved with adjustment
  const effectiveStatus = (status === "paid" && hasAdjustment) ? "paid_with_adjustment" : status;
  const config = statusConfig[effectiveStatus] || statusConfig.not_joined;
  const IconComponent = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        "flex items-center gap-1 font-normal",
        config.bg,
        "hover:opacity-90",
        className
      )}
    >
      <IconComponent className="h-3 w-3" />
      {showText && (
        <span className={showText ? "" : "hidden sm:inline"}>
          {config.text}
        </span>
      )}
    </Badge>
  );
};
