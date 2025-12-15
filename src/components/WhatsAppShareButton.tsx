import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { format, parseISO } from "date-fns";
import {
  ReportData,
  RentStatus,
} from "@/components/admin/calendar/CalendarUtils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface WhatsAppShareButtonProps {
  driverData: ReportData;
  className?: string;
  size?: "sm" | "default" | "lg";
  variant?: "default" | "outline" | "secondary" | "ghost";
}

export const WhatsAppShareButton: React.FC<WhatsAppShareButtonProps> = ({
  driverData,
  className = "",
  size = "sm",
  variant = "outline",
}) => {
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchDriverPhone = async () => {
      try {
        const { data, error } = await supabase
          .from("users")
          .select("phone_number")
          .eq("id", driverData.userId)
          .single();

        if (error || !data?.phone_number) {
          console.warn(
            "No phone number found for driver:",
            driverData.driverName
          );
          return;
        }

        // Format phone number for WhatsApp (remove any non-digit characters and ensure it starts with country code)
        let formattedPhone = data.phone_number.replace(/\D/g, "");

        // If phone number doesn't start with country code, assume it's Indian (+91)
        if (!formattedPhone.startsWith("91") && formattedPhone.length === 10) {
          formattedPhone = "91" + formattedPhone;
        }

        setPhoneNumber(formattedPhone);
      } catch (error) {
        console.error("Error fetching driver phone number:", error);
      }
    };

    fetchDriverPhone();
  }, [driverData.userId]);
  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), "dd MMM yyyy");
    } catch (e) {
      return dateString;
    }
  };

  const getStatusMessage = (status: string): string => {
    const driverName = driverData.driverName;
    const vehicleNumber = driverData.vehicleNumber || "N/A";
    const date = formatDate(driverData.date);
    const shift = driverData.shift;
    const amount = driverData.rent_paid_amount;

    switch (status) {
      case "paid":
        return `✅ *Rent Payment Confirmed*

*Driver:* ${driverName}
*Vehicle:* ${vehicleNumber}
*Date:* ${date}
*Shift:* ${shift}
*Amount:* ₹${amount?.toLocaleString() || "0"}

Your rent payment has been successfully processed and verified. Thank you for your timely submission! 🎉`;

      case "pending_verification":
        return `⏳ *Rent Payment Pending Verification*

*Driver:* ${driverName}
*Vehicle:* ${vehicleNumber}
*Date:* ${date}
*Shift:* ${shift}
*Amount:* ₹${amount?.toLocaleString() || "0"}

Your rent payment has been submitted and is currently under review. You will be notified once it's verified. Please keep this message for your records.`;

      case "overdue":
        return `🚨 *URGENT: Rent Payment Overdue*

*Driver:* ${driverName}
*Vehicle:* ${vehicleNumber}
*Date:* ${date}
*Shift:* ${shift}

⚠️ Your rent payment is overdue. Please submit your payment immediately to avoid any penalties.

*Deadline was:*
${shift === "morning" ? "5:00 PM same day" : "5:00 AM next day"}

Please contact the admin team if you have any questions.`;

      case "leave":
        return `🏖️ *Leave Status Confirmed*

*Driver:* ${driverName}
*Vehicle:* ${vehicleNumber}
*Date:* ${date}
*Shift:* ${shift}

Your leave has been approved and recorded. Enjoy your time off! 

Please ensure you're back and ready to work on your next scheduled shift.`;

      case "offline":
        return `📴 *Driver Offline Status*

*Driver:* ${driverName}
*Vehicle:* ${vehicleNumber}
*Date:* ${date}
*Shift:* ${shift}

You are currently marked as offline. Please contact the admin team when you're ready to resume work.

*Note:* ${driverData.notes || "Driver offline on this date"}`;

      case "not_joined":
        return `📝 *Rent Payment Reminder*

*Driver:* ${driverName}
*Vehicle:* ${vehicleNumber}
*Date:* ${date}
*Shift:* ${shift}

This is a friendly reminder to submit your rent payment. Please ensure you complete your payment submission as soon as possible.

*Deadline:*
${shift === "morning" ? "5:00 PM same day" : "5:00 AM next day"}`;

      default:
        return `📋 *Rent Status Update*

*Driver:* ${driverName}
*Vehicle:* ${vehicleNumber}
*Date:* ${date}
*Shift:* ${shift}
*Status:* ${status}

Please check your rent status and take necessary action if required.`;
    }
  };

  const handleWhatsAppShare = async () => {
    if (!phoneNumber) {
      toast.error("Phone number not available for this driver");
      return;
    }

    setIsLoading(true);

    try {
      const message = getStatusMessage(driverData.status);
      const encodedMessage = encodeURIComponent(message);

      const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;

      // Open WhatsApp in a new tab
      window.open(whatsappUrl, "_blank");

      toast.success("Opening WhatsApp...");
    } catch (error) {
      console.error("Error sharing to WhatsApp:", error);
      toast.error("Failed to open WhatsApp");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleWhatsAppShare}
      variant={variant}
      size={size}
      disabled={!phoneNumber || isLoading}
      className={`text-green-600 border-green-600 hover:bg-green-50 ${className}`}
      title={
        !phoneNumber
          ? "Phone number not available"
          : "Share status via WhatsApp"
      }
    >
      <MessageCircle className="h-4 w-4 mr-2" />
      {isLoading ? "Loading..." : "Share"}
    </Button>
  );
};
