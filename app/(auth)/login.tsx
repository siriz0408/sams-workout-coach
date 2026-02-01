/**
 * Login Screen
 * Simple email/password authentication
 */

import { View, Text, StyleSheet, Pressable, TextInput } from 'react-native';
import { useState } from 'react';
import { signInWithEmail, signUpWithEmail } from '@/lib/auth-helpers';

export default function LoginScreen() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      // Basic validation
      if (!email || !password) {
        setError('Please enter email and password');
        return;
      }

      if (password.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }

      if (isSignUp) {
        // Sign up new user
        await signUpWithEmail(email, password);
        // Session will be created automatically and auth context will handle navigation
      } else {
        // Sign in existing user
        await signInWithEmail(email, password);
        // Session created, auth context handles navigation
      }
    } catch (err: any) {
      console.error('Auth error:', err);

      // User-friendly error messages
      if (err.message?.includes('Invalid login credentials')) {
        setError('Invalid email or password');
      } else if (err.message?.includes('Email not confirmed')) {
        setError('Please check your email to confirm your account');
      } else if (err.message?.includes('User already registered')) {
        setError('This email is already registered. Try signing in instead.');
      } else {
        setError(err.message || 'Authentication failed');
      }
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

      <View style={styles.formContainer}>
        <Text style={styles.formTitle}>
          {isSignUp ? 'Create Account' : 'Sign In'}
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          editable={!loading}
        />

        <TextInput
          style={styles.input}
          placeholder="Password (min 6 characters)"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
        />

        <Pressable
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Please wait...' : isSignUp ? 'Sign Up' : 'Sign In'}
          </Text>
        </Pressable>

        <Pressable
          style={styles.toggleButton}
          onPress={() => {
            setIsSignUp(!isSignUp);
            setError(null);
          }}
          disabled={loading}
        >
          <Text style={styles.toggleText}>
            {isSignUp
              ? 'Already have an account? Sign In'
              : "Don't have an account? Sign Up"}
          </Text>
        </Pressable>
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
  formContainer: {
    gap: 16,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  input: {
    height: 56,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  button: {
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#4285F4',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  toggleButton: {
    marginTop: 8,
    alignItems: 'center',
  },
  toggleText: {
    color: '#4285F4',
    fontSize: 14,
    fontWeight: '500',
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
