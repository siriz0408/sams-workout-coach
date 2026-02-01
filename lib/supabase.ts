/**
 * Supabase Client Configuration
 * Handles connection to Supabase backend and authentication
 */

import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Database } from '@/types/supabase';

// Get environment variables
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env file.'
  );
}

/**
 * Secure storage adapter for auth tokens
 * Uses SecureStore (iOS Keychain/Android Keystore) for sensitive data
 */
class SupabaseSecureStorage {
  async getItem(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.error('Error reading from SecureStore:', error);
      // Fallback to AsyncStorage if SecureStore fails
      return await AsyncStorage.getItem(key);
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.error('Error writing to SecureStore:', error);
      // Fallback to AsyncStorage if SecureStore fails
      await AsyncStorage.setItem(key, value);
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error('Error deleting from SecureStore:', error);
      // Fallback to AsyncStorage if SecureStore fails
      await AsyncStorage.removeItem(key);
    }
  }
}

/**
 * Supabase client instance
 * Configured with secure storage for auth tokens
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: new SupabaseSecureStorage(),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Disable for mobile
  },
});

/**
 * Helper function to get the current user session
 */
export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.error('Error getting session:', error);
    return null;
  }
  return data.session;
}

/**
 * Helper function to get the current user
 */
export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    console.error('Error getting user:', error);
    return null;
  }
  return data.user;
}

/**
 * Sign out the current user
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('Error signing out:', error);
    throw error;
  }
}
