import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { AuthProvider } from "./context/AuthContext";
import { AdminProvider } from "./context/AdminContext";
import Profile from "./pages/Profile";
import SubmitReport from "./pages/SubmitReport";
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
import VehicleAttendance from "./pages/admin/VehicleAttendance";
import AdminVehicleAttendance from "./pages/admin/AdminVehicleAttendance";
import AdminUberAudit from "./pages/admin/AdminUberAudit";
import AdminHR from "./pages/admin/AdminHR";
import ApplyDriver from "./pages/ApplyDriver";
import HiringCyclesHistory from "./pages/admin/HiringCyclesHistory";
import HiringCalendar from "./components/HiringCalendar";
import LeaveApplication from "./pages/LeaveApplication";
import PartTimeBooking from "./pages/PartTimeBooking";
import AdminLeaveManagement from "./pages/admin/AdminLeaveManagement";

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
          <TooltipProvider>
            <Toaster />
            <Sonner position="top-right" closeButton richColors />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/submit-report" element={<SubmitReport />} />
                {/* Admin Routes */}
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/drivers" element={<AdminDrivers />} />
                <Route path="/admin/vehicles" element={<AdminVehicles />} />
                <Route path="/admin/reports" element={<AdminReports />} />
                <Route path="/admin/calendar" element={<AdminCalendar />} />
                <Route path="/admin/settings" element={<AdminSettings />} />
                <Route path="/admin/finance" element={<AdminFinance />} />{" "}
                <Route path="/admin/shift" element={<AdminShifts />} />{" "}
                <Route
                  path="/admin/vehicles-calander"
                  element={<AdminVehicleAttendance />}
                />{" "}
                {/* Add the AdminFinance route */}
                <Route
                  path="/admin/AdminVehicleAudit"
                  element={<AdminVehicleAudit />}
                />{" "}
                <Route
                  path="/admin/AdminVehicleAuditReports"
                  element={<AdminVehicleAuditReports />}
                />{" "}
                <Route path="/admin/uber-audit" element={<AdminUberAudit />} />{" "}
                {/* Add the AdminVehicleAudit route */}
                <Route path="/admin/hr" element={<AdminHR />} />
                <Route
                  path="/admin/hr/history"
                  element={<HiringCyclesHistory />}
                />
                <Route path="/admin/hr/calendar" element={<HiringCalendar />} />
                <Route
                  path="/admin/leave-management"
                  element={<AdminLeaveManagement />}
                />
                <Route path="/apply-driver" element={<ApplyDriver />} />
                <Route
                  path="/leave-application"
                  element={<LeaveApplication />}
                />
                <Route
                  path="/part-time-booking"
                  element={<PartTimeBooking />}
                />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </AdminProvider>
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>
);

export default App;
