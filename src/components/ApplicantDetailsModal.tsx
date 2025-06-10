import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { ApplicantDetails } from "@/types/hr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Mail, Phone, MapPin, Car, Clock } from "lucide-react";

interface ApplicantDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicantDetails: ApplicantDetails | null;
  onStatusChange: (status: "approved" | "rejected") => void;
  onJoiningDateChange: (date: string) => void;
}

export default function ApplicantDetailsModal({
  isOpen,
  onClose,
  applicantDetails,
  onStatusChange,
  onJoiningDateChange,
}: ApplicantDetailsModalProps) {
  if (!applicantDetails) return null;

  const { applicant, hiring_cycle } = applicantDetails;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Application Details</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">{applicant.full_name}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Contact Information</Label>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <span>{applicant.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <span>{applicant.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <span>{applicant.location}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Professional Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Professional Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Experience</Label>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span>{applicant.experience_years} years</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Vehicle Type</Label>
                <div className="flex items-center gap-2 text-sm">
                  <Car className="h-4 w-4 text-gray-500" />
                  <span>{applicant.vehicle_type}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Application Status</Label>
                <Badge
                  variant={
                    applicant.status === "approved"
                      ? "success"
                      : applicant.status === "rejected"
                      ? "destructive"
                      : "secondary"
                  }
                >
                  {applicant.status}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Additional Information */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Additional Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={applicant.additional_info || ""}
                  readOnly
                  className="min-h-[100px]"
                />
              </div>

              <div className="space-y-2">
                <Label>Hiring Cycle</Label>
                <div className="text-sm">
                  <p>
                    <span className="font-medium">Cycle Name:</span>{" "}
                    {hiring_cycle.cycle_name}
                  </p>
                  <p>
                    <span className="font-medium">Created:</span>{" "}
                    {format(new Date(hiring_cycle.created_at), "PPP")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Section */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Application Status</Label>
              <Select
                value={applicant.status}
                onValueChange={(value: "approved" | "rejected") =>
                  onStatusChange(value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approved">Approve</SelectItem>
                  <SelectItem value="rejected">Reject</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {applicant.status === "approved" && (
              <div className="space-y-2">
                <Label>Joining Date</Label>
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-gray-500" />
                  <Input
                    type="date"
                    value={applicant.joining_date || ""}
                    onChange={(e) => onJoiningDateChange(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
