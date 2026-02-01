/**
 * Authentication Helper Functions
 * Simple email/password authentication
 */

import { supabase } from './supabase';

/**
 * Sign up with email and password
 */
export async function signUpWithEmail(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Email confirmation disabled in Supabase for single-user app
        // User can sign in immediately after signup
        emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
      },
    });

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error signing up:', error);
    throw error;
  }
}

/**
 * Sign in with email and password
 */
export async function signInWithEmail(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error signing in:', error);
    throw error;
  }
}

/**
 * Check if user has completed onboarding
 * (i.e., has a user profile with required fields)
 */
export async function hasCompletedOnboarding(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('current_weight, goal_weight, height')
      .eq('id', userId)
      .single();

    if (error) {
      // Profile doesn't exist yet
      return false;
    }

    // Check if required fields are filled
    return !!(
      data &&
      data.current_weight &&
      data.goal_weight &&
      data.height
    );
  } catch (error) {
    console.error('Error checking onboarding status:', error);
    return false;
  }
}
