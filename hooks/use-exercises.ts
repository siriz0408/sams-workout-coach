/**
 * React Query Hooks for Exercises
 * Handles exercise library browsing and search
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';

export interface Exercise {
  id: string;
  name: string;
  muscle_groups: string[];
  equipment: string[];
  ai_form_cues: string | null;
  video_url: string | null;
  is_default: boolean;
  created_by: string | null;
  created_at: string;
}

/**
 * Fetch all exercises (default library + user custom)
 */
export function useExercises() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['exercises', user?.id],
    queryFn: async () => {
      // Get default exercises and user's custom exercises
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .or(`is_default.eq.true${user ? `,created_by.eq.${user.id}` : ''}`)
        .order('name', { ascending: true });

      if (error) throw error;
      return data as Exercise[];
    },
    enabled: !!user,
    staleTime: 10 * 60 * 1000, // 10 minutes (exercise library doesn't change often)
  });
}

/**
 * Search exercises by name or muscle group
 */
export function useSearchExercises(searchTerm: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['exercises-search', searchTerm, user?.id],
    queryFn: async () => {
      if (!searchTerm) return [];

      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .or(`is_default.eq.true${user ? `,created_by.eq.${user.id}` : ''}`)
        .or(`name.ilike.%${searchTerm}%,muscle_groups.cs.{${searchTerm}}`)
        .order('name', { ascending: true })
        .limit(20);

      if (error) throw error;
      return data as Exercise[];
    },
    enabled: !!user && searchTerm.length > 0,
  });
}

/**
 * Filter exercises by muscle group
 */
export function useExercisesByMuscleGroup(muscleGroup: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['exercises-muscle-group', muscleGroup, user?.id],
    queryFn: async () => {
      if (!muscleGroup) return [];

      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .or(`is_default.eq.true${user ? `,created_by.eq.${user.id}` : ''}`)
        .contains('muscle_groups', [muscleGroup])
        .order('name', { ascending: true });

      if (error) throw error;
      return data as Exercise[];
    },
    enabled: !!user && !!muscleGroup,
  });
}

/**
 * Filter exercises by equipment
 */
export function useExercisesByEquipment(equipment: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['exercises-equipment', equipment, user?.id],
    queryFn: async () => {
      if (!equipment) return [];

      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .or(`is_default.eq.true${user ? `,created_by.eq.${user.id}` : ''}`)
        .contains('equipment', [equipment])
        .order('name', { ascending: true });

      if (error) throw error;
      return data as Exercise[];
    },
    enabled: !!user && !!equipment,
  });
}

/**
 * Get a specific exercise by ID
 */
export function useExercise(exerciseId: string | undefined) {
  return useQuery({
    queryKey: ['exercise', exerciseId],
    queryFn: async () => {
      if (!exerciseId) throw new Error('Exercise ID required');

      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .eq('id', exerciseId)
        .single();

      if (error) throw error;
      return data as Exercise;
    },
    enabled: !!exerciseId,
  });
}

/**
 * Create a custom exercise
 */
export function useCreateExercise() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (exercise: {
      name: string;
      muscle_groups: string[];
      equipment: string[];
      video_url?: string;
    }) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('exercises')
        .insert({
          ...exercise,
          is_default: false,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Exercise;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises', user?.id] });
    },
  });
}

/**
 * Update exercise (video URL, etc.)
 */
export function useUpdateExercise() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Exercise>;
    }) => {
      const { data, error } = await supabase
        .from('exercises')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Exercise;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['exercises', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['exercise', data.id] });
    },
  });
}
