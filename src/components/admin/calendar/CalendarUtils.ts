import {
  format,
  parseISO,
  isAfter,
  addMinutes,
  isBefore,
  addDays,
  startOfDay,
  isSameDay,
} from "date-fns";

export type RentStatus =
  | "paid"
  | "overdue"
  | "pending_verification"
  | "leave"
  | "offline"
  | "not_joined"
  | "rejected";

export interface ReportData {
  userId: string;
  driverName: string;
  vehicleNumber?: string;
  shift: string;
  date: string;
  status: string;
  joiningDate?: string;
  shiftForDate?: string;
  created_at?: string;
  notes?: string;
  rent_paid_amount?: number;
  hasServiceDayAdjustment?: boolean; // Flag for any adjustment (service day, bonus, penalty, etc) - DEPRECATED, use hasAdjustment
  hasAdjustment?: boolean; // Flag for any adjustment type (replaces hasServiceDayAdjustment)
}

// Process report data and determine status
export const processReportData = (report: any): ReportData => {
  // IMPORTANT: Check the report's actual status FIRST before checking user online/offline status
  // This ensures that if a driver has submitted a real form, the status will be based on the report,
  // not the user's online/offline status. Real reports have status: pending_verification, approved, rejected, etc.
  
  // First, check if this is a real submitted report (has status other than "offline")
  const reportStatus = report.status?.toLowerCase();
  const hasRealReport = reportStatus && 
    reportStatus !== "offline" && 
    (reportStatus === "pending_verification" || 
     reportStatus === "approved" || 
     reportStatus === "rejected" || 
     reportStatus === "leave");

  // If there's a real submitted report, use its status (don't check user online/offline)
  if (hasRealReport || (report.created_at && reportStatus && reportStatus !== "offline")) {
    let status: RentStatus;

    switch (reportStatus) {
      case "approved":
        status = "paid"; // Paid
        break;
      case "leave":
        status = "leave";
        break;
      case "rejected":
        status = "rejected";
        break;
      case "pending_verification":
        status = "pending_verification";
        break;
      default:
        status = "pending_verification"; // Submitted but not verified
    }

    return {
      date: report.rent_date,
      userId: report.user_id,
      driverName: report.driver_name,
      vehicleNumber: report.vehicle_number,
      status,
      shift: report.shift,
      created_at: report.created_at,
      rent_paid_amount: report.rent_paid_amount,
      notes: report.remarks,
      joiningDate: report.users.joining_date,
      shiftForDate: report.shift,
    };
  }

  // Leave status handling (check remarks)
  if (report.remarks?.toLowerCase().includes("leave")) {
    return {
      date: report.rent_date,
      userId: report.user_id,
      driverName: report.driver_name,
      vehicleNumber: report.vehicle_number,
      status: "leave" as RentStatus,
      shift: report.shift,
      created_at: report.created_at,
      rent_paid_amount: report.rent_paid_amount,
      notes: report.remarks,
      joiningDate: report.users.joining_date,
      shiftForDate: report.shift,
    };
  }

  // Offline status handling - only show offline if the report status is actually "offline"
  if (
    reportStatus === "offline" ||
    report.remarks?.toLowerCase().includes("offline")
  ) {
    return {
      date: report.rent_date,
      userId: report.user_id,
      driverName: report.driver_name,
      vehicleNumber: report.vehicle_number,
      status: "offline" as RentStatus,
      shift: report.shift,
      created_at: report.created_at,
      rent_paid_amount: report.rent_paid_amount,
      notes: report.remarks,
      joiningDate: report.users.joining_date,
      shiftForDate: report.shift,
    };
  }

  // If user is offline and no real report exists, show as offline or leave
  if (!report.users.online) {
    const rentDate = parseISO(report.rent_date);
    const offlineFromDate = report.users.offline_from_date
      ? parseISO(report.users.offline_from_date)
      : null;

    // If user is offline and has an offline_from_date and the rent_date is after or equal to offline_from_date
    if (offlineFromDate && !isBefore(rentDate, offlineFromDate)) {
      return {
        date: report.rent_date,
        userId: report.user_id,
        driverName: report.driver_name,
        vehicleNumber: report.vehicle_number,
        status: "leave" as RentStatus,
        shift: report.shift,
        created_at: report.created_at,
        rent_paid_amount: report.rent_paid_amount,
        notes: `On leave since ${format(offlineFromDate, "PP")}`,
        joiningDate: report.users.joining_date,
        shiftForDate: report.shift,
      };
    }

    // Otherwise show as offline (only if no real report exists)
    return {
      date: report.rent_date,
      userId: report.user_id,
      driverName: report.driver_name,
      vehicleNumber: report.vehicle_number,
      status: "offline" as RentStatus,
      shift: report.shift,
      created_at: report.created_at,
      rent_paid_amount: report.rent_paid_amount,
      notes: `Offline since ${
        report.users.offline_from_date
          ? format(parseISO(report.users.offline_from_date), "PP")
          : "unknown date"
      }`,
      joiningDate: report.users.joining_date,
      shiftForDate: report.shift,
    };
  }

  // If user is online but has an online_from_date, then only show overdue for dates after that
  const rentDate = parseISO(report.rent_date);
  const onlineFromDate = report.users.online_from_date
    ? parseISO(report.users.online_from_date)
    : null;

  // For days with no submission, check if it should be marked as overdue
  const currentDate = new Date();
  const joiningDate = report.users.joining_date
    ? parseISO(report.users.joining_date)
    : null;

  // If this rent date is before online_from_date, show as leave
  if (onlineFromDate && isBefore(rentDate, onlineFromDate)) {
    // Special logic: If the user was offline and brought online after 3+ days, mark the onlineFromDate as not_joined
    if (
      report.users.offline_from_date &&
      format(rentDate, "yyyy-MM-dd") === format(onlineFromDate, "yyyy-MM-dd")
    ) {
      const offlineFromDate = parseISO(report.users.offline_from_date);
      // If offline period is 3 or more days
      const diffDays = Math.floor(
        (onlineFromDate.getTime() - offlineFromDate.getTime()) /
          (1000 * 60 * 60 * 24)
      );
      if (diffDays >= 3) {
        return {
          date: report.rent_date,
          userId: report.user_id,
          driverName: report.driver_name,
          vehicleNumber: report.vehicle_number,
          status: "not_joined" as RentStatus,
          shift: report.shift,
          created_at: report.created_at,
          rent_paid_amount: report.rent_paid_amount,
          notes: `Returned online after ${diffDays} days offline`,
          joiningDate: report.users.joining_date,
          shiftForDate: report.shift,
        };
      }
    }
    return {
      date: report.rent_date,
      userId: report.user_id,
      driverName: report.driver_name,
      vehicleNumber: report.vehicle_number,
      status: "leave" as RentStatus,
      shift: report.shift,
      created_at: report.created_at,
      rent_paid_amount: report.rent_paid_amount,
      notes: `On leave until ${format(onlineFromDate, "PP")}`,
      joiningDate: report.users.joining_date,
      shiftForDate: report.shift,
    };
  }

  // Only check for overdue if joining date is before or equal to rent date
  let status: RentStatus = "pending_verification";

  if (
    joiningDate &&
    !isBefore(rentDate, joiningDate) &&
    isBefore(rentDate, currentDate)
  ) {
    let deadlineForShift: Date;

    if (report.shift === "morning") {
      // Morning shift deadline: 5 PM same day (changed from 4 PM)
      const dateObj = new Date(rentDate);
      dateObj.setHours(17, 0, 0, 0); // Changed from 16 to 17 for 5PM
      deadlineForShift = dateObj;
    } else {
      // Night or 24hr shift deadline: 5 AM next day (changed from 4 AM)
      const nextDay = addDays(new Date(rentDate), 1);
      nextDay.setHours(5, 0, 0, 0); // Changed from 4 to 5 for 5AM
      deadlineForShift = nextDay;
    }

    if (isAfter(currentDate, deadlineForShift)) {
      status = "overdue";
    }
  }

  return {
    date: report.rent_date,
    userId: report.user_id,
    driverName: report.driver_name,
    vehicleNumber: report.vehicle_number,
    status,
    shift: report.shift,
    created_at: report.created_at,
    rent_paid_amount: report.rent_paid_amount,
    notes: report.remarks,
    joiningDate: report.users.joining_date,
    shiftForDate: report.shift,
  };
};

// Determine status for a date with no reports
export const determineOverdueStatus = (
  date: string,
  shift: string,
  joiningDate?: string,
  isOnline: boolean = true,
  offlineFromDate?: string,
  onlineFromDate?: string
): RentStatus => {
  if (!joiningDate) {
    return "not_joined";
  }

  const currentDate = new Date();
  const checkDate = parseISO(date);
  const joinDate = parseISO(joiningDate);

  if (!isOnline && offlineFromDate) {
    const offlineDate = parseISO(offlineFromDate);
    if (!isBefore(checkDate, offlineDate)) {
      return "offline";
    }
  }

  if (isOnline && onlineFromDate) {
    const onlineDate = parseISO(onlineFromDate);
    if (isBefore(checkDate, onlineDate)) {
      return "offline";
    }
  }

  if (isAfter(joinDate, checkDate)) {
    return "not_joined";
  }

  let deadlineTime: Date;

  if (shift === "morning") {
    const deadlineDate = new Date(checkDate);
    deadlineDate.setHours(17, 0, 0, 0); // 5:00 PM
    deadlineTime = deadlineDate;
  } else if (shift === "night" || shift === "24hr" || shift === "24") {
    const nextDay = addDays(new Date(checkDate), 1);
    nextDay.setHours(5, 0, 0, 0); // 5:00 AM
    deadlineTime = nextDay;
  } else if (shift === "none" || shift === null || !shift || shift === "") {
    // For drivers with no shift, return "not_joined" (no overdue tracking)
    return "not_joined";
  } else {
    // For any other shift type, treat as night shift
    console.warn(`Unknown shift type: ${shift}, treating as night shift`);
    const nextDay = addDays(new Date(checkDate), 1);
    nextDay.setHours(5, 0, 0, 0); // 5:00 AM
    deadlineTime = nextDay;
  }

  // If past deadline time and today is after checkDate
  if (
    isAfter(currentDate, deadlineTime) &&
    isBefore(startOfDay(checkDate), startOfDay(currentDate))
  ) {
    return "overdue";
  }

  // If the date is today and we're past the deadline, it's overdue
  if (isSameDay(currentDate, checkDate) && isAfter(currentDate, deadlineTime)) {
    return "overdue";
  }

  // If not overdue but joined, status should be "not_joined" (no report submitted)
  return "not_joined";
};

// Get status color for UI
export const getStatusColor = (status: string, hasAdjustment?: boolean) => {
  // Apply purple color if adjustment exists AND status is approved/paid
  if (hasAdjustment && (status === "paid" || status === "approved")) {
    return "bg-purple-400 text-white border-2 border-purple-600";
  }

  // Regular status colors (for all other cases, including pending/rejected with adjustments)
  switch (status) {
    case "paid":
    case "approved":
      return "bg-green-400 text-black";
    case "pending_verification":
      return "bg-yellow-400 text-black";
    case "overdue":
      return "bg-red-500 text-white";
    case "rejected":
      return "bg-red-500 text-white";
    case "leave":
      return "bg-blue-500 text-white";
    case "offline":
      return "bg-gray-500 text-white";
    case "not_joined":
      return "bg-white border border-gray-300";
    default:
      return "bg-gray-100";
  }
};

// Get status label
export const getStatusLabel = (status: string) => {
  switch (status) {
    case "approved":
      return "Paid";
    case "paid":
      return "Paid";
    case "pending_verification":
      return "Pending";
    case "overdue":
      return "Overdue";
    case "rejected":
      return "Rejected";
    case "leave":
      return "Leave";
    case "offline":
      return "Offline";
    case "not_joined":
      return "Not Paid";
    default:
      return status;
  }
};

// Add function to determine if a driver should be included based on joining date
export const shouldIncludeDriver = (driver: any, date: string): boolean => {
  if (!driver.joining_date) return true;

  const joiningDate = parseISO(driver.joining_date);
  const checkDate = parseISO(date);

  return !isBefore(checkDate, joiningDate);
};

// Get shift badge color
export const getShiftBadgeColor = (shift: string) => {
  switch (shift) {
    case "morning":
      return "bg-amber-100 text-amber-800";
    case "night":
      return "bg-indigo-100 text-indigo-800";
    case "24hr":
      return "bg-purple-100 text-purple-800";
    case "none":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};
