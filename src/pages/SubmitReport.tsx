
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tables } from "@/integrations/supabase/types";
import { format, isAfter, addMinutes } from 'date-fns';

const formSchema = z.object({
  vehicle_number: z.string().min(2, {
    message: "Vehicle number must be at least 2 characters.",
  }),
  shift: z.enum(["morning", "night", "24hr"]).default("morning"),
  total_trips: z.number().min(0, {
    message: "Total trips must be a non-negative number.",
  }).default(0),
  total_earnings: z.number().min(0, {
    message: "Total earnings must be a non-negative number.",
  }).default(0),
  total_cashcollect: z.number().min(0, {
    message: "Total cash collected must be a non-negative number.",
  }).default(0),
  rent_paid_amount: z.number().min(0, {
    message: "Rent paid amount must be a non-negative number.",
  }).default(0),
  rent_paid_status: z.enum(["paid", "pending"]).default("pending"),
  remarks: z.string().optional(),
  uber_screenshot: z.string().url({ message: "Uber screenshot must be a valid URL." }).optional(),
  payment_screenshot: z.string().url({ message: "Payment screenshot must be a valid URL." }).optional(),
});

type FormData = z.infer<typeof formSchema>;

const SubmitReport = () => {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState<Tables<"users"> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setSubmitting] = useState(false);
  const [isOverdue, setIsOverdue] = useState(false);
  const navigate = useNavigate();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      vehicle_number: "",
      shift: "morning",
      total_trips: 0,
      total_earnings: 0,
      total_cashcollect: 0,
      rent_paid_amount: 0,
      rent_paid_status: "pending",
      remarks: "",
      uber_screenshot: "",
      payment_screenshot: "",
    },
  });

  const { reset, setValue } = form;

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

        // Set default shift from user profile
        if (data?.shift) {
          setValue("shift", data.shift as "morning" | "night" | "24hr");
        }
        
        // Set default vehicle number if available
        if (data?.vehicle_number) {
          setValue("vehicle_number", data.vehicle_number);
        }

        // Check if report is overdue
        checkIfOverdue(data?.shift || "morning");
      } catch (error) {
        console.error("Error fetching user profile:", error);
        toast.error("Failed to load profile data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserProfile();
  }, [user, setValue]);

  const checkIfOverdue = (shift: string) => {
    const now = new Date();
    let deadlineTime: Date;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (shift === "morning") {
      deadlineTime = new Date(today);
      deadlineTime.setHours(16, 30, 0, 0); // 4:30 PM
    } else if (shift === "night") {
      const nextDay = new Date(today);
      nextDay.setDate(nextDay.getDate() + 1);
      nextDay.setHours(4, 30, 0, 0); // 4:30 AM next day
      deadlineTime = nextDay;
    } else { // 24hr
      const nextDay = new Date(today);
      nextDay.setDate(nextDay.getDate() + 1);
      nextDay.setHours(4, 30, 0, 0); // 4:30 AM next day
      deadlineTime = nextDay;
    }
    
    setIsOverdue(isAfter(now, deadlineTime));
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-fleet-purple"></div>
      </div>
    );
  }

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    
    try {
      if (!user) {
        toast.error('You need to be logged in to submit a report');
        return;
      }
      
      const today = new Date();
      let status = "pending_verification";
      
      // Check if submission is overdue
      if (isOverdue) {
        status = "overdue";
      }
      
      const reportData = {
        user_id: user.id,
        driver_name: profileData?.name || user.email,
        vehicle_number: data.vehicle_number,
        submission_date: today.toISOString(),
        rent_date: format(today, 'yyyy-MM-dd'),
        shift: data.shift,
        total_trips: data.total_trips,
        total_earnings: data.total_earnings,
        total_cashcollect: data.total_cashcollect,
        rent_paid_amount: data.rent_paid_amount,
        rent_paid_status: data.rent_paid_status === 'paid',
        remarks: data.remarks,
        uber_screenshot: data.uber_screenshot,
        payment_screenshot: data.payment_screenshot,
        status: status
      };
      
      const { error } = await supabase
        .from('fleet_reports')
        .insert(reportData);
        
      if (error) throw error;
      
      reset();
      toast.success('Report submitted successfully!');
      navigate('/profile');
    } catch (error) {
      console.error('Error submitting report:', error);
      toast.error('Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Submit Report</CardTitle>
          {isOverdue && (
            <div className="bg-red-100 text-red-700 p-2 mt-2 rounded-md text-sm">
              Your submission is past the deadline. This will be marked as overdue.
            </div>
          )}
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="vehicle_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vehicle Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter vehicle number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="shift"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Shift</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a shift" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="morning">Morning (4AM-4PM)</SelectItem>
                        <SelectItem value="night">Night (4PM-4AM)</SelectItem>
                        <SelectItem value="24hr">24 Hours (4AM-4AM)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="total_trips"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Trips</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="Enter total trips" 
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="total_earnings"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Earnings</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="Enter total earnings" 
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="total_cashcollect"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Cash Collect</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="Enter total cash collected" 
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="rent_paid_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rent Paid Amount</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="Enter rent paid amount" 
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="rent_paid_status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rent Paid Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select rent paid status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="remarks"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Remarks</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter any remarks (type 'leave' for leave day)"
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="uber_screenshot"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Uber Screenshot URL</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter Uber screenshot URL" type="url" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="payment_screenshot"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Screenshot URL</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter Payment screenshot URL" type="url" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : "Submit Report"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubmitReport;
