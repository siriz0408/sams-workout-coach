/**
 * React Query Hooks for Activity Logging
 * Handles BJJ, softball, and other activity tracking for recovery analysis
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';

export type ActivityType = 'bjj' | 'softball' | 'other';
export type IntensityLevel = 'light' | 'moderate' | 'hard';

export interface ActivityLog {
  id: string;
  user_id: string;
  activity_type: ActivityType;
  date: string;
  intensity: IntensityLevel;
  duration_minutes: number | null;
  notes: string | null;
  created_at: string;
}

export interface RecoveryContext {
  recent_activities: ActivityLog[];
  days_since_last_hard: number | null;
  weekly_intensity_score: number;
  needs_recovery: boolean;
  recommendation: string;
}

/**
 * Fetch recent activity logs
 */
export function useRecentActivities(limit: number = 14) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['activity-logs', user?.id, limit],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as ActivityLog[];
    },
    enabled: !!user,
  });
}

/**
 * Fetch activities for a date range (for calendar view)
 */
export function useActivityCalendar(startDate: string, endDate: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['activity-calendar', user?.id, startDate, endDate],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true });

      if (error) throw error;
      return data as ActivityLog[];
    },
    enabled: !!user,
  });
}

/**
 * Fetch activities for a specific date
 */
export function useActivitiesByDate(date: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['activities-by-date', user?.id, date],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', date)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as ActivityLog[];
    },
    enabled: !!user,
  });
}

/**
 * Get recovery context for AI recommendations
 * Returns recent activities and calculates recovery needs
 */
export function useRecoveryContext() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['recovery-context', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');

      // Get activities from last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const startDate = sevenDaysAgo.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', startDate)
        .order('date', { ascending: false });

      if (error) throw error;

      const recent_activities = data as ActivityLog[];

      // Calculate recovery metrics
      const now = new Date();
      let days_since_last_hard: number | null = null;
      let weekly_intensity_score = 0;

      // Intensity scoring: light = 1, moderate = 2, hard = 3
      const intensityScores = { light: 1, moderate: 2, hard: 3 };

      recent_activities.forEach((activity) => {
        const activityDate = new Date(activity.date);
        const daysSince = Math.floor((now.getTime() - activityDate.getTime()) / (1000 * 60 * 60 * 24));

        // Track days since last hard session
        if (activity.intensity === 'hard' && days_since_last_hard === null) {
          days_since_last_hard = daysSince;
        }

        // Calculate weekly intensity score
        weekly_intensity_score += intensityScores[activity.intensity];
      });

      // Determine if user needs recovery
      // Needs recovery if: less than 1 day since hard session OR weekly intensity > 15
      const needs_recovery = (days_since_last_hard !== null && days_since_last_hard < 1) || weekly_intensity_score > 15;

      let recommendation = '';
      if (needs_recovery) {
        if (days_since_last_hard !== null && days_since_last_hard < 1) {
          recommendation = 'Recent hard session detected. Consider lower intensity or rest.';
        } else {
          recommendation = 'High weekly intensity. Consider a deload or active recovery.';
        }
      } else {
        recommendation = 'Recovery looks good. Ready for normal training intensity.';
      }

      return {
        recent_activities,
        days_since_last_hard,
        weekly_intensity_score,
        needs_recovery,
        recommendation,
      } as RecoveryContext;
    },
    enabled: !!user,
  });
}

/**
 * Get this week's activity stats
 */
export function useWeeklyActivityStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['weekly-activity-stats', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');

      // Get current week (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const startDate = sevenDaysAgo.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', startDate);

      if (error) throw error;

      const activities = data as ActivityLog[];

      // Calculate stats
      const total_sessions = activities.length;
      const bjj_sessions = activities.filter(a => a.activity_type === 'bjj').length;
      const softball_sessions = activities.filter(a => a.activity_type === 'softball').length;
      const total_minutes = activities.reduce((sum, a) => sum + (a.duration_minutes || 0), 0);

      // Calculate average intensity (1=light, 2=moderate, 3=hard)
      const intensityScores = { light: 1, moderate: 2, hard: 3 };
      const avg_intensity = total_sessions > 0
        ? activities.reduce((sum, a) => sum + intensityScores[a.intensity], 0) / total_sessions
        : 0;

      let intensity_label = 'None';
      if (avg_intensity >= 2.5) intensity_label = 'Hard';
      else if (avg_intensity >= 1.5) intensity_label = 'Moderate';
      else if (avg_intensity > 0) intensity_label = 'Light';

      return {
        total_sessions,
        bjj_sessions,
        softball_sessions,
        total_minutes,
        avg_intensity: Math.round(avg_intensity * 10) / 10,
        intensity_label,
      };
    },
    enabled: !!user,
  });
}

/**
 * Log a new activity
 */
export function useLogActivity() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (activity: {
      activity_type: ActivityType;
      date: string;
      intensity: IntensityLevel;
      duration_minutes?: number;
      notes?: string;
    }) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('activity_logs')
        .insert({
          user_id: user.id,
          activity_type: activity.activity_type,
          date: activity.date,
          intensity: activity.intensity,
          duration_minutes: activity.duration_minutes ?? null,
          notes: activity.notes ?? null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as ActivityLog;
    },
    onSuccess: (data) => {
      // Invalidate all activity-related queries
      queryClient.invalidateQueries({ queryKey: ['activity-logs', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['activity-calendar', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['activities-by-date', user?.id, data.date] });
      queryClient.invalidateQueries({ queryKey: ['recovery-context', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['weekly-activity-stats', user?.id] });
    },
  });
}

/**
 * Update an activity log
 */
export function useUpdateActivity() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: {
      id: string;
      activity_type?: ActivityType;
      date?: string;
      intensity?: IntensityLevel;
      duration_minutes?: number;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('activity_logs')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as ActivityLog;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['activity-logs', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['activity-calendar', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['activities-by-date', user?.id, data.date] });
      queryClient.invalidateQueries({ queryKey: ['recovery-context', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['weekly-activity-stats', user?.id] });
    },
  });
}

/**
 * Delete an activity log
 */
export function useDeleteActivity() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('activity_logs')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activity-logs', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['activity-calendar', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['recovery-context', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['weekly-activity-stats', user?.id] });
    },
  });
}
