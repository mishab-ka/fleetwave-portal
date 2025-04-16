
import { format, parseISO, isAfter, addMinutes, isBefore, addDays } from 'date-fns';

export type RentStatus = 'paid' | 'overdue' | 'pending' | 'leave' | 'offline' | 'not_joined';

export type ReportData = {
  date: string;
  userId: string;
  driverName: string;
  vehicleNumber: string;
  status: RentStatus;
  shift: string;
  submissionTime?: string;
  earnings?: number;
  notes?: string;
  joiningDate?: string; // Added joining date for better filtering
};

// Process report data and determine status
export const processReportData = (report: any): ReportData => {
  // Offline user handling
  if (!report.users.online) {
    return {
      date: report.rent_date,
      userId: report.user_id,
      driverName: report.driver_name,
      vehicleNumber: report.vehicle_number,
      status: 'offline' as RentStatus,
      shift: report.shift,
      submissionTime: report.created_at,
      earnings: report.total_earnings,
      notes: `Offline since ${report.users.offline_from_date ? format(parseISO(report.users.offline_from_date), 'PP') : 'unknown date'}`,
      joiningDate: report.users.joining_date,
    };
  }

  // Leave status handling
  if (report.remarks?.toLowerCase().includes('leave')) {
    return {
      date: report.rent_date,
      userId: report.user_id,
      driverName: report.driver_name,
      vehicleNumber: report.vehicle_number,
      status: 'leave' as RentStatus,
      shift: report.shift,
      submissionTime: report.created_at,
      earnings: report.total_earnings,
      notes: report.remarks,
      joiningDate: report.users.joining_date,
    };
  }

  // Determine status based on report status, submission time, and shift
  let status: RentStatus;
  
  switch (report.status?.toLowerCase()) {
    case 'approved':
      status = 'paid';
      break;
    case 'pending_verification':
      status = 'pending';
      break;
    case 'overdue':
      status = 'Overdue';
      break;
    case 'leave':
      status = 'leave';
      break;
    default:
      status = 'pending';
  }

  // Enhanced overdue checking based on shift and submission time
  if (status === 'pending' && report.created_at && report.rent_date && report.shift) {
    const submissionTime = parseISO(report.created_at);
    const rentDate = parseISO(report.rent_date);
    
    let deadlineTime: Date;
    
    if (report.shift === 'morning') {
      // Morning shift: must submit by 4 PM same day + 30 min grace
      deadlineTime = addMinutes(new Date(rentDate.setHours(16, 0, 0, 0)), 30);
    } else if (report.shift === 'night') {
      // Night shift: must submit by 4 AM next day + 30 min grace
      deadlineTime = addMinutes(new Date(addDays(rentDate, 1).setHours(4, 0, 0, 0)), 30);
    } else {
      // 24hr shift: must submit by 4 AM next day + 30 min grace
      deadlineTime = addMinutes(new Date(addDays(rentDate, 1).setHours(4, 0, 0, 0)), 30);
    }
    
    if (isAfter(submissionTime, deadlineTime)) {
      status = 'overdue';
    }
  }
  
  // Check if rent is not submitted at all past the deadline (current date)
  const currentDate = new Date();
  const rentDate = parseISO(report.rent_date);
  const joiningDate = report.users.joining_date ? parseISO(report.users.joining_date) : null;
  
  // Only check for overdue if joining date is before or equal to rent date
  if (joiningDate && !isBefore(rentDate, joiningDate) && isBefore(rentDate, currentDate) && status !== 'paid' && status !== 'leave') {
    const deadlineForShift = report.shift === 'morning' 
      ? addMinutes(new Date(rentDate.setHours(16, 0, 0, 0)), 30)
      : addMinutes(new Date(addDays(rentDate, 1).setHours(4, 0, 0, 0)), 30);
      
    if (isAfter(currentDate, deadlineForShift)) {
      status = 'overdue';
    }
  }

  return {
    date: report.rent_date,
    userId: report.user_id,
    driverName: report.driver_name,
    vehicleNumber: report.vehicle_number,
    status,
    shift: report.shift,
    submissionTime: report.created_at,
    earnings: report.total_earnings,
    notes: report.remarks,
    joiningDate: report.users.joining_date,
  };
};

// Get status color for UI
export const getStatusColor = (status: string) => {
  switch (status) {
    case 'paid': return 'bg-green-100';
    case 'pending': return 'bg-yellow-100';
    case 'overdue': return 'bg-red-100';
    case 'leave': return 'bg-blue-100';
    case 'offline': return 'bg-gray-100';
    case 'not_joined': return 'bg-white';
    default: return '';
  }
};

// Get status label
export const getStatusLabel = (status: string) => {
  switch (status) {
    case 'paid': return 'Paid';
    case 'pending': return 'Pending';
    case 'overdue': return 'Overdue';
    case 'leave': return 'Leave';
    case 'offline': return 'Offline';
    case 'not_joined': return 'Not Paid';
    default: return status;
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
    case 'morning': return 'bg-amber-100 text-amber-800';
    case 'night': return 'bg-indigo-100 text-indigo-800';
    case '24hr': return 'bg-purple-100 text-purple-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};
