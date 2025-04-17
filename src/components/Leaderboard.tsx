
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
import { Trophy, Award, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

const Leaderboard = () => {
  const { user } = useAuth();

  const { data: leaderboard, isLoading } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('weekly_leaderboard')
        .select(`
          *,
          users (
            name,
            profile_photo
          )
        `)
        .order('rank', { ascending: true })
        .limit(10);

      if (error) throw error;
      return data;
    },
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
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Weekly Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Rank</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead>Trips</TableHead>
                  <TableHead>Earnings</TableHead>
                  <TableHead>On-time Payments</TableHead>
                  <TableHead>Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaderboard?.map((entry) => (
                  <TableRow 
                    key={entry.id}
                    className={entry.user_id === user?.id ? "bg-muted/50" : ""}
                  >
                    <TableCell>
                      {entry.rank === 1 ? (
                        <Badge variant="success" className="flex items-center gap-1">
                          <Trophy className="h-3 w-3" />
                          1st
                        </Badge>
                      ) : entry.rank}
                    </TableCell>
                    <TableCell className="font-medium">
                      {entry.users?.name || 'Unknown Driver'}
                    </TableCell>
                    <TableCell>{entry.total_trips}</TableCell>
                    <TableCell>₹{entry.total_earnings.toLocaleString()}</TableCell>
                    <TableCell>{entry.on_time_payments}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Award className="h-3 w-3" />
                        {entry.score}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}

                {(!leaderboard || leaderboard.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No leaderboard data available for this week
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

export default Leaderboard;
