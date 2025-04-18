import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tables } from "@/integrations/supabase/types";
import { Badge } from "@/components/ui/badge";
import { IndianRupee, Calendar, Car, TrendingUp, Shield, Wallet } from "lucide-react";
const UserProfile = () => {
  const {
    user
  } = useAuth();
  const [profileData, setProfileData] = useState<Tables<"users"> | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        if (!user) return;
        const {
          data,
          error
        } = await supabase.from("users").select("*").eq("id", user.id).maybeSingle();
        if (error) throw error;
        setProfileData(data);
      } catch (error) {
        console.error("Error fetching user profile:", error);
        toast.error("Failed to load profile data");
      } finally {
        setLoading(false);
      }
    };
    fetchUserProfile();
  }, [user]);
  if (loading) {
    return <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-fleet-purple"></div>
      </div>;
  }
  if (!profileData) {
    return <div className="text-center py-8">
        <p className="text-lg text-gray-600">Profile data not found. Please complete your profile.</p>
      </div>;
  }
  const getInitials = (name: string) => {
    return name.split(" ").map(part => part[0]).join("").toUpperCase();
  };
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };
  return <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              {profileData.profile_photo ? <AvatarImage src={profileData.profile_photo} alt={profileData.name} /> : <AvatarFallback className="bg-fleet-purple text-white text-xl">
                  {getInitials(profileData.name || "")}
                </AvatarFallback>}
            </Avatar>
            <div>
              <h2 className="text-2xl font-bold">{profileData.name}</h2>
              <p className="text-gray-500">{profileData.email_id}</p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-500 mb-1">
                <Calendar className="h-4 w-4" />
                Joining Date
              </div>
              <p className="text-lg font-semibold">
                {new Date(profileData.joining_date).toLocaleDateString()}
              </p>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-500 mb-1">
                <Car className="h-4 w-4" />
                Total Trips
              </div>
              <p className="text-lg font-semibold">
                {profileData.total_trip || 0}
              </p>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-500 mb-1">
                <TrendingUp className="h-4 w-4" />
                Total Earnings
              </div>
              <p className="text-lg font-semibold">
                {formatCurrency(profileData.total_earning || 0)}
              </p>
            </div>

            

            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-500 mb-1">
                <Wallet className="h-4 w-4" />
                Pending Balance
              </div>
              <p className="text-lg font-semibold">
                {formatCurrency(profileData.pending_balance || 0)}
              </p>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-500 mb-1">
                Vehicle
              </div>
              <p className="text-lg font-semibold">
                {profileData.vehicle_number || 'Not assigned'}
              </p>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-500 mb-1">
                Current Shift
              </div>
              <p className="text-lg font-semibold capitalize">
                {profileData.shift || 'Not assigned'}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between border-t pt-4">
            <div className="flex items-center gap-2">
              <Badge variant={profileData.online ? 'success' : 'secondary'}>
                {profileData.online ? 'Online' : 'Offline'}
              </Badge>
              <Badge variant={profileData.is_verified ? 'success' : 'secondary'}>
                {profileData.is_verified ? 'Verified' : 'Pending Verification'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>;
};
export default UserProfile;