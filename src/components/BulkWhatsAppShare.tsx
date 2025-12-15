import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle, Users } from "lucide-react";
import { ReportData } from "@/components/admin/calendar/CalendarUtils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";

interface BulkWhatsAppShareProps {
  drivers: ReportData[];
  status: string;
  className?: string;
}

export const BulkWhatsAppShare: React.FC<BulkWhatsAppShareProps> = ({
  drivers,
  status,
  className = "",
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), "dd MMM yyyy");
    } catch (e) {
      return dateString;
    }
  };

  const getBulkStatusMessage = (
    status: string,
    driverCount: number
  ): string => {
    const currentDate = format(new Date(), "dd MMM yyyy");

    switch (status) {
      case "overdue":
        return `🚨 *URGENT: Bulk Rent Payment Reminder*

*Date:* ${currentDate}
*Total Drivers:* ${driverCount}

⚠️ Multiple drivers have overdue rent payments. Please ensure all drivers submit their payments immediately to avoid penalties.

*Deadline Information:*
• Morning Shift: 5:00 PM same day
• Night/24hr Shift: 5:00 AM next day

Please contact the admin team if you have any questions.`;

      case "pending_verification":
        return `⏳ *Bulk Payment Verification Update*

*Date:* ${currentDate}
*Total Drivers:* ${driverCount}

Multiple rent payments are currently under review. All drivers will be notified once their payments are verified.

Please keep this message for your records.`;

      case "not_joined":
        return `📝 *Bulk Rent Payment Reminder*

*Date:* ${currentDate}
*Total Drivers:* ${driverCount}

This is a friendly reminder to all drivers to submit their rent payments. Please ensure you complete your payment submission as soon as possible.

*Deadline:*
• Morning Shift: 5:00 PM same day
• Night/24hr Shift: 5:00 AM next day`;

      case "leave":
        return `🏖️ *Bulk Leave Status Update*

*Date:* ${currentDate}
*Total Drivers:* ${driverCount}

Multiple drivers are currently on approved leave. Please ensure you're back and ready to work on your next scheduled shift.`;

      case "offline":
        return `📴 *Bulk Driver Status Update*

*Date:* ${currentDate}
*Total Drivers:* ${driverCount}

Multiple drivers are currently offline. Please contact the admin team when you're ready to resume work.`;

      default:
        return `📋 *Bulk Status Update*

*Date:* ${currentDate}
*Total Drivers:* ${driverCount}
*Status:* ${status}

Please check your rent status and take necessary action if required.`;
    }
  };

  const handleBulkWhatsAppShare = async () => {
    if (drivers.length === 0) {
      toast.error("No drivers selected");
      return;
    }

    setIsLoading(true);

    try {
      // Get unique phone numbers from drivers
      const driverIds = [...new Set(drivers.map((d) => d.userId))];

      const { data: usersData, error } = await supabase
        .from("users")
        .select("id, phone_number")
        .in("id", driverIds);

      if (error) {
        throw error;
      }

      const validPhoneNumbers =
        usersData
          ?.filter((user) => user.phone_number)
          .map((user) => {
            let formattedPhone = user.phone_number.replace(/\D/g, "");
            if (
              !formattedPhone.startsWith("91") &&
              formattedPhone.length === 10
            ) {
              formattedPhone = "91" + formattedPhone;
            }
            return formattedPhone;
          }) || [];

      if (validPhoneNumbers.length === 0) {
        toast.error("No valid phone numbers found for selected drivers");
        return;
      }

      const message = getBulkStatusMessage(status, drivers.length);
      const encodedMessage = encodeURIComponent(message);

      // For bulk sharing, we'll open WhatsApp with the first phone number
      // In a real implementation, you might want to send to all numbers
      const firstPhoneNumber = validPhoneNumbers[0];
      const whatsappUrl = `https://wa.me/${firstPhoneNumber}?text=${encodedMessage}`;

      window.open(whatsappUrl, "_blank");

      toast.success(
        `Opening WhatsApp for bulk message to ${validPhoneNumbers.length} drivers`
      );
    } catch (error) {
      console.error("Error in bulk WhatsApp share:", error);
      toast.error("Failed to send bulk WhatsApp message");
    } finally {
      setIsLoading(false);
    }
  };

  if (drivers.length === 0) {
    return null;
  }

  return (
    <Button
      onClick={handleBulkWhatsAppShare}
      variant="outline"
      size="sm"
      disabled={isLoading}
      className={`text-green-600 border-green-600 hover:bg-green-50 ${className}`}
      title={`Send bulk WhatsApp message to ${drivers.length} drivers with ${status} status`}
    >
      <Users className="h-4 w-4 mr-2" />
      {isLoading ? "Sending..." : `Bulk Share (${drivers.length})`}
    </Button>
  );
};
