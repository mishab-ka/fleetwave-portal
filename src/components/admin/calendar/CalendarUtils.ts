import { format, parseISO, isAfter, addMinutes, isBefore, addDays, startOfDay } from 'date-fns';

export type RentStatus = 'approved' | 'overdue' | 'pending_verification' | 'leave' | 'offline' | 'not_joined';

export interface ReportData {
  date: string;
  userId: string;
  driverName: string;
  vehicleNumber?: string;
  status: RentStatus;
  shift: string;
  shiftForDate?: string | null;
  earnings?: number;
  notes?: string;
  joiningDate?: string;
  created_at?: string;
}

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
      created_at: report.created_at,
      earnings: report.total_earnings,
      notes: `Offline since ${report.users.offline_from_date ? format(parseISO(report.users.offline_from_date), 'PP') : 'unknown date'}`,
      joiningDate: report.users.joining_date,
      shiftForDate: report.shift,
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
      created_at: report.created_at,
      earnings: report.total_earnings,
      notes: report.remarks,
      joiningDate: report.users.joining_date,
      shiftForDate: report.shift,
    };
  }

  // Determine status based on report status
  let status: RentStatus;
  
  switch (report.status?.toLowerCase()) {
    case 'approved':
      status = 'approved';
      break;
    case 'pending_verification':
      status = 'pending_verification';
      break;
    case 'overdue':
      status = 'overdue';
      break;
    case 'leave':
      status = 'leave';
      break;
    default:
      status = 'pending_verification';
  }

  // Enhanced overdue checking based on shift and submission time
  if (status === 'pending_verification' && report.created_at && report.rent_date && report.shift) {
    const submissionTime = parseISO(report.created_at);
    const rentDate = parseISO(report.rent_date);
    
    let deadlineTime: Date;
    
    if (report.shift === 'morning') {
      // Morning shift (4AM to 4PM): must submit by 4 PM same day
      const dateObj = new Date(rentDate);
      dateObj.setHours(16, 0, 0, 0);
      deadlineTime = dateObj; // 4 PM
    } else if (report.shift === 'night') {
      // Night shift (4PM to 4AM): must submit by 4 AM next day
      const nextDay = addDays(new Date(rentDate), 1);
      nextDay.setHours(4, 0, 0, 0);
      deadlineTime = nextDay; // 4 AM next day
    } else {
      // 24hr shift: must submit by 4 AM next day
      const nextDay = addDays(new Date(rentDate), 1);
      nextDay.setHours(4, 0, 0, 0);
      deadlineTime = nextDay; // 4 AM next day
    }
    
    // Add 30 minutes grace period
    deadlineTime = addMinutes(deadlineTime, 30);
    
    if (isAfter(submissionTime, deadlineTime)) {
      status = 'overdue';
    }
  }
  
  // Check if rent is not submitted at all past the deadline (current date)
  const currentDate = new Date();
  const rentDate = parseISO(report.rent_date);
  const joiningDate = report.users.joining_date ? parseISO(report.users.joining_date) : null;
  
  // Only check for overdue if joining date is before or equal to rent date
  if (joiningDate && !isBefore(rentDate, joiningDate) && isBefore(rentDate, currentDate) && status !== 'approved' && status !== 'leave') {
    let deadlineForShift: Date;
    
    if (report.shift === 'morning') {
      // Morning shift deadline: 4 PM same day + 30 min grace
      const dateObj = new Date(rentDate);
      dateObj.setHours(16, 0, 0, 0);
      deadlineForShift = addMinutes(dateObj, 30);
    } else {
      // Night or 24hr shift deadline: 4 AM next day + 30 min grace
      const nextDay = addDays(new Date(rentDate), 1);
      nextDay.setHours(4, 0, 0, 0);
      deadlineForShift = addMinutes(nextDay, 30);
    }
      
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
    created_at: report.created_at,
    earnings: report.total_earnings,
    notes: report.remarks,
    joiningDate: report.users.joining_date,
    shiftForDate: report.shift,
  };
};

// Determine status for a date with no reports
export const determineOverdueStatus = (date: string, shift: string, joiningDate?: string): RentStatus => {
  // If no joining date or joining date is after the current date, return not_joined
  if (!joiningDate) {
    return 'not_joined';
  }
  
  const currentDate = new Date();
  const checkDate = parseISO(date);
  const joinDate = parseISO(joiningDate);
  
  // If joining date is after the check date, return not_joined
  if (isAfter(joinDate, checkDate)) {
    return 'not_joined';
  }
  
  // Calculate deadline based on shift
  let deadlineTime: Date;
  if (shift === 'morning') {
    // Morning shift: deadline is 4 PM (16:00) same day + 30 min grace
    const deadlineDate = new Date(checkDate);
    deadlineDate.setHours(16, 0, 0, 0);
    deadlineTime = addMinutes(deadlineDate, 30);
  } else if (shift === 'night') {
    // Night shift: deadline is 4 AM (04:00) next day + 30 min grace
    const nextDay = addDays(new Date(checkDate), 1);
    nextDay.setHours(4, 0, 0, 0);
    deadlineTime = addMinutes(nextDay, 30);
  } else {
    // 24hr shift: deadline is 4 AM (04:00) next day + 30 min grace
    const nextDay = addDays(new Date(checkDate), 1);
    nextDay.setHours(4, 0, 0, 0);
    deadlineTime = addMinutes(nextDay, 30);
  }
  
  // If current date is past the deadline and no report, it's overdue
  if (isAfter(currentDate, deadlineTime) && isBefore(startOfDay(checkDate), startOfDay(currentDate))) {
    return 'overdue';
  }
  
  // Otherwise it's just not submitted yet
  return 'pending_verification';
};

// Get status color for UI
export const getStatusColor = (status: string) => {
  switch (status) {
    case 'approved': return 'bg-green-100';
    case 'pending_verification': return 'bg-yellow-100';
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
    case 'approved': return 'Approved';
    case 'pending_verification': return 'Pending';
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
