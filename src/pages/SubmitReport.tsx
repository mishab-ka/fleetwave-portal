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

const formSchema = z.object({
  vehicle_number: z.string().min(2, {
    message: "Vehicle number must be at least 2 characters.",
  }),
  shift: z.enum(["morning", "evening"]).default("morning"),
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

  const { reset } = form;

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
      } catch (error) {
        console.error("Error fetching user profile:", error);
        toast.error("Failed to load profile data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserProfile();
  }, [user]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-fleet-purple"></div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      if (!user) {
        toast.error('You need to be logged in to submit a report');
        return;
      }
      
      const reportData = {
        user_id: user.id,
        driver_name: profileData?.name || user.email,
        vehicle_number: form.getValues('vehicle_number'),
        submission_date: new Date().toISOString().split('T')[0],
        rent_date: new Date().toISOString().split('T')[0],
        shift: form.getValues('shift'),
        total_trips: form.getValues('total_trips'),
        total_earnings: form.getValues('total_earnings'),
        total_cashcollect: form.getValues('total_cashcollect'),
        rent_paid_amount: form.getValues('rent_paid_amount'),
        rent_paid_status: form.getValues('rent_paid_status'),
        remarks: form.getValues('remarks'),
        uber_screenshot: form.getValues('uber_screenshot'),
        payment_screenshot: form.getValues('payment_screenshot'),
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
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
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
                        <SelectItem value="morning">Morning</SelectItem>
                        <SelectItem value="evening">Evening</SelectItem>
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
                      <Input type="number" placeholder="Enter total trips" {...field} />
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
                      <Input type="number" placeholder="Enter total earnings" {...field} />
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
                      <Input type="number" placeholder="Enter total cash collected" {...field} />
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
                      <Input type="number" placeholder="Enter rent paid amount" {...field} />
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
                        placeholder="Enter any remarks"
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
