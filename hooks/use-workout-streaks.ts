/**
 * Workout Streaks Hook
 * Calculate current and longest workout completion streaks
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastWorkoutDate: string | null;
}

/**
 * Calculate workout streaks from completed sessions
 */
export function useWorkoutStreaks() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['workout-streaks', user?.id],
    queryFn: async (): Promise<StreakData> => {
      if (!user) {
        return { currentStreak: 0, longestStreak: 0, lastWorkoutDate: null };
      }

      // Fetch all completed workout sessions, ordered by date
      const { data: sessions, error } = await supabase
        .from('user_workout_sessions')
        .select('started_at, completed_at')
        .eq('user_id', user.id)
        .not('completed_at', 'is', null)
        .order('started_at', { ascending: false });

      if (error) throw error;

      if (!sessions || sessions.length === 0) {
        return { currentStreak: 0, longestStreak: 0, lastWorkoutDate: null };
      }

      // Group sessions by date (ignore time)
      const dateSet = new Set<string>();
      sessions.forEach((session) => {
        const date = new Date(session.started_at).toISOString().split('T')[0];
        dateSet.add(date);
      });

      // Convert to sorted array (newest first)
      const uniqueDates = Array.from(dateSet).sort((a, b) => b.localeCompare(a));

      // Calculate current streak
      let currentStreak = 0;
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

      // Start from today or yesterday (allow 1 day gap)
      let streakDate = uniqueDates[0] === today || uniqueDates[0] === yesterday
        ? new Date(uniqueDates[0])
        : null;

      if (streakDate) {
        currentStreak = 1;

        // Count consecutive days backwards
        for (let i = 1; i < uniqueDates.length; i++) {
          const currentDate = new Date(uniqueDates[i]);
          const expectedDate = new Date(streakDate);
          expectedDate.setDate(expectedDate.getDate() - 1);

          // Check if this date is exactly 1 day before the previous date
          if (currentDate.toISOString().split('T')[0] === expectedDate.toISOString().split('T')[0]) {
            currentStreak++;
            streakDate = currentDate;
          } else {
            // Streak broken
            break;
          }
        }
      }

      // Calculate longest streak
      let longestStreak = currentStreak;
      let tempStreak = 1;

      for (let i = 0; i < uniqueDates.length - 1; i++) {
        const currentDate = new Date(uniqueDates[i]);
        const nextDate = new Date(uniqueDates[i + 1]);
        const dayDiff = Math.floor((currentDate.getTime() - nextDate.getTime()) / 86400000);

        if (dayDiff === 1) {
          // Consecutive days
          tempStreak++;
          longestStreak = Math.max(longestStreak, tempStreak);
        } else {
          // Streak broken, reset
          tempStreak = 1;
        }
      }

      return {
        currentStreak,
        longestStreak: Math.max(longestStreak, currentStreak),
        lastWorkoutDate: uniqueDates[0] || null,
      };
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
