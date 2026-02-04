import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useAdmin } from "@/context/AdminContext";
import {
  LayoutDashboard,
  Users,
  Car,
  FileText,
  Settings,
  LogOut,
  Menu,
  Calendar,
  ChevronLeft,
  Wallet,
  Gauge,
  CalendarCheck,
  UserCheck,
  Calendar1,
  CalendarClock,
  Home,
  KeySquare,
  UserPlus,
  DollarSign,
  CalendarDays,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  BarChart,
  MessageCircle,
  Ban,
  ArrowUpRight,
  Bed,
  TrendingUp,
  XCircle,
  Wrench,
  CheckSquare,
  Activity,
  Calculator,
  AlertTriangle,
  MessageSquare,
} from "lucide-react";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import { ScrollArea } from "./ui/scroll-area";
import { toast } from "sonner";
import { UserRole } from "@/context/AdminContext";

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
}

interface NavItem {
  label: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: NavItem[];
  allowedRoles?: UserRole[];
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children, title }) => {
  const { signOut } = useAuth();
  const {
    isAdmin,
    isManager,
    isHR,
    isAccountant,
    userRole,
    hasAccess,
    loading,
  } = useAdmin();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (!loading && !isAdmin && !isManager && !isHR && !isAccountant) {
      toast.error("You do not have admin privileges");
      navigate("/");
    }
  }, [isAdmin, isManager, isHR, isAccountant, loading, navigate]);

  useEffect(() => {
    // Load sidebar state from localStorage
    const savedState = localStorage.getItem("admin-sidebar-state");
    if (savedState) {
      setIsCollapsed(savedState === "collapsed");
    }
  }, []);

  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    // Save state to localStorage
    localStorage.setItem(
      "admin-sidebar-state",
      newState ? "collapsed" : "expanded"
    );
  };

  const toggleSubItems = (label: string) => {
    setExpandedItems((prev) =>
      prev.includes(label)
        ? prev.filter((item) => item !== label)
        : [...prev, label]
    );
  };

  const handleNavigation = (path: string, event: React.MouseEvent) => {
    event.preventDefault();
    navigate(path);
    setIsMobileMenuOpen(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-fleet-purple"></div>
      </div>
    );
  }

  if (!isAdmin && !isManager && !isHR && !isAccountant) {
    return null;
  }

  // Define all navigation items with role-based access
  const allNavItems: NavItem[] = [
    {
      label: "Dashboard",
      icon: <LayoutDashboard size={20} />,
      allowedRoles: ["admin", "manager", "hr", "accountant"] as UserRole[],
      subItems: [
        {
          label: "Company Overview",
          icon: <LayoutDashboard size={14} />,
          path: "/admin",
          allowedRoles: ["admin", "manager", "hr", "accountant"] as UserRole[],
        },
        {
          label: "Vehicle Performance Overview",
          icon: <BarChart size={14} />,
          path: "/admin/vehicle-performance-overview",
          allowedRoles: ["admin"] as UserRole[],
        },
      ],
    },
    {
      label: "Drivers",
      icon: <Users size={20} />,
      path: "/admin/drivers",
      allowedRoles: ["admin", "manager"] as UserRole[],
      subItems: [
        {
          label: "Driver Management",
          icon: <Users size={14} />,
          path: "/admin/drivers",
          allowedRoles: ["admin", "manager"] as UserRole[],
        },
        {
          label: "Driver Performance",
          icon: <BarChart size={14} />,
          path: "/admin/driver-performance",
          allowedRoles: ["admin"] as UserRole[],
        },
        {
          label: "Uber Acc Audit",
          icon: <UserCheck size={14} />,
          path: "/admin/uber-audit",
          allowedRoles: ["admin"] as UserRole[],
        },
        {
          label: "Cash Trip Blocking",
          icon: <Ban size={14} />,
          path: "/admin/cash-trip-blocking",
          allowedRoles: ["admin"] as UserRole[],
        },
        {
          label: "Refund List",
          icon: <ArrowUpRight size={14} />,
          path: "/admin/refund-list",
          allowedRoles: ["admin"] as UserRole[],
        },
        {
          label: "Refund Requests (R&F)",
          icon: <ArrowUpRight size={14} />,
          path: "/admin/refund-requests",
          allowedRoles: ["admin", "manager"] as UserRole[],
        },
      ],
    },
    {
      label: "Vehicles",
      icon: <Car size={20} />,
      allowedRoles: ["admin", "manager"] as UserRole[],
      subItems: [
        {
          label: "Vehicle Management",
          icon: <Car size={14} />,
          path: "/admin/vehicles",
          allowedRoles: ["admin", "manager"] as UserRole[],
        },
        {
          label: "Vehicle Performance",
          icon: <BarChart size={14} />,
          path: "/admin/vehicle-performance",
          allowedRoles: ["admin"] as UserRole[],
        },
        {
          label: "Vehicle Attendance",
          icon: <KeySquare size={14} />,
          path: "/admin/vehicles-calander",
          allowedRoles: ["admin"] as UserRole[],
        },
        {
          label: "Vehicle Audit",
          icon: <Gauge size={14} />,
          path: "/admin/AdminVehicleAuditReports",
          allowedRoles: ["admin", "manager"] as UserRole[],
        },
        {
          label: "Shift Management",
          icon: <CalendarClock size={14} />,
          path: "/admin/Shift",
          allowedRoles: ["admin", "manager"] as UserRole[],
        },
        {
          label: "Shift Leave Management",
          icon: <CalendarClock size={14} />,
          path: "/admin/shift-leave-management",
          allowedRoles: ["admin", "manager"] as UserRole[],
        },
        {
          label: "Accident Submission",
          icon: <AlertTriangle size={14} />,
          path: "/admin/submit-accident-report",
          allowedRoles: ["admin", "manager", "accountant", "driver", "hr", "hr_manager", "hr_staff"] as UserRole[],
        },
      ],
    },
    {
      label: "Finance",
      icon: <DollarSign size={20} />,
      path: "/admin/finance",
      allowedRoles: ["admin", "accountant"] as UserRole[],
    },
    {
      label: "Accommodation",
      icon: <Home size={20} />,
      allowedRoles: ["admin"] as UserRole[],
      subItems: [
        {
          label: "Room & Bed Management",
          icon: <Bed size={14} />,
          path: "/admin/room-bed-management",
          allowedRoles: ["admin"] as UserRole[],
        },
        {
          label: "Monthly Rent Dashboard",
          icon: <TrendingUp size={14} />,
          path: "/admin/monthly-rent-dashboard",
          allowedRoles: ["admin"] as UserRole[],
        },
      ],
    },
    {
      label: "Reports",
      icon: <FileText size={20} />,
      allowedRoles: ["admin", "manager", "accountant", "hr", "hr_manager", "hr_staff"] as UserRole[],
      subItems: [
        {
          label: "Fleet Reports",
          icon: <FileText size={14} />,
          path: "/admin/reports",
          allowedRoles: ["admin", "manager", "accountant"] as UserRole[],
        },
        {
          label: "Manager Reports",
          icon: <FileText size={14} />,
          path: "/admin/manager-reports",
          allowedRoles: ["admin"] as UserRole[],
        },
        {
          label: "Rejected Reports",
          icon: <XCircle size={14} />,
          path: "/admin/rejected-reports",
          allowedRoles: ["admin", "manager", "accountant"] as UserRole[],
        },
        {
          label: "Service Day Adjustments",
          icon: <Wrench size={14} />,
          path: "/admin/service-day-adjustments",
          allowedRoles: ["admin", "manager"] as UserRole[],
        },
        {
          label: "HR Reports",
          icon: <UserPlus size={14} />,
          path: "/admin/hr-reports",
          allowedRoles: ["admin", "manager", "accountant", "hr", "hr_manager", "hr_staff"] as UserRole[],
        },
        {
          label: "Accountant Reports",
          icon: <Calculator size={14} />,
          path: "/admin/accountant-reports",
          allowedRoles: ["admin", "manager", "accountant"] as UserRole[],
        },
        {
          label: "Accident Reports",
          icon: <AlertTriangle size={14} />,
          path: "/admin/accident-reports",
          allowedRoles: ["admin", "manager", "accountant"] as UserRole[],
        },
        {
          label: "Resigned Reports",
          icon: <MessageSquare size={14} />,
          path: "/admin/resigned-reports",
          allowedRoles: ["admin", "manager", "accountant"] as UserRole[],
        },
      ],
    },
    {
      label: "Rent Calendar",
      icon: <Calendar size={20} />,
      path: "/admin/calendar",
      allowedRoles: ["admin", "manager"] as UserRole[],
    },
    {
      label: "Task Manager",
      icon: <CheckSquare size={20} />,
      path: "/admin/task-manager",
      allowedRoles: ["admin", "manager"] as UserRole[],
    },
    {
      label: "HR",
      icon: <UserPlus size={20} />,
      path: "/admin/hr",
      allowedRoles: ["admin", "hr"] as UserRole[],
    },
    {
      label: "Leave Management",
      icon: <CalendarDays size={20} />,
      path: "/admin/leave-management",
      allowedRoles: ["admin", "hr"] as UserRole[],
    },
    {
      label: "Staff Activity Monitor",
      icon: <Activity size={20} />,
      path: "/admin/staff-activity",
      allowedRoles: ["admin", "manager"] as UserRole[],
    },
    {
      label: "Settings",
      icon: <Settings size={20} />,
      path: "/admin/settings",
      allowedRoles: ["admin"] as UserRole[],
    },
    {
      label: "WhatsApp",
      icon: <MessageCircle size={20} />,
      path: "/admin/chat",
      allowedRoles: ["admin"] as UserRole[],
    },
  ];

  // Filter navigation items based on user role
  const filterNavItems = (items: NavItem[]): NavItem[] => {
    return items
      .filter((item) => {
        if (!item.allowedRoles) return true;
        return hasAccess(item.allowedRoles);
      })
      .map((item) => {
        if (item.subItems) {
          const filteredSubItems = filterNavItems(item.subItems);
          // Only show parent item if it has accessible sub-items or has a direct path
          if (filteredSubItems.length > 0 || item.path) {
            return {
              ...item,
              subItems:
                filteredSubItems.length > 0 ? filteredSubItems : undefined,
            };
          }
          return null;
        }
        return item;
      })
      .filter((item): item is NavItem => item !== null);
  };

  const navItems = filterNavItems(allNavItems);

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const renderNavItem = (item: NavItem, isSubItem = false) => {
    const isExpanded = expandedItems.includes(item.label);
    const isActive = window.location.pathname === item.path;
    const hasSubItems = item.subItems && item.subItems.length > 0;

    return (
      <li key={item.label}>
        <button
          onClick={(e) => {
            if (hasSubItems) {
              e.preventDefault();
              toggleSubItems(item.label);
            } else if (item.path) {
              handleNavigation(item.path, e);
            }
          }}
          className={`flex items-center w-full px-4 py-3 text-left transition-colors ${
            isActive
              ? "bg-fleet-purple text-white"
              : "text-black hover:bg-gray-100"
          } ${isSubItem ? "pl-8" : ""}`}
          title={isCollapsed && !isHovered ? item.label : undefined}
        >
          <span className="mr-3">{item.icon}</span>
          {(!isCollapsed || isHovered) && (
            <>
              <span className="flex-1">{item.label}</span>
              {hasSubItems && (
                <ChevronDown
                  className={`h-4 w-4 transition-transform duration-200 ${
                    isExpanded ? "rotate-180" : ""
                  }`}
                />
              )}
            </>
          )}
        </button>
        {hasSubItems && (
          <div
            className={`${
              isCollapsed && !isHovered
                ? "hidden group-hover:block absolute left-full top-0 bg-white shadow-lg rounded-r-md min-w-[200px] z-50"
                : isExpanded
                ? "block"
                : "hidden"
            }`}
          >
            <ul className={`${isCollapsed ? "py-2" : "mt-1"}`}>
              {item.subItems!.map((subItem) => (
                <li
                  key={subItem.label}
                  className={`${isCollapsed ? "hover:bg-gray-100" : ""}`}
                >
                  <button
                    onClick={(e) => handleNavigation(subItem.path!, e)}
                    className={`flex items-center text-sm pl-8 w-full px-4 py-3 text-left transition-colors ${
                      window.location.pathname === subItem.path
                        ? "bg-fleet-purple  text-white"
                        : "text-black hover:bg-gray-100"
                    }`}
                  >
                    <span className="mr-3">{subItem.icon}</span>
                    <span>{subItem.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </li>
    );
  };

  const NavContent = ({
    isHovered,
    isCollapsed,
  }: {
    isHovered: boolean;
    isCollapsed: boolean;
  }) => (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b flex justify-between items-center">
        <div className={isCollapsed && !isHovered ? "hidden" : "block"}>
          <h2 className="text-xl font-bold text-fleet-purple">
            {userRole === "admin"
              ? "Admin Portal"
              : userRole === "manager"
              ? "Manager Portal"
              : userRole === "hr"
              ? "HR Portal"
              : userRole === "accountant"
              ? "Accountant Portal"
              : "Portal"}
          </h2>
          {userRole && (
            <p className="text-xs text-gray-500 capitalize">{userRole}</p>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="md:flex hidden"
        >
          <ChevronLeft
            className={`h-5 w-5 transition-transform duration-200 ${
              isCollapsed ? "rotate-180" : ""
            }`}
          />
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <nav className="py-4">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <div key={item.label} className="relative group">
                {renderNavItem(item)}
              </div>
            ))}
          </ul>
        </nav>
      </ScrollArea>
      <div className="p-4 border-t mt-auto">
        <Button
          variant="outline"
          className={`w-full flex items-center justify-center ${
            isCollapsed && !isHovered ? "p-2" : ""
          }`}
          onClick={handleLogout}
        >
          <LogOut
            size={18}
            className={isCollapsed && !isHovered ? "" : "mr-2"}
          />
          {(!isCollapsed || isHovered) && "Logout"}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Desktop Sidebar */}
      <div
        className={`hidden md:block bg-white shadow-lg flex-shrink-0 transition-all duration-300 ease-in-out ${
          isCollapsed && !isHovered ? "w-16" : "w-64"
        }`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="h-screen sticky top-0">
          <NavContent isHovered={isHovered} isCollapsed={isCollapsed} />
        </div>
      </div>

      {/* Mobile Sidebar */}
      <div className="md:hidden">
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="fixed top-4 left-4 z-40"
            >
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 bg-white w-64">
            <NavContent isHovered={false} isCollapsed={false} />
          </SheetContent>
        </Sheet>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-x-hidden">
        <header className="bg-white shadow px-6 py-4 md:ml-0 flex items-center sticky top-0 z-10">
          <h1 className="text-xl space-y-2 md:text-2xl font-bold text-gray-800 ml-12 md:ml-0">
            <Button
              onClick={() => window.history.back()}
              variant="ghost"
              className="mr-2"
            >
              <ArrowLeft className="" />
            </Button>
            {title}
          </h1>
        </header>
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
};

export default AdminLayout;
