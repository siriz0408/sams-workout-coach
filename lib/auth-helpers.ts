/**
 * Authentication Helper Functions
 * OAuth flows for Google and Apple Sign-In
 */

import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as Crypto from 'expo-crypto';
import { supabase } from './supabase';
import { Platform } from 'react-native';

// Complete the web browser session for OAuth
WebBrowser.maybeCompleteAuthSession();

/**
 * Generate a random string for PKCE code verifier
 */
function generateRandomString(length: number = 43): string {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let text = '';
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

/**
 * Generate code challenge from verifier
 */
async function generateCodeChallenge(codeVerifier: string): Promise<string> {
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    codeVerifier
  );
  return hash
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Sign in with Google OAuth
 */
export async function signInWithGoogle() {
  try {
    // Generate PKCE parameters
    const codeVerifier = generateRandomString();
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    // Get the OAuth URL from Supabase
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: AuthSession.makeRedirectUri({
          scheme: 'samsworkoutcoach',
        }),
        skipBrowserRedirect: true,
        scopes: 'email profile',
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
