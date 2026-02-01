/**
 * Authentication Context
 * Provides authentication state and methods throughout the app
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { router } from 'expo-router';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession()
      .then(async ({ data: { session }, error }) => {
        if (error) {
          console.error('Error getting session:', error);
          setSession(null);
          setUser(null);
          setLoading(false);
          return;
        }

        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // If session exists, check onboarding status and redirect
        if (session) {
          await handleAuthRedirect(session);
        }
      })
      .catch((error) => {
        console.error('Failed to get session:', error);
        setSession(null);
        setUser(null);
        setLoading(false);
      });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        if (session && event === 'SIGNED_IN') {
          // User just signed in (including OAuth callback)
          await handleAuthRedirect(session);
        } else if (!session) {
          // User signed out - redirect to login
          router.replace('/(auth)/login');
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Helper function to check onboarding and redirect appropriately
  async function handleAuthRedirect(session: Session) {
    try {
      // Check if user has completed onboarding
      const { data, error } = await supabase
        .from('user_profiles')
        .select('current_weight, goal_weight, height')
        .eq('id', session.user.id)
        .single();

      const hasCompletedOnboarding = !!(
        data &&
        data.current_weight &&
        data.goal_weight &&
        data.height
      );

      if (hasCompletedOnboarding) {
        router.replace('/(tabs)');
      } else {
        router.replace('/(auth)/onboarding');
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      // If error, assume needs onboarding
      router.replace('/(auth)/onboarding');
    }
  }

  const signOutUser = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
      throw error;
    }
    // Navigation handled by onAuthStateChange listener
  };

  const value = {
    session,
    user,
    loading,
    signOut: signOutUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access auth context
 * Throws error if used outside AuthProvider
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
