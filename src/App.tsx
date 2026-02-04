import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import TeamPage from "./pages/Team";
import NotFound from "./pages/NotFound";
import { AuthProvider } from "./context/AuthContext";
import { AdminProvider } from "./context/AdminContext";
import { ManagerProvider } from "./context/ManagerContext";
import Profile from "./pages/Profile";
import SubmitReport from "./pages/SubmitReport";
import SubmitReportAutomated from "./pages/SubmitReportAutomated";
import SubmitHRReport from "./pages/SubmitHRReport";
import SubmitAccountantReport from "./pages/SubmitAccountantReport";
import OCRTestComponent from "./components/OCRTestComponent";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminDrivers from "./pages/admin/AdminDrivers";
import AdminVehicles from "./pages/admin/AdminVehicles";
import AdminReports from "./pages/admin/AdminReports";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminCalendar from "./pages/admin/AdminCalendar";
import AdminFinance from "./pages/admin/AdminFinance"; // Import the AdminFinance component
import AdminVehicleAudit from "./pages/admin/AdminVehicleAudit"; // Import the AdminVehicleAudit component
import AdminVehicleAuditReports from "./pages/admin/AdminVehicleAuditReports";
import AdminShifts from "./pages/admin/AdminShifts";
import AdminVehicleAttendance from "./pages/admin/AdminVehicleAttendance";
import AdminUberAudit from "./pages/admin/AdminUberAudit";
import AdminHR from "./pages/admin/AdminHR";
import ApplyDriver from "./pages/ApplyDriver";
import HiringCyclesHistory from "./pages/admin/HiringCyclesHistory";
import HiringCalendar from "./components/HiringCalendar";
import LeaveApplication from "./pages/LeaveApplication";
import PartTimeBooking from "./pages/PartTimeBooking";
import AdminLeaveManagement from "./pages/admin/AdminLeaveManagement";
import AdminInactiveVehicles from "./pages/admin/AdminInactiveVehicles";
import RoomBedManagementPage from "./pages/admin/RoomBedManagement";
import MonthlyRentDashboardPage from "./pages/admin/MonthlyRentDashboard";
import DriverPerformance from "./pages/admin/DriverPerformance";
import VehiclePerformance from "./pages/admin/VehiclePerformance";
import AdminWhatsApp from "./pages/admin/AdminWhatsApp";
import PartTimeLeads from "./pages/parttime/PartTimeLeads";
import AdminPartTimeLeads from "./pages/admin/AdminPartTimeLeads";
import AdminCashTripBlocking from "./pages/admin/AdminCashTripBlocking";
import AdminRefundList from "./pages/admin/AdminRefundList";
import AdminRefundRequests from "./pages/admin/AdminRefundRequests";
import HRMobileView from "./components/HRMobileView";
import ManagerPortal from "./pages/manager/ManagerPortal";
import ShiftLeaveManagement from "./pages/admin/ShiftLeaveManagement";
import ManagerReports from "./pages/admin/ManagerReports";
import ManagerRejectedReports from "./pages/admin/ManagerRejectedReports";
import CommonAdjustments from "./pages/admin/CommonAdjustments";
import AdminTaskManager from "./pages/admin/AdminTaskManager";
import VehiclePerformanceOverview from "./pages/admin/VehiclePerformanceOverview";
import StaffActivityMonitor from "./pages/admin/StaffActivityMonitor";
import AdminHRReports from "./pages/admin/AdminHRReports";
import AdminAccountantReports from "./pages/admin/AdminAccountantReports";
import SubmitAccidentReport from "./pages/admin/SubmitAccidentReport";
import AdminAccidentReports from "./pages/admin/AdminAccidentReports";
import AdminResignedReports from "./pages/admin/AdminResignedReports";

// Create a new query client instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
});

const App = () => (
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AdminProvider>
          <ManagerProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner position="top-right" closeButton richColors />
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/team" element={<TeamPage />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/submit-report" element={<SubmitReport />} />
                  <Route
                    path="/submit-report-automated"
                    element={<SubmitReportAutomated />}
                  />
                  <Route path="/submit-hr-report" element={<SubmitHRReport />} />
                  <Route
                    path="/submit-accountant-report"
                    element={<SubmitAccountantReport />}
                  />
                  <Route path="/ocr-test" element={<OCRTestComponent />} />
                  {/* Admin Routes */}
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route
                    path="/admin/vehicle-performance-overview"
                    element={<VehiclePerformanceOverview />}
                  />
                  <Route path="/admin/drivers" element={<AdminDrivers />} />
                  <Route path="/admin/vehicles" element={<AdminVehicles />} />
                  <Route path="/admin/reports" element={<AdminReports />} />
                  <Route path="/admin/calendar" element={<AdminCalendar />} />
                  <Route path="/admin/settings" element={<AdminSettings />} />
                  <Route
                    path="/admin/finance"
                    element={<AdminFinance />}
                  />{" "}
                  <Route path="/admin/shift" element={<AdminShifts />} />{" "}
                  <Route
                    path="/admin/vehicles-calander"
                    element={<AdminVehicleAttendance />}
                  />{" "}
                  <Route path="/admin/hr-mobile" element={<HRMobileView />} />{" "}
                  {/* Manager Portal Route */}
                  <Route path="/manager" element={<ManagerPortal />} />
                  {/* Add the AdminFinance route */}
                  <Route
                    path="/admin/AdminVehicleAudit"
                    element={<AdminVehicleAudit />}
                  />{" "}
                  <Route
                    path="/admin/AdminVehicleAuditReports"
                    element={<AdminVehicleAuditReports />}
                  />{" "}
                  <Route
                    path="/admin/uber-audit"
                    element={<AdminUberAudit />}
                  />{" "}
                  {/* Add the AdminVehicleAudit route */}
                  <Route path="/admin/hr" element={<AdminHR />} />
                  <Route
                    path="/admin/hr/history"
                    element={<HiringCyclesHistory />}
                  />
                  <Route
                    path="/admin/hr/calendar"
                    element={<HiringCalendar />}
                  />
                  <Route
                    path="/admin/leave-management"
                    element={<AdminLeaveManagement />}
                  />
                  <Route path="/apply-driver" element={<ApplyDriver />} />
                  <Route
                    path="/leave-application"
                    element={<LeaveApplication />}
                  />
                  <Route path="/admin/chat" element={<AdminWhatsApp />} />
                  <Route
                    path="/part-time-booking"
                    element={<PartTimeBooking />}
                  />
                  <Route path="/parttime/leads" element={<PartTimeLeads />} />
                  <Route
                    path="/admin/parttime-leads"
                    element={<AdminPartTimeLeads />}
                  />
                  <Route
                    path="/admin/driver-performance"
                    element={<DriverPerformance />}
                  />
                  <Route
                    path="/admin/vehicle-performance"
                    element={<VehiclePerformance />}
                  />
                  <Route
                    path="/admin/vehicles/vehicles-inactive"
                    element={<AdminInactiveVehicles />}
                  />
                  <Route
                    path="/admin/cash-trip-blocking"
                    element={<AdminCashTripBlocking />}
                  />
                  <Route
                    path="/admin/refund-list"
                    element={<AdminRefundList />}
                  />
                  <Route
                    path="/admin/refund-requests"
                    element={<AdminRefundRequests />}
                  />
                  <Route
                    path="/admin/room-bed-management"
                    element={<RoomBedManagementPage />}
                  />
                  <Route
                    path="/admin/monthly-rent-dashboard"
                    element={<MonthlyRentDashboardPage />}
                  />
                  <Route
                    path="/admin/shift-leave-management"
                    element={<ShiftLeaveManagement />}
                  />
                  <Route
                    path="/admin/manager-reports"
                    element={<ManagerReports />}
                  />
                  <Route
                    path="/admin/rejected-reports"
                    element={<ManagerRejectedReports />}
                  />
                  <Route
                    path="/admin/service-day-adjustments"
                    element={<CommonAdjustments />}
                  />
                  <Route
                    path="/admin/hr-reports"
                    element={<AdminHRReports />}
                  />
                  <Route
                    path="/admin/accountant-reports"
                    element={<AdminAccountantReports />}
                  />
                  <Route
                    path="/admin/submit-accident-report"
                    element={<SubmitAccidentReport />}
                  />
                  <Route
                    path="/admin/accident-reports"
                    element={<AdminAccidentReports />}
                  />
                  <Route
                    path="/admin/resigned-reports"
                    element={<AdminResignedReports />}
                  />
                  <Route
                    path="/admin/common-adjustments"
                    element={<CommonAdjustments />}
                  />
                  <Route
                    path="/admin/task-manager"
                    element={<AdminTaskManager />}
                  />
                  <Route
                    path="/admin/staff-activity"
                    element={<StaffActivityMonitor />}
                  />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </ManagerProvider>
        </AdminProvider>
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>
);

export default App;
