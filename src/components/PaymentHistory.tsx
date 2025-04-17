
import React from "react";
import { useAuth } from "@/context/AuthContext";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IndianRupee, Calendar } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

const PaymentHistory = () => {
  const { user } = useAuth();

  const { data: rentHistory, isLoading } = useQuery({
    queryKey: ['rentHistory', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rent_history')
        .select('*')
        .eq('user_id', user?.id)
        .order('rent_date', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-fleet-purple" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Shift</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Online Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rentHistory?.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        {format(new Date(record.rent_date), 'dd MMM yyyy')}
                      </div>
                    </TableCell>
                    <TableCell className="capitalize">{record.shift}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={
                          record.payment_status === 'paid' ? 'success' :
                          record.payment_status === 'pending' ? 'warning' :
                          'destructive'
                        }
                      >
                        {record.payment_status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={record.is_online ? 'success' : 'secondary'}
                      >
                        {record.is_online ? 'Online' : 'Offline'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}

                {(!rentHistory || rentHistory.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      No payment history found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentHistory;
