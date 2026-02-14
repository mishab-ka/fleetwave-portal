import React, { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { MessageSquare, Search } from "lucide-react";
import { toast } from "sonner";

const AdminResignedReports = () => {
  const [resignedFeedback, setResignedFeedback] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchResignedFeedback();
  }, []);

  const fetchResignedFeedback = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("resigned_feedback")
        .select(`
          *,
          users!user_id(
            id,
            name,
            email_id
          )
        `)
        .order("submission_date", { ascending: false });

      if (error) throw error;
      setResignedFeedback(data || []);
    } catch (error) {
      console.error("Error fetching resigned feedback:", error);
      toast.error("Failed to load resigned feedback");
    } finally {
      setLoading(false);
    }
  };

  const filteredFeedback = resignedFeedback.filter((feedback) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      feedback.driver_name?.toLowerCase().includes(query) ||
      feedback.driver_id?.toLowerCase().includes(query) ||
      feedback.vehicle_number?.toLowerCase().includes(query) ||
      feedback.feedback_text?.toLowerCase().includes(query) ||
      feedback.resignation_reason?.toLowerCase().includes(query)
    );
  });

  const getExperienceBadge = (experience: string) => {
    switch (experience) {
      case "excellent":
        return <Badge className="bg-green-100 text-green-700">Excellent</Badge>;
      case "good":
        return <Badge className="bg-blue-100 text-blue-700">Good</Badge>;
      case "average":
        return <Badge className="bg-yellow-100 text-yellow-700">Average</Badge>;
      case "poor":
        return <Badge className="bg-red-100 text-red-700">Poor</Badge>;
      default:
        return <Badge variant="secondary">—</Badge>;
    }
  };

  return (
    <AdminLayout title="Resigned Reports">
      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Resigned Feedback
            </h2>
            <Badge variant="secondary">{filteredFeedback.length} feedback</Badge>
          </div>

          {/* Search */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by driver name, ID, vehicle, or feedback..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-fleet-purple"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Driver Name</TableHead>
                    <TableHead>Driver ID</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Resigning Date</TableHead>
                    <TableHead>Resignation Reason</TableHead>
                    <TableHead>Feedback</TableHead>
                    <TableHead>Experience</TableHead>
                    <TableHead>Would Recommend</TableHead>
                    <TableHead>Additional Comments</TableHead>
                    <TableHead>Submitted Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFeedback.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8">
                        {searchQuery
                          ? "No feedback found matching your search"
                          : "No resigned feedback found"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredFeedback.map((feedback) => (
                      <TableRow key={feedback.id}>
                        <TableCell className="font-medium">
                          {feedback.driver_name || "—"}
                        </TableCell>
                        <TableCell>{feedback.driver_id || "—"}</TableCell>
                        <TableCell>{feedback.vehicle_number || "—"}</TableCell>
                        <TableCell>
                          {feedback.resigning_date
                            ? format(new Date(feedback.resigning_date), "d MMM yyyy")
                            : "—"}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {feedback.resignation_reason || "—"}
                        </TableCell>
                        <TableCell className="max-w-md">
                          <div className="truncate" title={feedback.feedback_text}>
                            {feedback.feedback_text || "—"}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getExperienceBadge(feedback.overall_experience)}
                        </TableCell>
                        <TableCell>
                          {feedback.would_recommend === true ? (
                            <Badge className="bg-green-100 text-green-700">Yes</Badge>
                          ) : feedback.would_recommend === false ? (
                            <Badge className="bg-red-100 text-red-700">No</Badge>
                          ) : (
                            <Badge variant="secondary">—</Badge>
                          )}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {feedback.additional_comments || "—"}
                        </TableCell>
                        <TableCell>
                          {format(
                            new Date(feedback.submission_date),
                            "d MMM yyyy, hh:mm a"
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default AdminResignedReports;

