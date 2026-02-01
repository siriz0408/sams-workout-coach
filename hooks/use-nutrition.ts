/**
 * React Query Hooks for Nutrition Tracking
 * Handles meal logging, daily nutrition totals, and adherence tracking
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';

export interface NutritionLog {
  id: string;
  user_id: string;
  date: string;
  calories: number;
  protein: number | null;
  carbs: number | null;
  fats: number | null;
  meal_name: string | null;
  target_status: 'under' | 'on_track' | 'over' | null;
  notes: string | null;
  created_at: string;
}

export interface DailyNutritionSummary {
  date: string;
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fats: number;
  meal_count: number;
  meals: string[];
  target_calories: number;
  target_status: 'under' | 'on_track' | 'over';
}

export interface WeeklyAdherence {
  days_on_track: number;
  days_under: number;
  days_over: number;
  total_days: number;
  adherence_pct: number;
  avg_calories: number;
  avg_protein: number;
}

/**
 * Fetch recent meal logs
 */
export function useRecentMeals(limit: number = 10) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['nutrition-logs', user?.id, limit],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('nutrition_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as NutritionLog[];
    },
    enabled: !!user,
  });
}

/**
 * Fetch meals for a specific date
 */
export function useMealsByDate(date: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['nutrition-logs-by-date', user?.id, date],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('nutrition_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', date)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as NutritionLog[];
    },
    enabled: !!user,
  });
}

/**
 * Fetch daily nutrition totals for a specific date
 */
export function useDailyNutrition(date: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['daily-nutrition', user?.id, date],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');

      // Fetch user's target calories
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('daily_calorie_target')
        .eq('id', user.id)
        .single();

      const targetCalories = profile?.daily_calorie_target || 2000;

      // Fetch meals for the date
      const { data: meals, error } = await supabase
        .from('nutrition_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', date);

      if (error) throw error;

      // Calculate totals
      const total_calories = meals.reduce((sum, meal) => sum + meal.calories, 0);
      const total_protein = meals.reduce((sum, meal) => sum + (meal.protein || 0), 0);
      const total_carbs = meals.reduce((sum, meal) => sum + (meal.carbs || 0), 0);
      const total_fats = meals.reduce((sum, meal) => sum + (meal.fats || 0), 0);

      // Calculate target status (within 10% tolerance)
      let target_status: 'under' | 'on_track' | 'over';
      if (total_calories < targetCalories * 0.9) {
        target_status = 'under';
      } else if (total_calories > targetCalories * 1.1) {
        target_status = 'over';
      } else {
        target_status = 'on_track';
      }

      return {
        date,
        total_calories,
        total_protein,
        total_carbs,
        total_fats,
        meal_count: meals.length,
        meals: meals.map(m => m.meal_name).filter(Boolean),
        target_calories: targetCalories,
        target_status,
      } as DailyNutritionSummary;
    },
    enabled: !!user,
  });
}

/**
 * Fetch weekly adherence (last 7 days)
 */
export function useWeeklyAdherence() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['weekly-adherence', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');

      // Fetch user's target calories
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('daily_calorie_target')
        .eq('id', user.id)
        .single();

      const targetCalories = profile?.daily_calorie_target || 2000;

      // Get last 7 days of nutrition logs
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const startDate = sevenDaysAgo.toISOString().split('T')[0];

      const { data: logs, error } = await supabase
        .from('nutrition_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', startDate)
        .order('date', { ascending: true });

      if (error) throw error;

      // Group by date
      const dailyTotals = logs.reduce((acc, log) => {
        if (!acc[log.date]) {
          acc[log.date] = { calories: 0, protein: 0 };
        }
        acc[log.date].calories += log.calories;
        acc[log.date].protein += log.protein || 0;
        return acc;
      }, {} as Record<string, { calories: number; protein: number }>);

      // Calculate adherence
      let days_on_track = 0;
      let days_under = 0;
      let days_over = 0;
      let total_calories = 0;
      let total_protein = 0;
      const dates = Object.keys(dailyTotals);

      dates.forEach(date => {
        const { calories, protein } = dailyTotals[date];
        total_calories += calories;
        total_protein += protein;

        if (calories < targetCalories * 0.9) {
          days_under++;
        } else if (calories > targetCalories * 1.1) {
          days_over++;
        } else {
          days_on_track++;
        }
      });

      const total_days = dates.length;
      const adherence_pct = total_days > 0 ? (days_on_track / total_days) * 100 : 0;
      const avg_calories = total_days > 0 ? Math.round(total_calories / total_days) : 0;
      const avg_protein = total_days > 0 ? Math.round(total_protein / total_days) : 0;

      return {
        days_on_track,
        days_under,
        days_over,
        total_days,
        adherence_pct: Math.round(adherence_pct),
        avg_calories,
        avg_protein,
      } as WeeklyAdherence;
    },
    enabled: !!user,
  });
}

/**
 * Log a meal
 */
export function useLogMeal() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (meal: {
      date: string;
      meal_name: string;
      calories: number;
      protein?: number;
      carbs?: number;
      fats?: number;
      notes?: string;
    }) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('nutrition_logs')
        .insert({
          user_id: user.id,
          date: meal.date,
          meal_name: meal.meal_name,
          calories: meal.calories,
          protein: meal.protein ?? null,
          carbs: meal.carbs ?? null,
          fats: meal.fats ?? null,
          notes: meal.notes ?? null,
          target_status: null, // Will be calculated in the view
        })
        .select()
        .single();

      if (error) throw error;
      return data as NutritionLog;
    },
    onSuccess: (data) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['nutrition-logs', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['nutrition-logs-by-date', user?.id, data.date] });
      queryClient.invalidateQueries({ queryKey: ['daily-nutrition', user?.id, data.date] });
      queryClient.invalidateQueries({ queryKey: ['weekly-adherence', user?.id] });
    },
  });
}

/**
 * Update a nutrition log
 */
export function useUpdateMeal() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: {
      id: string;
      meal_name?: string;
      calories?: number;
      protein?: number;
      carbs?: number;
      fats?: number;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('nutrition_logs')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as NutritionLog;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['nutrition-logs', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['nutrition-logs-by-date', user?.id, data.date] });
      queryClient.invalidateQueries({ queryKey: ['daily-nutrition', user?.id, data.date] });
      queryClient.invalidateQueries({ queryKey: ['weekly-adherence', user?.id] });
    },
  });
}

/**
 * Delete a nutrition log
 */
export function useDeleteMeal() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('nutrition_logs')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nutrition-logs', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['daily-nutrition'] });
      queryClient.invalidateQueries({ queryKey: ['weekly-adherence', user?.id] });
    },
  });
}
