/**
 * React Query Hooks for Workouts
 * Handles fetching workout templates and their exercises
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';

export interface Workout {
  id: string;
  program_id: string;
  name: string;
  description: string | null;
  day_of_week: number | null;
  duration_estimate: number | null;
  created_at: string;
}

export interface WorkoutRound {
  id: string;
  workout_id: string;
  round_number: number;
  name: string | null;
  rest_after_round: number | null;
  notes: string | null;
}

export interface WorkoutExercise {
  id: string;
  round_id: string;
  exercise_id: string;
  order_in_round: number;
  target_reps: number | null;
  target_time: number | null;
  rest_after_exercise: number | null;
  notes: string | null;
  exercise?: {
    id: string;
    name: string;
    muscle_groups: string[];
    equipment: string[];
    ai_form_cues: string | null;
    video_url: string | null;
  };
}

/**
 * Fetch workouts for a specific program
 */
export function useProgramWorkouts(programId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['program-workouts', programId],
    queryFn: async () => {
      if (!programId) throw new Error('Program ID required');

      const { data, error } = await supabase
        .from('workouts')
        .select('*')
        .eq('program_id', programId)
        .order('day_of_week', { ascending: true, nullsFirst: false });

      if (error) throw error;
      return data as Workout[];
    },
    enabled: !!user && !!programId,
  });
}

/**
 * Fetch a specific workout with all rounds and exercises
 */
export function useWorkoutDetail(workoutId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['workout-detail', workoutId],
    queryFn: async () => {
      if (!workoutId) throw new Error('Workout ID required');

      // Fetch workout
      const { data: workout, error: workoutError } = await supabase
        .from('workouts')
        .select('*')
        .eq('id', workoutId)
        .single();

      if (workoutError) throw workoutError;

      // Fetch rounds
      const { data: rounds, error: roundsError } = await supabase
        .from('workout_rounds')
        .select('*')
        .eq('workout_id', workoutId)
        .order('round_number', { ascending: true });

      if (roundsError) throw roundsError;

      // Fetch exercises for each round
      const roundsWithExercises = await Promise.all(
        rounds.map(async (round) => {
          const { data: exercises, error: exercisesError } = await supabase
            .from('workout_exercises')
            .select(`
              *,
              exercise:exercises(*)
            `)
            .eq('round_id', round.id)
            .order('order_in_round', { ascending: true });

          if (exercisesError) throw exercisesError;

          return {
            ...round,
            exercises: exercises as WorkoutExercise[],
          };
        })
      );

      return {
        workout: workout as Workout,
        rounds: roundsWithExercises,
      };
    },
    enabled: !!user && !!workoutId,
  });
}

/**
 * Get today's workout from active program
 */
export function useTodaysWorkout() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['todays-workout', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');

      // Get active program
      const { data: program, error: programError } = await supabase
        .from('workout_programs')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (programError || !program) {
        return null;
      }

      // Get today's day of week (0 = Sunday)
      const today = new Date().getDay();

      // Get workout for today
      const { data: workout, error: workoutError } = await supabase
        .from('workouts')
        .select('*')
        .eq('program_id', program.id)
        .eq('day_of_week', today)
        .single();

      if (workoutError && workoutError.code !== 'PGRST116') {
        throw workoutError;
      }

      // If no workout for today, get the first workout in the program
      if (!workout) {
        const { data: firstWorkout, error: firstError } = await supabase
          .from('workouts')
          .select('*')
          .eq('program_id', program.id)
          .order('day_of_week', { ascending: true, nullsFirst: false })
          .limit(1)
          .single();

        if (firstError && firstError.code !== 'PGRST116') {
          throw firstError;
        }

        return firstWorkout as Workout | null;
      }

      return workout as Workout;
    },
    enabled: !!user,
  });
}

/**
 * Create a new workout
 */
export function useCreateWorkout() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (workout: {
      program_id: string;
      name: string;
      description?: string;
      day_of_week?: number;
      duration_estimate?: number;
    }) => {
      const { data, error } = await supabase
        .from('workouts')
        .insert(workout)
        .select()
        .single();

      if (error) throw error;
      return data as Workout;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['program-workouts', data.program_id] });
      queryClient.invalidateQueries({ queryKey: ['todays-workout', user?.id] });
    },
  });
}

/**
 * Create a workout round
 */
export function useCreateWorkoutRound() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (round: {
      workout_id: string;
      round_number: number;
      name?: string;
      rest_after_round?: number;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('workout_rounds')
        .insert(round)
        .select()
        .single();

      if (error) throw error;
      return data as WorkoutRound;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['workout-detail', data.workout_id] });
    },
  });
}

/**
 * Add exercise to a round
 */
export function useAddExerciseToRound() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (exercise: {
      round_id: string;
      exercise_id: string;
      order_in_round: number;
      target_reps?: number;
      target_time?: number;
      rest_after_exercise?: number;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('workout_exercises')
        .insert(exercise)
        .select(`
          *,
          exercise:exercises(*)
        `)
        .single();

      if (error) throw error;
      return data as WorkoutExercise;
    },
    onSuccess: (data) => {
      // Invalidate workout detail to refetch
      queryClient.invalidateQueries({ queryKey: ['workout-detail'] });
    },
  });
}
