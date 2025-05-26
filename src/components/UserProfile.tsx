import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  IndianRupee,
  Calendar,
  Car,
  TrendingUp,
  Shield,
  Wallet,
  Upload,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const UserProfile = () => {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uberProfile, setUberProfile] = useState(null);

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
        setUberProfile(data?.uber_profile);
      } catch (error) {
        console.error("Error fetching user profile:", error);
        toast.error("Failed to load profile data");
      } finally {
        setLoading(false);
      }
    };
    fetchUserProfile();
  }, [user]);

  const handleUberProfileUpload = async (event) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;

      // Check file type
      if (!file.type.startsWith("image/")) {
        toast.error("Please upload an image file");
        return;
      }

      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size should be less than 5MB");
        return;
      }

      setUploading(true);

      // Upload to Supabase Storage
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/uber_profile.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("uber_profiles")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("uber_profiles").getPublicUrl(fileName);

      // Update user profile
      const { error: updateError } = await supabase
        .from("users")
        .update({ uber_profile: publicUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      setUberProfile(publicUrl);
      toast.success("Uber profile uploaded successfully");
    } catch (error) {
      console.error("Error uploading Uber profile:", error);
      toast.error("Failed to upload Uber profile");
    } finally {
      setUploading(false);
    }
  };

  const removeUberProfile = async () => {
    try {
      setUploading(true);

      // Delete from storage
      const fileExt = uberProfile.split(".").pop();
      const fileName = `${user.id}/uber_profile.${fileExt}`;
      const { error: deleteError } = await supabase.storage
        .from("uber_profiles")
        .remove([fileName]);

      if (deleteError) throw deleteError;

      // Update user profile
      const { error: updateError } = await supabase
        .from("users")
        .update({ uber_profile: null })
        .eq("id", user.id);

      if (updateError) throw updateError;

      setUberProfile(null);
      toast.success("Uber profile removed successfully");
    } catch (error) {
      console.error("Error removing Uber profile:", error);
      toast.error("Failed to remove Uber profile");
    } finally {
      setUploading(false);
    }
  };

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
        <p className="text-lg text-gray-600">
          Profile data not found. Please complete your profile.
        </p>
      </div>
    );
  }
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  };
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              {profileData.profile_photo ? (
                <AvatarImage
                  src={profileData.profile_photo}
                  alt={profileData.name}
                />
              ) : (
                <AvatarFallback className="bg-fleet-purple text-white text-xl">
                  {getInitials(profileData.name || "")}
                </AvatarFallback>
              )}
            </Avatar>
            <div>
              <h2 className="text-2xl font-bold">{profileData.name}</h2>
              <p className="text-gray-500 max-sm:text-xs">
                {profileData.email_id}
              </p>
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
                {profileData.joining_date
                  ? format(new Date(profileData.joining_date), "dd MMM yyyy")
                  : "Not available"}
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
                Current Balance
              </div>
              <p
                className={`text-lg font-semibold ${
                  (profileData.pending_balance || 0) < 0
                    ? "text-red-500"
                    : "text-green-500"
                }`}
              >
                {formatCurrency(profileData.pending_balance || 0)}
              </p>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-500 mb-1">
                Vehicle
              </div>
              <p className="text-lg font-semibold">
                {profileData.vehicle_number || "Not assigned"}
              </p>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-500 mb-1">
                Current Shift
              </div>
              <p className="text-lg font-semibold capitalize">
                {profileData.shift || "Not assigned"}
              </p>
            </div>
          </div>

          {/* <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">Uber Profile</h3>
            <div className="space-y-4">
              {uberProfile ? (
                <div className="relative">
                  <img
                    src={uberProfile}
                    alt="Uber Profile"
                    className="w-full max-w-md rounded-lg shadow-sm"
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={removeUberProfile}
                    disabled={uploading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-center w-full max-w-md">
                  <Label
                    htmlFor="uber-profile"
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="h-8 w-8 text-gray-400 mb-2" />
                      <p className="mb-2 text-sm text-gray-500">
                        <span className="font-semibold">Click to upload</span>{" "}
                        or drag and drop
                      </p>
                      <p className="text-xs text-gray-500">
                        PNG, JPG or JPEG (MAX. 5MB)
                      </p>
                    </div>
                    <Input
                      id="uber-profile"
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleUberProfileUpload}
                      disabled={uploading}
                    />
                  </Label>
                </div>
              )}
              {uploading && (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-fleet-purple"></div>
                </div>
              )}
            </div>
          </div> */}

          <div className="flex items-center justify-between border-t pt-4">
            <div className="flex items-center gap-2">
              <Badge variant={profileData.online ? "success" : "secondary"}>
                {profileData.online ? "Online" : "Offline"}
              </Badge>
              <Badge
                variant={profileData.is_verified ? "success" : "secondary"}
              >
                {profileData.is_verified ? "Verified" : "Pending Verification"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
export default UserProfile;
