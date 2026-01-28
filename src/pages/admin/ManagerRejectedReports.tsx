import React, { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useAdmin } from "@/context/AdminContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  FileText,
  XCircle,
  Eye,
  Upload,
  Image as ImageIcon,
  CheckCircle,
  AlertCircle,
  Search,
  Calendar,
  User,
  Car,
  DollarSign,
  X,
  Trash2,
} from "lucide-react";

interface RejectedReport {
  id: string;
  driver_name: string;
  vehicle_number: string;
  total_trips: number;
  total_earnings: number;
  rent_date: string;
  shift: string;
  submission_date: string;
  remarks: string | null;
  status: string;
}

interface ManagerResponse {
  id: string;
  report_id: string;
  manager_id: string;
  note: string | null;
  image_url: string | null;
  status: "submitted" | "confirmed" | "rejected";
  confirmed_by: string | null;
  confirmed_at: string | null;
  created_at: string;
  manager_name?: string;
  confirmed_by_name?: string;
  report?: RejectedReport;
}

const ManagerRejectedReports = () => {
  const { user } = useAuth();
  const { isManager, isAccountant, isAdmin } = useAdmin();
  const [loading, setLoading] = useState(true);
  const [rejectedReports, setRejectedReports] = useState<RejectedReport[]>([]);
  const [submittedResponses, setSubmittedResponses] = useState<
    ManagerResponse[]
  >([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedReport, setSelectedReport] = useState<RejectedReport | null>(
    null
  );
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [note, setNote] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState("rejected");

  useEffect(() => {
    if (user) {
      fetchRejectedReports();
      fetchSubmittedResponses();
    }
  }, [user]);

  const fetchRejectedReports = async () => {
    try {
      setLoading(true);

      // Get all rejected reports that don't have a response yet
      const { data: reportsData, error: reportsError } = await supabase
        .from("fleet_reports")
        .select("*")
        .eq("status", "rejected")
        .order("submission_date", { ascending: false });

      if (reportsError) throw reportsError;

      // Get all existing responses to filter out reports that already have responses
      const { data: responsesData } = await supabase
        .from("rejected_report_responses")
        .select("report_id");

      const respondedReportIds = new Set(
        responsesData?.map((r) => r.report_id) || []
      );

      // Filter out reports that already have responses
      const reportsWithoutResponses = (reportsData || []).filter(
        (report) => !respondedReportIds.has(report.id)
      );

      setRejectedReports(reportsWithoutResponses as RejectedReport[]);
    } catch (error) {
      console.error("Error fetching rejected reports:", error);
      toast.error("Failed to load rejected reports");
    } finally {
      setLoading(false);
    }
  };

  const fetchSubmittedResponses = async () => {
    try {
      // Get all submitted responses
      const { data: responsesData, error: responsesError } = await supabase
        .from("rejected_report_responses")
        .select(
          `
          *,
          report:fleet_reports(*)
        `
        )
        .order("created_at", { ascending: false });

      if (responsesError) throw responsesError;

      // Get manager and accountant names
      const managerIds = [
        ...new Set(
          (responsesData || []).map((r) => r.manager_id).filter(Boolean)
        ),
      ];
      const accountantIds = [
        ...new Set(
          (responsesData || [])
            .map((r) => r.confirmed_by)
            .filter(Boolean) as string[]
        ),
      ];
      const allUserIds = [...new Set([...managerIds, ...accountantIds])];

      let usersMap: Record<string, string> = {};
      if (allUserIds.length > 0) {
        const { data: usersData } = await supabase
          .from("users")
          .select("id, name")
          .in("id", allUserIds);

        if (usersData) {
          usersMap = usersData.reduce(
            (acc, u) => {
              acc[u.id] = u.name || "Unknown";
              return acc;
            },
            {} as Record<string, string>
          );
        }
      }

      const responsesWithNames = (responsesData || []).map((r) => ({
        ...r,
        manager_name: usersMap[r.manager_id] || "Unknown",
        confirmed_by_name: r.confirmed_by
          ? usersMap[r.confirmed_by] || "Unknown"
          : null,
        report: r.report as RejectedReport,
      }));

      setSubmittedResponses(responsesWithNames as ManagerResponse[]);
    } catch (error) {
      console.error("Error fetching submitted responses:", error);
      toast.error("Failed to load submitted responses");
    }
  };

  const handleOpenForm = (report: RejectedReport) => {
    setSelectedReport(report);
    setNote("");
    setImageFile(null);
    setImagePreview(null);
    setIsFormModalOpen(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size should be less than 5MB");
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitResponse = async () => {
    if (!selectedReport || !user) return;

    if (!note.trim() && !imageFile) {
      toast.error("Please provide a note or upload an image");
      return;
    }

    try {
      setUploading(true);

      let imageUrl: string | null = null;

      // Upload image if provided
      if (imageFile) {
        const fileExt = imageFile.name.split(".").pop();
        const fileName = `rejected_reports/${selectedReport.id}_${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("uploads")
          .upload(fileName, imageFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("uploads")
          .getPublicUrl(fileName);

        imageUrl = urlData.publicUrl;
      }

      // Insert response
      const { error: insertError } = await supabase
        .from("rejected_report_responses")
        .insert({
          report_id: selectedReport.id,
          manager_id: user.id,
          note: note.trim() || null,
          image_url: imageUrl,
          status: "submitted",
        });

      if (insertError) throw insertError;

      toast.success("Response submitted successfully");
      setIsFormModalOpen(false);
      setSelectedReport(null);
      setNote("");
      setImageFile(null);
      setImagePreview(null);
      fetchRejectedReports();
      fetchSubmittedResponses();
      setActiveTab("submitted");
    } catch (error: any) {
      console.error("Error submitting response:", error);
      toast.error(error.message || "Failed to submit response");
    } finally {
      setUploading(false);
    }
  };

  const handleConfirmResponse = async (responseId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("rejected_report_responses")
        .update({
          status: "confirmed",
          confirmed_by: user.id,
          confirmed_at: new Date().toISOString(),
        })
        .eq("id", responseId);

      if (error) throw error;

      toast.success("Response confirmed successfully");
      fetchSubmittedResponses();
    } catch (error: any) {
      console.error("Error confirming response:", error);
      toast.error(error.message || "Failed to confirm response");
    }
  };

  const handleRejectResponse = async (responseId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("rejected_report_responses")
        .update({
          status: "rejected",
          confirmed_by: user.id,
          confirmed_at: new Date().toISOString(),
        })
        .eq("id", responseId);

      if (error) throw error;

      toast.success("Response rejected successfully");
      fetchSubmittedResponses();
      fetchRejectedReports(); // Refresh rejected reports list since this report can now be responded to again
    } catch (error: any) {
      console.error("Error rejecting response:", error);
      toast.error(error.message || "Failed to reject response");
    }
  };

  const handleDeleteResponse = async (responseId: string, managerId: string) => {
    if (!user) return;

    // Only allow managers to delete their own responses, or admins/accountants to delete any
    if (!isAdmin && !isAccountant && user.id !== managerId) {
      toast.error("You can only delete your own responses");
      return;
    }

    if (!confirm("Are you sure you want to delete this response? This action cannot be undone.")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("rejected_report_responses")
        .delete()
        .eq("id", responseId);

      if (error) throw error;

      toast.success("Response deleted successfully");
      fetchSubmittedResponses();
      fetchRejectedReports(); // Refresh rejected reports list since this report can now be responded to again
    } catch (error: any) {
      console.error("Error deleting response:", error);
      toast.error(error.message || "Failed to delete response");
    }
  };

  const filteredRejectedReports = rejectedReports.filter((report) =>
    report.driver_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSubmittedResponses = submittedResponses.filter((response) =>
    response.report?.driver_name
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  if (!isManager && !isAccountant && !isAdmin) {
    return (
      <AdminLayout title="Rejected Reports">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
            <p className="text-gray-600">Access denied</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Rejected Reports">
      <div className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="rejected">
                Rejected Reports ({filteredRejectedReports.length})
              </TabsTrigger>
              <TabsTrigger value="submitted">
                Submitted Responses ({filteredSubmittedResponses.length})
              </TabsTrigger>
            </TabsList>
            <div className="relative w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by driver name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Rejected Reports Tab */}
          <TabsContent value="rejected" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-500" />
                  Rejected Reports
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-fleet-purple"></div>
                  </div>
                ) : filteredRejectedReports.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-500">No rejected reports found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Driver</TableHead>
                          <TableHead>Vehicle</TableHead>
                          <TableHead>Shift</TableHead>
                          <TableHead>Trips</TableHead>
                          <TableHead>Earnings</TableHead>
                          <TableHead>Remarks</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRejectedReports.map((report) => (
                          <TableRow key={report.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-gray-400" />
                                <span>
                                  {format(
                                    new Date(report.rent_date),
                                    "dd MMM yyyy"
                                  )}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-gray-400" />
                                <span className="font-medium">
                                  {report.driver_name}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Car className="h-4 w-4 text-blue-500" />
                                <span>{report.vehicle_number}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{report.shift}</Badge>
                            </TableCell>
                            <TableCell>{report.total_trips}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <DollarSign className="h-4 w-4 text-green-500" />
                                <span className="font-medium">
                                  ₹{report.total_earnings.toLocaleString()}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="max-w-xs truncate">
                              {report.remarks || "-"}
                            </TableCell>
                            <TableCell className="text-right">
                              {isManager || isAdmin ? (
                                <Button
                                  size="sm"
                                  onClick={() => handleOpenForm(report)}
                                >
                                  Submit Response
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleOpenForm(report)}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  View
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Submitted Responses Tab */}
          <TabsContent value="submitted" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Submitted Responses
                </CardTitle>
              </CardHeader>
              <CardContent>
                {filteredSubmittedResponses.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-500">
                      No submitted responses found
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredSubmittedResponses.map((response) => (
                      <Card key={response.id} className="p-4">
                        <div className="space-y-4">
                          {/* Report Info */}
                          {response.report && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-4 border-b">
                              <div>
                                <p className="text-sm text-gray-500">Driver</p>
                                <p className="font-medium">
                                  {response.report.driver_name}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-500">Vehicle</p>
                                <p className="font-medium">
                                  {response.report.vehicle_number}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-500">Date</p>
                                <p className="font-medium">
                                  {format(
                                    new Date(response.report.rent_date),
                                    "dd MMM yyyy"
                                  )}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-500">Shift</p>
                                <Badge variant="outline">
                                  {response.report.shift}
                                </Badge>
                              </div>
                            </div>
                          )}

                          {/* Manager Response */}
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm text-gray-500">
                                  Submitted by
                                </p>
                                <p className="font-medium">
                                  {response.manager_name}
                                </p>
                                <p className="text-xs text-gray-400">
                                  {format(
                                    new Date(response.created_at),
                                    "dd MMM yyyy, hh:mm a"
                                  )}
                                </p>
                              </div>
                              <Badge
                                variant={
                                  response.status === "confirmed"
                                    ? "default"
                                    : response.status === "rejected"
                                    ? "destructive"
                                    : "secondary"
                                }
                              >
                                {response.status === "confirmed"
                                  ? "Confirmed"
                                  : response.status === "rejected"
                                  ? "Rejected"
                                  : "Pending"}
                              </Badge>
                            </div>

                            {response.note && (
                              <div>
                                <p className="text-sm text-gray-500 mb-1">
                                  Note
                                </p>
                                <div className="p-3 bg-gray-50 rounded-lg">
                                  <p className="text-sm">{response.note}</p>
                                </div>
                              </div>
                            )}

                            {response.image_url && (
                              <div>
                                <p className="text-sm text-gray-500 mb-2">
                                  Image
                                </p>
                                <a
                                  href={response.image_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-block"
                                >
                                  <img
                                    src={response.image_url}
                                    alt="Response image"
                                    className="max-w-md rounded-lg border border-gray-200 cursor-pointer hover:opacity-80"
                                  />
                                </a>
                              </div>
                            )}

                            {response.status === "confirmed" &&
                              response.confirmed_by_name && (
                                <div className="pt-2 border-t">
                                  <p className="text-sm text-gray-500">
                                    Confirmed by{" "}
                                    <span className="font-medium">
                                      {response.confirmed_by_name}
                                    </span>
                                    {response.confirmed_at &&
                                      ` on ${format(
                                        new Date(response.confirmed_at),
                                        "dd MMM yyyy, hh:mm a"
                                      )}`}
                                  </p>
                                </div>
                              )}
                          </div>

                          {/* Actions for Accountants/Admins */}
                          {(isAccountant || isAdmin) &&
                            response.status === "submitted" && (
                              <div className="flex justify-end gap-2 pt-4 border-t">
                                <Button
                                  variant="outline"
                                  onClick={() => handleRejectResponse(response.id)}
                                  className="border-red-500 text-red-600 hover:bg-red-50"
                                >
                                  <X className="h-4 w-4 mr-2" />
                                  Reject
                                </Button>
                                <Button
                                  onClick={() =>
                                    handleConfirmResponse(response.id)
                                  }
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Confirm
                                </Button>
                              </div>
                            )}

                          {/* Delete button for Managers (own responses when submitted) and Admins/Accountants (any response) */}
                          {((isManager && user?.id === response.manager_id && response.status === "submitted") || 
                            (isAdmin || isAccountant)) && (
                              <div className="flex justify-end pt-4 border-t">
                                <Button
                                  variant="outline"
                                  onClick={() => handleDeleteResponse(response.id, response.manager_id)}
                                  className="border-red-500 text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </Button>
                              </div>
                            )}
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Submit Response Form Modal */}
        <Dialog open={isFormModalOpen} onOpenChange={setIsFormModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Submit Response</DialogTitle>
              <DialogDescription>
                Provide a note and/or image for the rejected report
              </DialogDescription>
            </DialogHeader>

            {selectedReport && (
              <div className="space-y-4">
                {/* Report Summary */}
                <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                  <p className="font-semibold">Report Details</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500">Driver: </span>
                      <span className="font-medium">
                        {selectedReport.driver_name}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Vehicle: </span>
                      <span className="font-medium">
                        {selectedReport.vehicle_number}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Date: </span>
                      <span className="font-medium">
                        {format(
                          new Date(selectedReport.rent_date),
                          "dd MMM yyyy"
                        )}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Shift: </span>
                      <Badge variant="outline">{selectedReport.shift}</Badge>
                    </div>
                  </div>
                </div>

                {/* Note Input */}
                <div className="space-y-2">
                  <Label htmlFor="note">
                    Note <span className="text-gray-400">(Optional)</span>
                  </Label>
                  <Textarea
                    id="note"
                    placeholder="Enter your response note..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={4}
                  />
                </div>

                {/* Image Upload */}
                <div className="space-y-2">
                  <Label htmlFor="image">
                    Image <span className="text-gray-400">(Optional)</span>
                  </Label>
                  <div className="space-y-2">
                    <Input
                      id="image"
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                    />
                    {imagePreview && (
                      <div className="relative">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="max-w-full rounded-lg border border-gray-200"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute top-2 right-2"
                          onClick={() => {
                            setImageFile(null);
                            setImagePreview(null);
                          }}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    Maximum file size: 5MB. Supported formats: JPG, PNG, GIF
                  </p>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsFormModalOpen(false);
                  setNote("");
                  setImageFile(null);
                  setImagePreview(null);
                }}
                disabled={uploading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitResponse}
                disabled={uploading || (!note.trim() && !imageFile)}
              >
                {uploading ? (
                  <>
                    <div className="h-4 w-4 rounded-full border-2 border-t-transparent border-white animate-spin mr-2" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Submit Response
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default ManagerRejectedReports;
