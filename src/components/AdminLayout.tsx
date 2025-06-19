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
  KeySquare,
  UserPlus,
  DollarSign,
  CalendarDays,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  BarChart,
} from "lucide-react";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import { ScrollArea } from "./ui/scroll-area";
import { toast } from "sonner";

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
}

interface NavItem {
  label: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: NavItem[];
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children, title }) => {
  const { signOut } = useAuth();
  const { isAdmin, loading } = useAdmin();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  useEffect(() => {
    if (!loading && !isAdmin) {
      toast.error("You do not have admin privileges");
      navigate("/");
    }
  }, [isAdmin, loading, navigate]);

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

  if (!isAdmin) {
    return null;
  }

  const navItems: NavItem[] = [
    { label: "Dashboard", icon: <LayoutDashboard size={20} />, path: "/admin" },
    {
      label: "Drivers",
      icon: <Users size={20} />,
      path: "/admin/drivers",
      subItems: [
        {
          label: "Driver Management",
          icon: <Users size={14} />,
          path: "/admin/drivers",
        },
        {
          label: "Driver Performance",
          icon: <BarChart size={14} />,
          path: "/admin/driver-performance",
        },
        {
          label: "Uber Acc Audit",
          icon: <UserCheck size={14} />,
          path: "/admin/uber-audit",
        },
      ],
    },
    {
      label: "Vehicles",
      icon: <Car size={20} />,
      subItems: [
        {
          label: "Vehicle Management",
          icon: <Car size={14} />,
          path: "/admin/vehicles",
        },
        {
          label: "Vehicle Performance",
          icon: <BarChart size={14} />,
          path: "/admin/vehicle-performance",
        },
        {
          label: "Vehicle Attendance",
          icon: <KeySquare size={14} />,
          path: "/admin/vehicles-calander",
        },
        {
          label: "Vehicle Audit",
          icon: <Gauge size={14} />,
          path: "/admin/AdminVehicleAuditReports",
        },
        {
          label: "Shift Management",
          icon: <CalendarClock size={14} />,
          path: "/admin/Shift",
        },
      ],
    },
    {
      label: "Finance",
      icon: <DollarSign size={20} />,
      path: "/admin/finance",
    },

    { label: "Reports", icon: <FileText size={20} />, path: "/admin/reports" },
    {
      label: "Rent Calendar",
      icon: <Calendar size={20} />,
      path: "/admin/calendar",
    },
    {
      label: "HR",
      icon: <UserPlus size={20} />,
      path: "/admin/hr",
    },
    {
      label: "Leave Management",
      icon: <CalendarDays size={20} />,
      path: "/admin/leave-management",
    },
    {
      label: "Settings",
      icon: <Settings size={20} />,
      path: "/admin/settings",
    },
  ];

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
          title={isCollapsed ? item.label : undefined}
        >
          <span className="mr-3">{item.icon}</span>
          {!isCollapsed && (
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
              isCollapsed
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

  const NavContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b flex justify-between items-center">
        <h2
          className={`text-xl font-bold text-fleet-purple ${
            isCollapsed ? "hidden" : "block"
          }`}
        >
          Admin Portal
        </h2>
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
            isCollapsed ? "p-2" : ""
          }`}
          onClick={handleLogout}
        >
          <LogOut size={18} className={isCollapsed ? "" : "mr-2"} />
          {!isCollapsed && "Logout"}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Desktop Sidebar */}
      <div
        className={`hidden md:block bg-white shadow-lg flex-shrink-0 transition-all duration-300 ease-in-out ${
          isCollapsed ? "w-16" : "w-64"
        }`}
      >
        <div className="h-screen sticky top-0">
          <NavContent />
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
            <NavContent />
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
