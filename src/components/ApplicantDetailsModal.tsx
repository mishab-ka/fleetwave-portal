import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ApplicantDetails } from "@/types/hr";
import { format } from "date-fns";

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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Applicant Details</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="space-y-2">
            <h3 className="font-semibold">Personal Information</h3>
            <p>
              <span className="font-medium">Name:</span> {applicant.full_name}
            </p>
            <p>
              <span className="font-medium">Email:</span> {applicant.email}
            </p>
            <p>
              <span className="font-medium">Phone:</span> {applicant.phone}
            </p>
            <p>
              <span className="font-medium">Location:</span>{" "}
              {applicant.location}
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold">Professional Details</h3>
            <p>
              <span className="font-medium">Experience:</span>{" "}
              {applicant.experience_years} years
            </p>
            <p>
              <span className="font-medium">Vehicle Type:</span>{" "}
              {applicant.vehicle_type}
            </p>
            <p>
              <span className="font-medium">Status:</span>
              <span
                className={`ml-2 px-2 py-1 rounded-full text-xs font-semibold ${
                  applicant.status === "approved"
                    ? "bg-green-100 text-green-800"
                    : applicant.status === "rejected"
                    ? "bg-red-100 text-red-800"
                    : "bg-yellow-100 text-yellow-800"
                }`}
              >
                {applicant.status}
              </span>
            </p>
            <p>
              <span className="font-medium">Applied On:</span>{" "}
              {format(new Date(applicant.created_at), "PPP")}
            </p>
          </div>
          <div className="col-span-2 space-y-2">
            <h3 className="font-semibold">Additional Information</h3>
            <p className="whitespace-pre-wrap">
              {applicant.additional_info ||
                "No additional information provided"}
            </p>
          </div>
          <div className="col-span-2 space-y-2">
            <h3 className="font-semibold">Hiring Cycle Information</h3>
            <p>
              <span className="font-medium">Cycle Name:</span>{" "}
              {hiring_cycle.cycle_name}
            </p>
            <p>
              <span className="font-medium">Total Vacancies:</span>{" "}
              {hiring_cycle.total_vacancies}
            </p>
            <p>
              <span className="font-medium">Cycle Started:</span>{" "}
              {format(new Date(hiring_cycle.created_at), "PPP")}
            </p>
          </div>
          {applicant.status === "pending" && (
            <div className="col-span-2 flex gap-4 mt-4">
              <button
                onClick={() => onStatusChange("approved")}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Approve
              </button>
              <button
                onClick={() => onStatusChange("rejected")}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Reject
              </button>
            </div>
          )}
          {applicant.status === "approved" && (
            <div className="col-span-2 mt-4">
              <label className="block text-sm font-medium mb-1">
                Joining Date
              </label>
              <input
                type="date"
                value={applicant.joining_date || ""}
                onChange={(e) => onJoiningDateChange(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
