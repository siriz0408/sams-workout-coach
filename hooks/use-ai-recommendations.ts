/**
 * AI Recommendations Hooks
 * Fetch and manage AI coaching recommendations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';

export type RecommendationType = 'progression' | 'deload' | 'exercise_swap';
export type RecommendationStatus = 'pending' | 'accepted' | 'rejected';

export interface AIRecommendation {
  id: string;
  user_id: string;
  recommendation_type: RecommendationType;
  exercise_id: string | null;
  current_value: string | null;
  suggested_value: string | null;
  reasoning: string;
  status: RecommendationStatus;
  created_at: string;
  resolved_at: string | null;
}

/**
 * Fetch pending AI recommendations for the current user
 */
export function usePendingRecommendations() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['ai-recommendations', 'pending', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('ai_recommendations')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data as AIRecommendation[];
    },
    enabled: !!user,
  });
}

/**
 * Fetch all AI recommendations (including accepted/rejected)
 */
export function useAllRecommendations() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['ai-recommendations', 'all', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('ai_recommendations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      return data as AIRecommendation[];
    },
    enabled: !!user,
  });
}

/**
 * Approve a recommendation
 */
export function useApproveRecommendation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (recommendationId: string) => {
      const { data, error } = await supabase
        .from('ai_recommendations')
        .update({
          status: 'accepted',
          resolved_at: new Date().toISOString(),
        })
        .eq('id', recommendationId)
        .eq('user_id', user?.id)
        .select()
        .single();

      if (error) throw error;

      return data as AIRecommendation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-recommendations'] });
    },
  });
}

/**
 * Reject a recommendation
 */
export function useRejectRecommendation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (recommendationId: string) => {
      const { data, error } = await supabase
        .from('ai_recommendations')
        .update({
          status: 'rejected',
          resolved_at: new Date().toISOString(),
        })
        .eq('id', recommendationId)
        .eq('user_id', user?.id)
        .select()
        .single();

      if (error) throw error;

      return data as AIRecommendation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-recommendations'] });
    },
  });
}

/**
 * Create a new AI recommendation (used by Edge Functions)
 */
export function useCreateRecommendation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (recommendation: {
      recommendation_type: RecommendationType;
      exercise_id?: string | null;
      current_value?: string | null;
      suggested_value?: string | null;
      reasoning: string;
    }) => {
      const { data, error } = await supabase
        .from('ai_recommendations')
        .insert({
          user_id: user?.id,
          recommendation_type: recommendation.recommendation_type,
          exercise_id: recommendation.exercise_id || null,
          current_value: recommendation.current_value || null,
          suggested_value: recommendation.suggested_value || null,
          reasoning: recommendation.reasoning,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      return data as AIRecommendation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-recommendations'] });
    },
  });
}
