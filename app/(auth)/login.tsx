/**
 * Login Screen
 * Google and Apple OAuth sign-in
 */

import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { signInWithGoogle, signInWithApple, hasCompletedOnboarding } from '@/lib/auth-helpers';

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);

      const session = await signInWithGoogle();

      if (session) {
        // Check if user has completed onboarding
        const completed = await hasCompletedOnboarding(session.user.id);

        if (completed) {
          router.replace('/(tabs)');
        } else {
          router.replace('/(auth)/onboarding');
        }
      }
    } catch (err: any) {
      console.error('Google sign-in error:', err);
      setError(err.message || 'Failed to sign in with Google');
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    if (Platform.OS !== 'ios') {
      setError('Apple Sign-In is only available on iOS');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const session = await signInWithApple();

      if (session) {
        // Check if user has completed onboarding
        const completed = await hasCompletedOnboarding(session.user.id);

        if (completed) {
          router.replace('/(tabs)');
        } else {
          router.replace('/(auth)/onboarding');
        }
      }
    } catch (err: any) {
      console.error('Apple sign-in error:', err);
      setError(err.message || 'Failed to sign in with Apple');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Sam's Workout Coach</Text>
        <Text style={styles.subtitle}>Your AI-Powered Training Partner</Text>
      </View>

      <View style={styles.buttonContainer}>
        <Pressable
          style={[styles.button, styles.googleButton]}
          onPress={handleGoogleSignIn}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Signing in...' : 'Continue with Google'}
          </Text>
        </Pressable>

        {Platform.OS === 'ios' && (
          <Pressable
            style={[styles.button, styles.appleButton]}
            onPress={handleAppleSignIn}
            disabled={loading}
          >
            <Text style={[styles.buttonText, styles.appleButtonText]}>
              {loading ? 'Signing in...' : 'Continue with Apple'}
            </Text>
          </Pressable>
        )}
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Track workouts, get AI coaching, and achieve your fitness goals
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
  },
  buttonContainer: {
    gap: 16,
  },
  button: {
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleButton: {
    backgroundColor: '#4285F4',
  },
  appleButton: {
    backgroundColor: '#000',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  appleButtonText: {
    color: '#fff',
  },
  errorContainer: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
  },
  errorText: {
    color: '#C62828',
    textAlign: 'center',
  },
  footer: {
    marginTop: 48,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});
