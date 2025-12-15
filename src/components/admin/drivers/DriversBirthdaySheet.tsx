import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, Users, Gift, Cake } from "lucide-react";
import {
  format,
  parseISO,
  isToday,
  isTomorrow,
  addDays,
  isSameDay,
} from "date-fns";
import { toast } from "sonner";

interface Driver {
  id: string;
  name: string;
  email_id: string;
  phone_number: string;
  date_of_birth: string;
  vehicle_number?: string;
  shift?: string;
  online: boolean;
  profile_photo?: string;
}

const DriversBirthdaySheet = () => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchDrivers();
    }
  }, [isOpen]);

  const fetchDrivers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("users")
        .select(
          "id, name, email_id, phone_number, date_of_birth, vehicle_number, shift, online, profile_photo"
        )
        .not("date_of_birth", "is", null)
        .order("name");

      if (error) throw error;
      setDrivers(data || []);
    } catch (error) {
      console.error("Error fetching drivers:", error);
      toast.error("Failed to load drivers' birthday data");
    } finally {
      setLoading(false);
    }
  };

  const getUpcomingBirthdays = () => {
    const today = new Date();
    const next30Days = addDays(today, 7);

    return drivers
      .filter((driver) => {
        if (!driver.date_of_birth) return false;

        const dob = parseISO(driver.date_of_birth);
        const thisYearBirthday = new Date(
          today.getFullYear(),
          dob.getMonth(),
          dob.getDate()
        );
        const nextYearBirthday = new Date(
          today.getFullYear() + 1,
          dob.getMonth(),
          dob.getDate()
        );

        // If this year's birthday has passed, check next year's
        const birthdayToCheck =
          thisYearBirthday < today ? nextYearBirthday : thisYearBirthday;

        return birthdayToCheck <= next30Days;
      })
      .sort((a, b) => {
        const dobA = parseISO(a.date_of_birth);
        const dobB = parseISO(b.date_of_birth);

        const birthdayA = new Date(
          today.getFullYear(),
          dobA.getMonth(),
          dobA.getDate()
        );
        const birthdayB = new Date(
          today.getFullYear(),
          dobB.getMonth(),
          dobB.getDate()
        );

        // If birthday has passed this year, use next year
        const checkA =
          birthdayA < today
            ? new Date(today.getFullYear() + 1, dobA.getMonth(), dobA.getDate())
            : birthdayA;
        const checkB =
          birthdayB < today
            ? new Date(today.getFullYear() + 1, dobB.getMonth(), dobB.getDate())
            : birthdayB;

        return checkA.getTime() - checkB.getTime();
      });
  };

  const getBirthdayStatus = (dateOfBirth: string) => {
    const today = new Date();
    const dob = parseISO(dateOfBirth);
    const thisYearBirthday = new Date(
      today.getFullYear(),
      dob.getMonth(),
      dob.getDate()
    );
    const nextYearBirthday = new Date(
      today.getFullYear() + 1,
      dob.getMonth(),
      dob.getDate()
    );

    const birthdayToCheck =
      thisYearBirthday < today ? nextYearBirthday : thisYearBirthday;

    if (isToday(birthdayToCheck)) {
      return {
        status: "today",
        label: "Today",
        color: "bg-red-500 text-white",
      };
    } else if (isTomorrow(birthdayToCheck)) {
      return {
        status: "tomorrow",
        label: "Tomorrow",
        color: "bg-orange-500 text-white",
      };
    } else {
      const daysUntil = Math.ceil(
        (birthdayToCheck.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );
      return {
        status: "upcoming",
        label: `${daysUntil} days`,
        color: "bg-blue-500 text-white",
      };
    }
  };

  const formatBirthday = (dateOfBirth: string) => {
    const dob = parseISO(dateOfBirth);
    return format(dob, "dd MMM yyyy");
  };

  const upcomingBirthdays = getUpcomingBirthdays();

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <Cake className="h-4 w-4" />
          Drivers Birthday
          {upcomingBirthdays.length > 0 && (
            <Badge variant="destructive" className="ml-1">
              {upcomingBirthdays.length}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Cake className="h-5 w-5" />
            Drivers Birthday Sheet
          </SheetTitle>
          <SheetDescription>
            View upcoming birthdays and driver details
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : upcomingBirthdays.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <Gift className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  No upcoming birthdays in the next 30 days
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3 max-h-[700px] overflow-y-auto">
              {upcomingBirthdays.map((driver) => {
                const birthdayStatus = getBirthdayStatus(driver.date_of_birth);

                return (
                  <Card
                    key={driver.id}
                    className="hover:shadow-md transition-shadow "
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage
                            src={driver.profile_photo || undefined}
                          />
                          <AvatarFallback>
                            {driver.name?.charAt(0) || "D"}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-sm truncate">
                              {driver.name}
                            </h3>
                            <Badge
                              variant="outline"
                              className={birthdayStatus.color}
                            >
                              {birthdayStatus.label}
                            </Badge>
                          </div>

                          <div className="text-xs text-muted-foreground space-y-1">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>
                                DOB: {formatBirthday(driver.date_of_birth)}
                              </span>
                            </div>

                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              <span>
                                {driver.vehicle_number || "No vehicle"} •{" "}
                                {driver.shift || "No shift"}
                              </span>
                            </div>

                            <div className="flex items-center gap-1">
                              <span
                                className={
                                  driver.online
                                    ? "text-green-600"
                                    : "text-red-600"
                                }
                              >
                                {driver.online ? "● Online" : "○ Offline"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {drivers.length > 0 && (
            <Card className="mt-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">All Drivers with DOB</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  Total drivers with DOB: {drivers.length}
                </div>
                <div className="text-sm text-muted-foreground">
                  Upcoming birthdays: {upcomingBirthdays.length}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default DriversBirthdaySheet;
