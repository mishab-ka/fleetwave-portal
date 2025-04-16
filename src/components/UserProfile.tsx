
import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tables } from "@/integrations/supabase/types";

const UserProfile = () => {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState<Tables<"users"> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        if (!user) return;
        
        const { data, error } = await supabase
          .from("users")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();
        
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
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-fleet-purple"></div>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="text-center py-8">
        <p className="text-lg text-gray-600">Profile data not found. Please complete your profile.</p>
      </div>
    );
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(part => part[0])
      .join("")
      .toUpperCase();
  };

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            {profileData.profile_photo ? (
              <AvatarImage src={profileData.profile_photo} alt={profileData.name} />
            ) : (
              <AvatarFallback className="bg-fleet-purple text-white text-xl">
                {getInitials(profileData.name || "")}
              </AvatarFallback>
            )}
          </Avatar>
          <div>
            <h2 className="text-2xl font-bold">{profileData.name}</h2>
            <p className="text-gray-500">{profileData.email_id}</p>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm font-medium text-gray-500">Driver ID</h3>
            <p className="text-lg">{profileData.driver_id || "Not assigned"}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Date of Birth</h3>
            <p className="text-lg">{new Date(profileData.joining_date).toLocaleDateString()}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Vehicle</h3>
            <p className="text-lg">{profileData.vehicle_number || "Not assigned"}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Shift</h3>
            <p className="text-lg capitalize">{profileData.shift || "Not assigned"}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Status</h3>
            <div className="flex items-center mt-1">
              <span className={`h-3 w-3 rounded-full mr-2 ${profileData.online ? 'bg-green-500' : 'bg-gray-400'}`}></span>
              <span>{profileData.online ? 'Online' : 'Offline'}</span>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Verification Status</h3>
            <div className="flex items-center mt-1">
              <span className={`h-3 w-3 rounded-full mr-2 ${profileData.is_verified ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
              <span>{profileData.is_verified ? 'Verified' : 'Pending Verification'}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default UserProfile;
