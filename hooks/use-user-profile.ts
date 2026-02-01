/**
 * React Query Hooks for User Profile and Measurements
 * Handles user profile data and body measurements
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';

export interface UserProfile {
  id: string;
  current_weight: number | null;
  goal_weight: number | null;
  height: number | null;
  age: number | null;
  daily_calorie_target: number | null;
  created_at: string;
  updated_at: string;
}

export interface BodyMeasurement {
  id: string;
  user_id: string;
  measured_at: string;
  weight: number;
  body_fat_pct: number | null;
  additional_measurements: any;
}

/**
 * Fetch user profile
 */
export function useUserProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data as UserProfile | null;
    },
    enabled: !!user,
  });
}

/**
 * Create or update user profile
 */
export function useSaveUserProfile() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (profile: {
      current_weight?: number;
      goal_weight?: number;
      height?: number;
      age?: number;
      daily_calorie_target?: number;
    }) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('user_profiles')
        .upsert({
          id: user.id,
          ...profile,
        })
        .select()
        .single();

      if (error) throw error;
      return data as UserProfile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile', user?.id] });
    },
  });
}

/**
 * Fetch body measurements (weight tracking)
 */
export function useBodyMeasurements(limit: number = 30) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['body-measurements', user?.id, limit],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('body_measurements')
        .select('*')
        .eq('user_id', user.id)
        .order('measured_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as BodyMeasurement[];
    },
    enabled: !!user,
  });
}

/**
 * Log a weight measurement
 */
export function useLogWeight() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (measurement: {
      weight: number;
      body_fat_pct?: number;
      measured_at?: Date;
    }) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('body_measurements')
        .insert({
          user_id: user.id,
          weight: measurement.weight,
          body_fat_pct: measurement.body_fat_pct ?? null,
          measured_at: measurement.measured_at?.toISOString() ?? new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Also update current_weight in user_profiles
      await supabase
        .from('user_profiles')
        .update({ current_weight: measurement.weight })
        .eq('id', user.id);

      return data as BodyMeasurement;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['body-measurements', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['user-profile', user?.id] });
    },
  });
}

/**
 * Get weight trend (last N days)
 */
export function useWeightTrend(days: number = 30) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['weight-trend', user?.id, days],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('body_measurements')
        .select('weight, measured_at')
        .eq('user_id', user.id)
        .gte('measured_at', startDate.toISOString())
        .order('measured_at', { ascending: true });

      if (error) throw error;

      // Calculate trend
      const measurements = data as { weight: number; measured_at: string }[];

      if (measurements.length < 2) {
        return {
          measurements,
          trend: 0,
          trendDescription: 'Insufficient data',
        };
      }

      const firstWeight = measurements[0].weight;
      const lastWeight = measurements[measurements.length - 1].weight;
      const daysDiff = days;

      const weeklyTrend = ((lastWeight - firstWeight) / daysDiff) * 7;

      return {
        measurements,
        trend: weeklyTrend,
        trendDescription:
          weeklyTrend < -0.1
            ? `Losing ${Math.abs(weeklyTrend).toFixed(1)} lbs/week`
            : weeklyTrend > 0.1
            ? `Gaining ${weeklyTrend.toFixed(1)} lbs/week`
            : 'Maintaining weight',
      };
    },
    enabled: !!user,
  });
}
