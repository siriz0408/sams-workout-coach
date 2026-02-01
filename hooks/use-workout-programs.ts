/**
 * React Query Hooks for Workout Programs
 * Handles fetching and managing workout programs
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';

export interface WorkoutProgram {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  source: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Fetch all workout programs for the current user
 */
export function useWorkoutPrograms() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['workout-programs', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('workout_programs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as WorkoutProgram[];
    },
    enabled: !!user,
  });
}

/**
 * Fetch the active workout program
 */
export function useActiveProgram() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['active-program', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('workout_programs')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows returned, which is fine (no active program)
        throw error;
      }

      return data as WorkoutProgram | null;
    },
    enabled: !!user,
  });
}

/**
 * Fetch a specific workout program by ID
 */
export function useWorkoutProgram(programId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['workout-program', programId],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');
      if (!programId) throw new Error('Program ID required');

      const { data, error } = await supabase
        .from('workout_programs')
        .select('*')
        .eq('id', programId)
        .single();

      if (error) throw error;
      return data as WorkoutProgram;
    },
    enabled: !!user && !!programId,
  });
}

/**
 * Create a new workout program
 */
export function useCreateProgram() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (program: {
      name: string;
      description?: string;
      source?: string;
      is_active?: boolean;
    }) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('workout_programs')
        .insert({
          user_id: user.id,
          ...program,
        })
        .select()
        .single();

      if (error) throw error;
      return data as WorkoutProgram;
    },
    onSuccess: () => {
      // Invalidate programs list to refetch
      queryClient.invalidateQueries({ queryKey: ['workout-programs', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['active-program', user?.id] });
    },
  });
}

/**
 * Update an existing workout program
 */
export function useUpdateProgram() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<WorkoutProgram>;
    }) => {
      const { data, error } = await supabase
        .from('workout_programs')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as WorkoutProgram;
    },
    onSuccess: (data) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['workout-programs', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['workout-program', data.id] });
      queryClient.invalidateQueries({ queryKey: ['active-program', user?.id] });
    },
  });
}

/**
 * Set a program as active (deactivates others)
 */
export function useSetActiveProgram() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (programId: string) => {
      if (!user) throw new Error('User not authenticated');

      // First, deactivate all programs
      await supabase
        .from('workout_programs')
        .update({ is_active: false })
        .eq('user_id', user.id);

      // Then, activate the selected program
      const { data, error } = await supabase
        .from('workout_programs')
        .update({ is_active: true })
        .eq('id', programId)
        .select()
        .single();

      if (error) throw error;
      return data as WorkoutProgram;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout-programs', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['active-program', user?.id] });
    },
  });
}

/**
 * Delete a workout program
 */
export function useDeleteProgram() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (programId: string) => {
      const { error } = await supabase
        .from('workout_programs')
        .delete()
        .eq('id', programId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout-programs', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['active-program', user?.id] });
    },
  });
}
