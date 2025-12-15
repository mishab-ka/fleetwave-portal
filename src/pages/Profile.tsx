import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import UserProfile from "@/components/UserProfile";
import DocumentsSection from "@/components/DocumentsSection";
import PaymentHistory from "@/components/PaymentHistory";
import DriverRoomBedInfo from "@/components/DriverRoomBedInfo";
import { Leaderboard } from "@/components/Leaderboard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { FilePlus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Wand2 } from "lucide-react";

const Profile = () => {
  const { user, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  // Redirect if not authenticated
  React.useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, loading, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-fleet-purple"></div>
      </div>
    );
  }

  const handleSubmitReport = () => {
    navigate("/submit-report");
  };

  const handleSubmitReportAutomated = () => {
    navigate("/submit-report-automated");
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex justify-between items-center mb-6">
          {/* <h1 className="text-3xl font-bold text-fleet-purple">Your Profile</h1> */}
          <div className="">
            <Button variant="default" className="bg-red-500">
              <Link to="/leave-application">Apply Leave or Resigning</Link>
            </Button>
          </div>
          <Button
            variant="default"
            className="bg-green-500"
            onClick={handleSubmitReport}
          >
            <FilePlus className="mr-2 h-4 w-4" />
            Submit Daily Report
          </Button>
        </div>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="mb-6 grid w-full grid-cols-3">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            {/* <TabsTrigger value="accommodation">Accommodation</TabsTrigger> */}
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="history">Payment History</TabsTrigger>
            {/* <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger> */}
          </TabsList>

          <TabsContent value="profile">
            <UserProfile />
          </TabsContent>

          {/* <TabsContent value="accommodation">
            <DriverRoomBedInfo userId={user?.id || ""} showActions={true} />
          </TabsContent> */}

          <TabsContent value="documents">
            <DocumentsSection />
          </TabsContent>

          <TabsContent value="history">
            <PaymentHistory />
          </TabsContent>

          {/* <TabsContent value="leaderboard">
            <Leaderboard />
          </TabsContent> */}
        </Tabs>
      </main>
      <Footer />
    </div>
  );
};

export default Profile;
