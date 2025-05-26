import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { Applicant } from "@/types/hr";

interface HiringCalendarProps {
  applicants: Applicant[];
}

export default function HiringCalendar({ applicants }: HiringCalendarProps) {
  const approvedApplicants = applicants.filter(
    (app) => app.status === "approved" && app.joining_date
  );

  const getDateEvents = (date: Date) => {
    return approvedApplicants.filter((app) => {
      const joiningDate = new Date(app.joining_date!);
      return (
        joiningDate.getDate() === date.getDate() &&
        joiningDate.getMonth() === date.getMonth() &&
        joiningDate.getFullYear() === date.getFullYear()
      );
    });
  };

  const renderDayContent = (date: Date) => {
    const events = getDateEvents(date);
    if (events.length === 0) return null;

    return (
      <div className="relative">
        <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />
        <div className="absolute top-6 left-0 bg-white shadow-lg rounded-lg p-2 z-10 min-w-[200px] hidden group-hover:block">
          <div className="text-sm font-medium mb-1">{format(date, "PPP")}</div>
          <div className="space-y-1">
            {events.map((app) => (
              <div key={app.id} className="text-xs">
                {app.full_name} - {app.vehicle_type}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Joining Calendar</CardTitle>
      </CardHeader>
      <CardContent>
        <Calendar
          mode="single"
          className="rounded-md border"
          components={{
            DayContent: renderDayContent,
          }}
        />
      </CardContent>
    </Card>
  );
}
