/**
 * React Query Hooks for Workout Sessions
 * Handles logging workout sessions and exercise performance
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';

export interface WorkoutSession {
  id: string;
  user_id: string;
  workout_id: string;
  started_at: string;
  completed_at: string | null;
  duration_minutes: number | null;
  subjective_rating: number | null;
  notes: string | null;
  ai_analysis: any;
  created_at: string;
}

export interface ExerciseLog {
  id: string;
  session_id: string;
  exercise_id: string;
  round_number: number;
  weight_used: number | null;
  reps_completed: number | null;
  time_completed: number | null;
  notes: string | null;
  logged_at: string;
}

/**
 * Fetch recent workout sessions
 */
export function useWorkoutSessions(limit: number = 20) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['workout-sessions', user?.id, limit],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('user_workout_sessions')
        .select(`
          *,
          workout:workouts(name)
        `)
        .eq('user_id', user.id)
        .order('started_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as (WorkoutSession & { workout: { name: string } })[];
    },
    enabled: !!user,
  });
}

/**
 * Fetch a specific workout session with exercise logs
 */
export function useWorkoutSession(sessionId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['workout-session', sessionId],
    queryFn: async () => {
      if (!sessionId) throw new Error('Session ID required');

      const { data: session, error: sessionError } = await supabase
        .from('user_workout_sessions')
        .select(`
          *,
          workout:workouts(*)
        `)
        .eq('id', sessionId)
        .single();

      if (sessionError) throw sessionError;

      const { data: logs, error: logsError } = await supabase
        .from('exercise_logs')
        .select(`
          *,
          exercise:exercises(name, muscle_groups, equipment)
        `)
        .eq('session_id', sessionId)
        .order('logged_at', { ascending: true });

      if (logsError) throw logsError;

      return {
        session: session as WorkoutSession & { workout: any },
        logs: logs as (ExerciseLog & { exercise: any })[],
      };
    },
    enabled: !!user && !!sessionId,
  });
}

/**
 * Get exercise history for a specific exercise
 */
export function useExerciseHistory(exerciseId: string | undefined, limit: number = 10) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['exercise-history', exerciseId, limit],
    queryFn: async () => {
      if (!exerciseId) throw new Error('Exercise ID required');
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('exercise_logs')
        .select(`
          *,
          session:user_workout_sessions!inner(user_id, started_at)
        `)
        .eq('exercise_id', exerciseId)
        .eq('session.user_id', user.id)
        .order('logged_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as (ExerciseLog & { session: { user_id: string; started_at: string } })[];
    },
    enabled: !!user && !!exerciseId,
  });
}

/**
 * Get last performance for an exercise
 */
export function useLastPerformance(exerciseId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['last-performance', exerciseId],
    queryFn: async () => {
      if (!exerciseId) throw new Error('Exercise ID required');
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('exercise_logs')
        .select(`
          *,
          session:user_workout_sessions!inner(user_id, started_at)
        `)
        .eq('exercise_id', exerciseId)
        .eq('session.user_id', user.id)
        .order('logged_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data as (ExerciseLog & { session: { user_id: string; started_at: string } }) | null;
    },
    enabled: !!user && !!exerciseId,
  });
}

/**
 * Start a new workout session
 */
export function useStartWorkoutSession() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (workoutId: string) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('user_workout_sessions')
        .insert({
          user_id: user.id,
          workout_id: workoutId,
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data as WorkoutSession;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout-sessions', user?.id] });
    },
  });
}

/**
 * Log an exercise set
 */
export function useLogExercise() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (log: {
      session_id: string;
      exercise_id: string;
      round_number: number;
      weight_used?: number;
      reps_completed?: number;
      time_completed?: number;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('exercise_logs')
        .insert({
          ...log,
          logged_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data as ExerciseLog;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['workout-session', data.session_id] });
      queryClient.invalidateQueries({ queryKey: ['exercise-history', data.exercise_id] });
      queryClient.invalidateQueries({ queryKey: ['last-performance', data.exercise_id] });
    },
  });
}

/**
 * Complete a workout session
 */
export function useCompleteWorkoutSession() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      sessionId,
      subjectiveRating,
      notes,
    }: {
      sessionId: string;
      subjectiveRating?: number;
      notes?: string;
    }) => {
      // Calculate duration
      const { data: session } = await supabase
        .from('user_workout_sessions')
        .select('started_at')
        .eq('id', sessionId)
        .single();

      const startedAt = new Date(session!.started_at);
      const completedAt = new Date();
      const durationMinutes = Math.round((completedAt.getTime() - startedAt.getTime()) / 60000);

      const { data, error } = await supabase
        .from('user_workout_sessions')
        .update({
          completed_at: completedAt.toISOString(),
          duration_minutes: durationMinutes,
          subjective_rating: subjectiveRating ?? null,
          notes: notes ?? null,
        })
        .eq('id', sessionId)
        .select()
        .single();

      if (error) throw error;
      return data as WorkoutSession;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout-sessions', user?.id] });
    },
  });
}
