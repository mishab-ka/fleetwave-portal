import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileUp } from "lucide-react";
import WeeklyCalendar from "@/components/ui/weeklycalander";

interface SalaryBaseReportFormProps {
  userData: any;
  selectedDate: string | null;
  onDateSelect: (date: string) => void;
  existingReportForDate: any;
  onSubmit: (e: React.FormEvent) => void;
  submitting: boolean;
  navigate: (path: string) => void;
}

export const SalaryBaseReportForm: React.FC<SalaryBaseReportFormProps> = ({
  userData,
  selectedDate,
  onDateSelect,
  existingReportForDate,
  onSubmit,
  submitting,
  navigate,
}) => {
  const [formData, setFormData] = useState({
    work_date: "",
    total_earnings: "",
    total_cashcollect: "",
    cng_expense: "",
    toll: "",
    remarks: "",
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const payableAmount = Number(formData.total_cashcollect || 0) || 0;

  return (
    <form onSubmit={onSubmit}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <Label htmlFor="driver_name">Driver Name</Label>
          <Input
            id="driver_name"
            value={userData.name || ""}
            disabled
            className="bg-gray-100"
          />
        </div>

        <div>
          <Label htmlFor="employee_id">Employee ID</Label>
          <Input
            id="employee_id"
            value={userData.driver_id || "Not Assigned"}
            disabled
            className="bg-gray-100"
          />
        </div>
      </div>

      <WeeklyCalendar onDateSelect={onDateSelect} requireSelection={true} />

      {/* Existing Report Warning */}
      {existingReportForDate && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="flex items-center gap-2 mb-2">
            <svg
              className="w-5 h-5 text-yellow-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
            <span className="font-semibold text-yellow-800">
              Report Already Submitted
            </span>
          </div>
          <p className="text-sm text-yellow-700">
            A report for {selectedDate} has already been submitted. You cannot
            submit multiple reports for the same date.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <Label htmlFor="total_earnings">Total Earnings (₹)</Label>
          <Input
            id="total_earnings"
            name="total_earnings"
            type="number"
            placeholder="Enter total earnings"
            value={formData.total_earnings}
            onChange={handleInputChange}
            min="0"
            step="0.01"
            required
          />
        </div>

        <div>
          <Label htmlFor="total_cashcollect">Total Cash Collected (₹)</Label>
          <Input
            id="total_cashcollect"
            name="total_cashcollect"
            type="number"
            placeholder="Enter total cash collected"
            value={formData.total_cashcollect}
            onChange={handleInputChange}
            min="0"
            step="0.01"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <Label htmlFor="cng_expense">CNG Expense (₹)</Label>
          <Input
            id="cng_expense"
            name="cng_expense"
            type="number"
            placeholder="Enter CNG expense"
            value={formData.cng_expense}
            onChange={handleInputChange}
            min="0"
            step="0.01"
          />
        </div>

        <div>
          <Label htmlFor="toll">Toll (₹)</Label>
          <Input
            id="toll"
            name="toll"
            type="number"
            placeholder="Enter toll amount"
            value={formData.toll}
            onChange={handleInputChange}
            min="0"
            step="0.01"
          />
        </div>
      </div>

      <div className="mb-6">
        <Label htmlFor="remarks">Remarks (Optional)</Label>
        <Textarea
          id="remarks"
          name="remarks"
          placeholder="Any additional notes or comments"
          value={formData.remarks}
          onChange={handleInputChange}
          rows={3}
        />
      </div>

      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
        <h3 className="text-sm font-semibold text-blue-800 mb-2">
          Payable Amount Summary
        </h3>
        <p className="text-xs text-blue-700 mb-2">
          Payable amount equals the total cash collected for the day.
        </p>
        <div className="text-2xl font-bold text-blue-900">
          ₹{payableAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate("/profile")}
          className="mr-2"
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={submitting || existingReportForDate || !selectedDate}
          className={
            existingReportForDate || !selectedDate
              ? "opacity-50 cursor-not-allowed"
              : ""
          }
        >
          {submitting
            ? "Submitting..."
            : existingReportForDate
            ? "Report Already Submitted"
            : !selectedDate
            ? "Please Select Date"
            : "Submit Report"}
        </Button>
      </div>
    </form>
  );
};
