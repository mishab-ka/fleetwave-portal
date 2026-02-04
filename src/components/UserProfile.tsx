import React, { useState, useEffect, useMemo } from "react";
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
  CreditCard,
  User,
  AlertTriangle,
  DollarSign,
  Home,
  Bed,
  Phone,
  Users,
  MessageSquare,
} from "lucide-react";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const UserProfile = () => {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uberProfile, setUberProfile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [accommodationInfo, setAccommodationInfo] = useState(null);
  const [editForm, setEditForm] = useState({
    account_number: "",
    ifsc_code: "",
    bank_name: "",
    date_of_birth: "",
  });
  const [penaltyHistory, setPenaltyHistory] = useState([]);
  const [loadingPenalties, setLoadingPenalties] = useState(false);
  const [currentTab, setCurrentTab] = useState("profile");
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [penaltyTransactions, setPenaltyTransactions] = useState([]);

  // Refund request (R&F balance payout request) - driver side
  const [refundRequestOpen, setRefundRequestOpen] = useState(false);
  const [refundRequestAmount, setRefundRequestAmount] = useState<string>("");
  const [refundRequestNotes, setRefundRequestNotes] = useState<string>("");
  const [refundRequestSubmitting, setRefundRequestSubmitting] = useState(false);
  const [pendingRefundRequest, setPendingRefundRequest] = useState<{
    id: string;
    requested_at: string;
    amount: number;
  } | null>(null);

  // Driver partner(s) on same vehicle (from shift assignment)
  const [partnerDrivers, setPartnerDrivers] = useState<
    { id: string; name: string | null; phone_number: string; shift: string | null }[]
  >([]);

  // Resigned Feedback
  const [resignedFeedbackOpen, setResignedFeedbackOpen] = useState(false);
  const [resignedFeedbackSubmitting, setResignedFeedbackSubmitting] = useState(false);
  const [resignedFeedbackForm, setResignedFeedbackForm] = useState({
    feedback_text: "",
    overall_experience: "",
    would_recommend: null as boolean | null,
    additional_comments: "",
  });

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
        // Initialize edit form with current data
        setEditForm({
          account_number: data?.account_number || "",
          ifsc_code: data?.ifsc_code || "",
          bank_name: data?.bank_name || "",
          date_of_birth: data?.date_of_birth
            ? format(new Date(data.date_of_birth), "yyyy-MM-dd")
            : "",
        });
      } catch (error) {
        console.error("Error fetching user profile:", error);
        toast.error("Failed to load profile data");
      } finally {
        setLoading(false);
      }
    };

    const fetchAccommodationInfo = async () => {
      try {
        if (!user) return;
        const { data, error } = await supabase
          .from("bed_assignments")
          .select(
            `
            *,
            bed:beds(
              id,
              bed_number,
              bed_name,
              daily_rent,
              room:rooms(
                id,
                room_number,
                room_name
              )
            )
          `
          )
          .eq("user_id", user.id)
          .eq("status", "active")
          .is("end_date", null)
          .single();

        if (error && error.code !== "PGRST116") {
          throw error;
        }

        setAccommodationInfo(data || null);
      } catch (error) {
        console.error("Error fetching accommodation info:", error);
        // Don't show error toast for accommodation as it's optional
      }
    };

    fetchUserProfile();
    fetchAccommodationInfo();
  }, [user]);

  // Fetch driver partner(s) on same vehicle (same vehicle_number, exclude self)
  useEffect(() => {
    const fetchPartnerDrivers = async () => {
      if (!user?.id || !profileData?.vehicle_number) {
        setPartnerDrivers([]);
        return;
      }
      try {
        const { data, error } = await supabase
          .from("users")
          .select("id, name, phone_number, shift")
          .eq("vehicle_number", profileData.vehicle_number)
          .neq("id", user.id);

        if (error) throw error;
        setPartnerDrivers(data || []);
      } catch (e) {
        console.warn("Could not fetch partner drivers:", e);
        setPartnerDrivers([]);
      }
    };
    fetchPartnerDrivers();
  }, [user?.id, profileData?.vehicle_number]);

  const fetchPendingRefundRequest = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from("driver_refund_requests")
        .select("id, requested_at, amount")
        .eq("driver_id", user.id)
        .eq("status", "pending")
        .order("requested_at", { ascending: false })
        .limit(1);

      if (error) throw error;
      setPendingRefundRequest(data && data.length > 0 ? (data[0] as any) : null);
    } catch (e) {
      console.warn("Unable to load pending refund request:", e);
      setPendingRefundRequest(null);
    }
  };

  useEffect(() => {
    fetchPendingRefundRequest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const fetchPenaltyHistory = async () => {
    if (!user) return;

    try {
      setLoadingPenalties(true);
      const { data, error } = await supabase
        .from("penalty_history")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPenaltyHistory(data || []);
    } catch (error) {
      console.error("Error fetching penalty history:", error);
      toast.error("Failed to load penalty history");
    } finally {
      setLoadingPenalties(false);
    }
  };

  const fetchPenaltyTransactions = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("driver_penalty_transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPenaltyTransactions(data || []);
    } catch (error) {
      console.error("Error fetching penalty transactions:", error);
    }
  };

  useEffect(() => {
    if (currentTab === "penalties") {
      fetchPenaltyHistory();
    }
  }, [currentTab, user]);

  useEffect(() => {
    fetchPenaltyTransactions();
  }, [user]);

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from("users")
        .update({
          account_number: editForm.account_number,
          ifsc_code: editForm.ifsc_code,
          bank_name: editForm.bank_name,
          date_of_birth: editForm.date_of_birth || null,
        })
        .eq("id", user.id);

      if (error) throw error;

      // Update local state
      setProfileData((prev) => ({
        ...prev,
        account_number: editForm.account_number,
        ifsc_code: editForm.ifsc_code,
        bank_name: editForm.bank_name,
        date_of_birth: editForm.date_of_birth,
      }));

      setIsEditing(false);
      toast.success("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    }
  };

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

  // Calculate penalty summary from transactions (moved before early returns)
  const penaltySummary = useMemo(() => {
    if (!penaltyTransactions || penaltyTransactions.length === 0) {
      return { netPenalties: 0, totalRefunds: 0, totalBonuses: 0 };
    }

    let totalPenalties = 0;
    let totalPenaltyPaid = 0;
    let totalRefunds = 0;
    let totalBonuses = 0;

    penaltyTransactions.forEach((transaction) => {
      const amount = transaction.amount;

      switch (transaction.type) {
        case "penalty":
          totalPenalties += amount;
          break;
        case "penalty_paid":
          totalPenaltyPaid += amount;
          break;
        case "bonus":
          totalBonuses += amount;
          break;
        case "refund":
          totalRefunds += amount;
          break;
        case "due":
          totalPenalties += amount; // Due amounts are treated as penalties
          break;
        case "extra_collection":
          totalPenalties += amount; // Extra collection amounts are treated as penalties
          break;
      }
    });

    // Calculate net amount: if refunds > penalties, show positive refund balance
    // If penalties > refunds, show penalty balance
    const totalCredits = totalPenaltyPaid + totalRefunds + totalBonuses;
    const netAmount = totalCredits - totalPenalties;

    const summary = {
      netPenalties: netAmount, // This will be positive (refund balance) or negative (penalty balance)
      totalRefunds,
      totalBonuses,
      totalPenalties,
      totalPenaltyPaid,
    };

    return summary;
  }, [penaltyTransactions]);

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

  const getPenaltyStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge variant="destructive" className="text-xs">
            Active
          </Badge>
        );
      case "waived":
        return (
          <Badge variant="secondary" className="text-xs">
            Waived
          </Badge>
        );
      case "paid":
        return (
          <Badge variant="success" className="text-xs">
            Paid
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-xs">
            {status}
          </Badge>
        );
    }
  };

  const openPhotoModal = (photos: string[]) => {
    setSelectedPhotos(photos);
    setIsPhotoModalOpen(true);
  };

  const openRefundRequest = () => {
    if (penaltySummary.netPenalties <= 0) return;
    setRefundRequestAmount(String(Math.floor(penaltySummary.netPenalties)));
    setRefundRequestNotes("");
    setRefundRequestOpen(true);
  };

  const submitRefundRequest = async () => {
    if (!user?.id) {
      toast.error("You must be logged in");
      return;
    }
    const amountNum = Number(refundRequestAmount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (amountNum > penaltySummary.netPenalties) {
      toast.error("Amount cannot exceed your refund balance");
      return;
    }
    if (pendingRefundRequest) {
      toast.error("You already have a pending refund request");
      return;
    }

    try {
      setRefundRequestSubmitting(true);
      const { error } = await supabase.from("driver_refund_requests").insert({
        driver_id: user.id,
        amount: amountNum,
        status: "pending",
        requested_by: user.id,
        notes: refundRequestNotes.trim() || null,
      });

      if (error) throw error;
      toast.success("Refund request submitted");
      setRefundRequestOpen(false);
      await fetchPendingRefundRequest();
    } catch (e) {
      console.error("Error submitting refund request:", e);
      toast.error("Failed to submit refund request");
    } finally {
      setRefundRequestSubmitting(false);
    }
  };

  // Check if driver is resigned
  const isResigned = profileData?.driver_status === "resigning" || profileData?.resigning_date;

  const submitResignedFeedback = async () => {
    if (!user?.id || !profileData) {
      toast.error("You must be logged in");
      return;
    }

    if (!resignedFeedbackForm.feedback_text.trim()) {
      toast.error("Please provide your feedback");
      return;
    }

    try {
      setResignedFeedbackSubmitting(true);
      const { error } = await supabase.from("resigned_feedback").insert({
        user_id: user.id,
        driver_name: profileData.name || "",
        driver_id: profileData.driver_id || null,
        vehicle_number: profileData.vehicle_number || null,
        resigning_date: profileData.resigning_date || null,
        resignation_reason: profileData.resignation_reason || null,
        feedback_text: resignedFeedbackForm.feedback_text.trim(),
        overall_experience: resignedFeedbackForm.overall_experience || null,
        would_recommend: resignedFeedbackForm.would_recommend,
        additional_comments: resignedFeedbackForm.additional_comments.trim() || null,
      });

      if (error) throw error;
      toast.success("Thank you for your feedback!");
      setResignedFeedbackOpen(false);
      setResignedFeedbackForm({
        feedback_text: "",
        overall_experience: "",
        would_recommend: null,
        additional_comments: "",
      });
    } catch (e) {
      console.error("Error submitting resigned feedback:", e);
      toast.error("Failed to submit feedback");
    } finally {
      setResignedFeedbackSubmitting(false);
    }
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
        <CardContent>
          <Tabs value={currentTab} onValueChange={setCurrentTab}>
            <TabsList className="mb-4 grid w-full grid-cols-1">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              {/* <TabsTrigger value="penalties">Penalty History</TabsTrigger> */}
            </TabsList>

            <TabsContent value="profile" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-500 mb-1">
                    <Calendar className="h-4 w-4" />
                    Joining Date
                  </div>
                  <p className="text-lg font-semibold">
                    {profileData.joining_date
                      ? format(
                          new Date(profileData.joining_date),
                          "dd MMM yyyy"
                        )
                      : "Not available"}
                  </p>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-500 mb-1">
                    <Wallet className="h-4 w-4" />
                    Deposit Balance
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
                    <AlertTriangle className="h-4 w-4" />
                    Refunds & Penalties
                  </div>
                  <p
                    className={`text-lg font-semibold ${
                      penaltySummary.netPenalties > 0
                        ? "text-green-500" // Positive = refund balance (green)
                        : penaltySummary.netPenalties < 0
                        ? "text-red-500" // Negative = penalty balance (red)
                        : "text-gray-500" // Zero
                    }`}
                  >
                    {penaltySummary.netPenalties < 0
                      ? `-${formatCurrency(
                          Math.abs(penaltySummary.netPenalties)
                        )}`
                      : formatCurrency(penaltySummary.netPenalties)}
                  </p>

                  {penaltySummary.netPenalties > 0 && (
                    <div className="mt-3">
                      <Button
                        size="sm"
                        onClick={openRefundRequest}
                        className="bg-green-600 hover:bg-green-700"
                        disabled={!!pendingRefundRequest}
                        title={
                          pendingRefundRequest
                            ? "A pending refund request already exists"
                            : ""
                        }
                      >
                        Request Refund
                      </Button>

                      {pendingRefundRequest && (
                        <p className="text-xs text-gray-500 mt-2">
                          Pending request: ₹
                          {Number(pendingRefundRequest.amount).toLocaleString(
                            "en-IN"
                          )}{" "}
                          (requested{" "}
                          {format(
                            new Date(pendingRefundRequest.requested_at),
                            "dd MMM yyyy"
                          )}
                          )
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-500 mb-1">
                <DollarSign className="h-4 w-4" />
                Net Balance
              </div>
              <p
                className={`text-lg font-semibold ${
                  (profileData.net_balance || 0) >= 0
                    ? "text-blue-500"
                    : "text-red-500"
                }`}
              >
                {formatCurrency(profileData.net_balance || 0)}
              </p>
            </div> */}

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
                    <Car className="h-4 w-4" />
                    Total Trips
                  </div>
                  <p className="text-lg font-semibold">
                    {profileData.total_trip || 0}
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

                {/* Driver partner(s) on same vehicle */}
                {profileData.vehicle_number && (
                  <div className="p-4 bg-gray-50 rounded-lg md:col-span-2 lg:col-span-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-500 mb-2">
                      <Users className="h-4 w-4" />
                      Driver Partner(s) – same vehicle
                    </div>
                    {partnerDrivers.length > 0 ? (
                      <div className="space-y-3">
                        {partnerDrivers.map((partner) => (
                          <div
                            key={partner.id}
                            className="flex flex-wrap items-center gap-3 rounded-md border border-gray-200 bg-white p-3 text-sm"
                          >
                            <span className="font-semibold">
                              {partner.name || "Unknown"}
                            </span>
                            {partner.phone_number && (
                              <span className="flex items-center gap-1 text-gray-600">
                                <Phone className="h-3.5 w-3.5" />
                                {partner.phone_number}
                              </span>
                            )}
                            {partner.shift && (
                              <Badge variant="outline" className="capitalize">
                                {partner.shift}
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">
                        No partner assigned on this vehicle
                      </p>
                    )}
                  </div>
                )}

                {accommodationInfo && (
                  <>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-500 mb-1">
                        <Home className="h-4 w-4" />
                        Room
                      </div>
                      <p className="text-lg font-semibold">
                        {accommodationInfo.bed.room.room_name}
                      </p>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-500 mb-1">
                        <Bed className="h-4 w-4" />
                        Bed Space
                      </div>
                      <p className="text-lg font-semibold">
                        {accommodationInfo.bed.bed_name}
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* Resigned Feedback Button - Only show for resigned drivers */}
              {isResigned && (
                <div className="border-t pt-6">
                  <div className="flex items-center justify-center">
                    <Button
                      onClick={() => setResignedFeedbackOpen(true)}
                      className="bg-orange-500 hover:bg-orange-600 text-white"
                      size="lg"
                    >
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Submit Resigned Feedback
                    </Button>
                  </div>
                </div>
              )}

              {/* Account Details and DOB Section */}
              <div className="border-t pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className=" font-semibold text-sm flex items-center gap-2">
                    <CreditCard className="h-5  w-5" />
                    Account Details
                  </h3>
                  <Button
                    variant={isEditing ? "outline" : "default"}
                    size="sm"
                    onClick={() => setIsEditing(!isEditing)}
                  >
                    {isEditing ? "Cancel" : "Edit"}
                  </Button>
                </div>

                {isEditing ? (
                  <form onSubmit={handleEditSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="account_number">Account Number</Label>
                        <Input
                          id="account_number"
                          value={editForm.account_number}
                          type="number"
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              account_number: e.target.value,
                            })
                          }
                          placeholder="Enter account number"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="ifsc_code">IFSC Code</Label>
                        <Input
                          id="ifsc_code"
                          style={{ textTransform: "uppercase" }}
                          value={editForm.ifsc_code}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              ifsc_code: e.target.value.toUpperCase(),
                            })
                          }
                          placeholder="Enter IFSC code"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bank_name">Bank Name</Label>
                        <Input
                          id="bank_name"
                          value={editForm.bank_name}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              bank_name: e.target.value,
                            })
                          }
                          placeholder="Enter bank name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="date_of_birth">Date of Birth</Label>
                        <Input
                          id="date_of_birth"
                          type="date"
                          value={editForm.date_of_birth}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              date_of_birth: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" disabled={uploading}>
                        Save Changes
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsEditing(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-500 mb-1">
                        <CreditCard className="h-4 w-4" />
                        Account Number
                      </div>
                      <p className="text-lg font-semibold">
                        {profileData.account_number || "Not provided"}
                      </p>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-500 mb-1">
                        <CreditCard className="h-4 w-4" />
                        IFSC Code
                      </div>
                      <p className="text-lg font-semibold">
                        {profileData.ifsc_code || "Not provided"}
                      </p>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-500 mb-1">
                        <CreditCard className="h-4 w-4" />
                        Bank Name
                      </div>
                      <p className="text-lg font-semibold">
                        {profileData.bank_name || "Not provided"}
                      </p>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-500 mb-1">
                        <User className="h-4 w-4" />
                        Date of Birth
                      </div>
                      <p className="text-lg font-semibold">
                        {profileData.date_of_birth
                          ? format(
                              new Date(profileData.date_of_birth),
                              "dd MMM yyyy"
                            )
                          : "Not provided"}
                      </p>
                    </div>
                  </div>
                )}
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

              {/* <div className="flex items-center justify-between border-t pt-4">
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
          </div> */}
            </TabsContent>

            <TabsContent value="penalties" className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Penalty History</h3>
                  <div className="text-sm text-gray-500">
                    Total Penalties:{" "}
                    {formatCurrency(profileData.total_penalties || 0)}
                  </div>
                </div>

                {loadingPenalties ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-500"></div>
                  </div>
                ) : penaltyHistory.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium">No penalties found</p>
                    <p className="text-sm">You have no penalty history.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Reason</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Photos</TableHead>
                          <TableHead>Notes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {penaltyHistory.map((penalty) => (
                          <TableRow key={penalty.id}>
                            <TableCell>
                              {format(
                                new Date(penalty.penalty_date),
                                "dd MMM yyyy"
                              )}
                            </TableCell>
                            <TableCell className="font-medium text-red-600">
                              ₹{penalty.amount.toLocaleString()}
                            </TableCell>
                            <TableCell>{penalty.reason}</TableCell>
                            <TableCell>
                              {getPenaltyStatusBadge(penalty.status)}
                            </TableCell>
                            <TableCell>
                              {penalty.photos
                                ? (() => {
                                    const photosArray =
                                      typeof penalty.photos === "string"
                                        ? JSON.parse(penalty.photos)
                                        : penalty.photos;

                                    return photosArray &&
                                      photosArray.length > 0 ? (
                                      <div className="flex gap-1">
                                        {photosArray
                                          .slice(0, 3)
                                          .map((photo, index) => (
                                            <img
                                              key={index}
                                              src={photo}
                                              alt={`Penalty photo ${index + 1}`}
                                              className="w-8 h-8 object-cover rounded cursor-pointer hover:opacity-80"
                                              onClick={() =>
                                                openPhotoModal(photosArray)
                                              }
                                              title="Click to view all photos"
                                            />
                                          ))}
                                        {photosArray.length > 3 && (
                                          <div
                                            className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center text-xs cursor-pointer hover:bg-gray-300"
                                            onClick={() =>
                                              openPhotoModal(photosArray)
                                            }
                                            title="Click to view all photos"
                                          >
                                            +{photosArray.length - 3}
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      "-"
                                    );
                                  })()
                                : "-"}
                            </TableCell>
                            <TableCell>
                              {penalty.notes ? (
                                <div
                                  className="max-w-xs truncate"
                                  title={penalty.notes}
                                >
                                  {penalty.notes}
                                </div>
                              ) : (
                                "-"
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Photo Gallery Modal */}
      <Dialog open={isPhotoModalOpen} onOpenChange={setIsPhotoModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Penalty Photos</DialogTitle>
            <DialogDescription>
              View all photos for this penalty
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {selectedPhotos.map((photo, index) => (
              <div key={index} className="relative group">
                <img
                  src={photo}
                  alt={`Penalty photo ${index + 1}`}
                  className="w-full h-48 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => window.open(photo, "_blank")}
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-lg flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-sm font-medium">
                    Click to view full size
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-4">
            <Button
              variant="outline"
              onClick={() => setIsPhotoModalOpen(false)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Refund Request Modal */}
      <Dialog open={refundRequestOpen} onOpenChange={setRefundRequestOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request Refund (R&F)</DialogTitle>
            <DialogDescription>
              You can request a payout only when your R&F balance is positive.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-md bg-gray-50 p-3 text-sm">
              <div className="text-gray-500">Available refund balance</div>
              <div className="text-lg font-semibold text-green-700">
                {formatCurrency(penaltySummary.netPenalties)}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="refund-request-amount">Amount</Label>
              <Input
                id="refund-request-amount"
                type="number"
                min={1}
                value={refundRequestAmount}
                onChange={(e) => setRefundRequestAmount(e.target.value)}
                placeholder="Enter amount"
              />
              <p className="text-xs text-gray-500">
                Amount must be ≤ your current refund balance.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="refund-request-notes">Notes (optional)</Label>
              <Textarea
                id="refund-request-notes"
                value={refundRequestNotes}
                onChange={(e) => setRefundRequestNotes(e.target.value)}
                rows={3}
                placeholder="Any details for the team..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setRefundRequestOpen(false)}
                disabled={refundRequestSubmitting}
              >
                Cancel
              </Button>
              <Button onClick={submitRefundRequest} disabled={refundRequestSubmitting}>
                {refundRequestSubmitting ? "Submitting..." : "Submit Request"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Resigned Feedback Modal */}
      <Dialog open={resignedFeedbackOpen} onOpenChange={setResignedFeedbackOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Resigned Feedback</DialogTitle>
            <DialogDescription>
              We value your feedback. Please share your experience with us.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="feedback_text">
                Feedback <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="feedback_text"
                value={resignedFeedbackForm.feedback_text}
                onChange={(e) =>
                  setResignedFeedbackForm({
                    ...resignedFeedbackForm,
                    feedback_text: e.target.value,
                  })
                }
                rows={5}
                placeholder="Please share your overall experience, what you liked, what could be improved, etc."
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="overall_experience">Overall Experience</Label>
              <Select
                value={resignedFeedbackForm.overall_experience}
                onValueChange={(value) =>
                  setResignedFeedbackForm({
                    ...resignedFeedbackForm,
                    overall_experience: value,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select experience" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="excellent">Excellent</SelectItem>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="average">Average</SelectItem>
                  <SelectItem value="poor">Poor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Would you recommend us to others?</Label>
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant={
                    resignedFeedbackForm.would_recommend === true
                      ? "default"
                      : "outline"
                  }
                  onClick={() =>
                    setResignedFeedbackForm({
                      ...resignedFeedbackForm,
                      would_recommend: true,
                    })
                  }
                >
                  Yes
                </Button>
                <Button
                  type="button"
                  variant={
                    resignedFeedbackForm.would_recommend === false
                      ? "default"
                      : "outline"
                  }
                  onClick={() =>
                    setResignedFeedbackForm({
                      ...resignedFeedbackForm,
                      would_recommend: false,
                    })
                  }
                >
                  No
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="additional_comments">Additional Comments (optional)</Label>
              <Textarea
                id="additional_comments"
                value={resignedFeedbackForm.additional_comments}
                onChange={(e) =>
                  setResignedFeedbackForm({
                    ...resignedFeedbackForm,
                    additional_comments: e.target.value,
                  })
                }
                rows={3}
                placeholder="Any additional comments or suggestions..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setResignedFeedbackOpen(false);
                  setResignedFeedbackForm({
                    feedback_text: "",
                    overall_experience: "",
                    would_recommend: null,
                    additional_comments: "",
                  });
                }}
                disabled={resignedFeedbackSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={submitResignedFeedback}
                disabled={resignedFeedbackSubmitting}
              >
                {resignedFeedbackSubmitting ? "Submitting..." : "Submit Feedback"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
export default UserProfile;
