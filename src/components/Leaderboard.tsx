
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Trophy, ArrowUp, Medal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface LeaderboardEntry {
  id: string;
  rank: number;
  score: number;
  total_earnings: number;
  total_trips: number;
  on_time_payments: number;
  user_id: string;
  user?: {
    name: string | null;
    profile_photo: string | null;
    driver_id: string | null;
    vehicle_number: string | null;
  } | null;
}

export const Leaderboard = () => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchLeaderboard();
  }, []);
  
  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      
      // Get the leaderboard entries
      const { data: leaderboardData, error: leaderboardError } = await supabase
        .from('weekly_leaderboard')
        .select('*')
        .order('rank', { ascending: true })
        .limit(10);
        
      if (leaderboardError) throw leaderboardError;
      
      if (leaderboardData && leaderboardData.length > 0) {
        // Get all user IDs from leaderboard
        const userIds = leaderboardData.map(entry => entry.user_id);
        
        // Fetch user details for these IDs
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, name, profile_photo, driver_id, vehicle_number')
          .in('id', userIds);
          
        if (userError) throw userError;
        
        // Combine leaderboard data with user data
        const combinedData = leaderboardData.map(entry => {
          const user = userData?.find(u => u.id === entry.user_id);
          return { ...entry, user };
        });
        
        setEntries(combinedData);
      } else {
        setEntries([]);
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      toast.error('Failed to load leaderboard data');
    } finally {
      setLoading(false);
    }
  };
  
  const getRankDisplay = (rank: number) => {
    switch(rank) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Trophy className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Trophy className="h-5 w-5 text-amber-700" />;
      default:
        return <span className="text-sm font-medium">{rank}</span>;
    }
  };
  
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Weekly Leaderboard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-fleet-purple"></div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Weekly Leaderboard</CardTitle>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No leaderboard data available yet.
          </div>
        ) : (
          <div className="space-y-4">
            {entries.map((entry, index) => (
              <div key={entry.id} className="flex items-center space-x-3">
                <div className="flex-shrink-0 w-8 flex justify-center">
                  {getRankDisplay(entry.rank || index + 1)}
                </div>
                
                <Avatar className="h-10 w-10">
                  <AvatarImage src={entry.user?.profile_photo || undefined} />
                  <AvatarFallback>{entry.user?.name?.charAt(0) || 'U'}</AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{entry.user?.name || 'Unknown Driver'}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {entry.user?.vehicle_number || 'No Vehicle'} • {entry.user?.driver_id || 'No ID'}
                  </p>
                </div>
                
                <div className="flex flex-col items-end">
                  <div className="flex items-center">
                    <Medal className="h-3 w-3 mr-1 text-fleet-purple" />
                    <span className="text-sm font-medium">{entry.score}</span>
                  </div>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <ArrowUp className="h-3 w-3 mr-1 text-green-500" />
                    <span>₹{entry.total_earnings.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
