/**
 * Authentication Helper Functions
 * OAuth flows for Google and Apple Sign-In
 * Web-compatible implementation
 */

import { supabase } from './supabase';
import { Platform } from 'react-native';

/**
 * Sign in with Google OAuth
 * Works on both web and native platforms
 */
export async function signInWithGoogle() {
  try {
    if (Platform.OS === 'web') {
      // Web-based OAuth flow
      // Supabase will redirect to Google, user logs in, then redirects back
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          // Redirect back to the current URL after authentication
          redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        throw error;
      }

      // On web, this will trigger a page redirect to Google
      // After authentication, Google redirects back and Supabase handles the session
      // The session will be available on page load via supabase.auth.getSession()
      return null; // Session will be available after redirect
    } else {
      // Native mobile OAuth flow (if needed in future)
      throw new Error('Native OAuth not implemented yet. This app is web-only.');
    }
  } catch (error) {
    console.error('Error signing in with Google:', error);
    throw error;
  }
}

/**
 * Sign in with Apple (iOS only)
 */
export async function signInWithApple() {
  if (Platform.OS !== 'ios') {
    throw new Error('Apple Sign-In is only available on iOS');
  }

  try {
    // Get the OAuth URL from Supabase
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        redirectTo: AuthSession.makeRedirectUri({
          scheme: 'samsworkoutcoach',
        }),
        skipBrowserRedirect: true,
      },
    });

    if (error) {
      throw error;
    }

    if (!data.url) {
      throw new Error('No OAuth URL returned from Supabase');
    }

    // Open the OAuth prompt in browser
    const result = await WebBrowser.openAuthSessionAsync(
      data.url,
      AuthSession.makeRedirectUri({
        scheme: 'samsworkoutcoach',
      })
    );

    if (result.type !== 'success') {
      throw new Error('OAuth flow was cancelled or failed');
    }

    // Extract the code from the callback URL
    const url = new URL(result.url);
    const code = url.searchParams.get('code');

    if (!code) {
      throw new Error('No authorization code received');
    }

    // Exchange code for session
    const { data: sessionData, error: sessionError } =
      await supabase.auth.exchangeCodeForSession(code);

    if (sessionError) {
      throw sessionError;
    }

    return sessionData.session;
  } catch (error) {
    console.error('Error signing in with Apple:', error);
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
