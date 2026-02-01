/**
 * Onboarding Screen
 * First-time user profile setup
 */

import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { useSaveUserProfile } from '@/hooks/use-user-profile';

export default function OnboardingScreen() {
  const [currentWeight, setCurrentWeight] = useState('');
  const [goalWeight, setGoalWeight] = useState('');
  const [height, setHeight] = useState('');
  const [age, setAge] = useState('');
  const [dailyCalories, setDailyCalories] = useState('');

  const saveProfile = useSaveUserProfile();

  const handleContinue = async () => {
    if (!currentWeight || !goalWeight || !height) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      await saveProfile.mutateAsync({
        current_weight: parseFloat(currentWeight),
        goal_weight: parseFloat(goalWeight),
        height: parseInt(height),
        age: age ? parseInt(age) : undefined,
        daily_calorie_target: dailyCalories ? parseInt(dailyCalories) : undefined,
      });

      router.replace('/(tabs)');
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Failed to save profile. Please try again.');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Welcome! Let's get started</Text>
          <Text style={styles.subtitle}>
            Tell us a bit about yourself to personalize your experience
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Current Weight (lbs) <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={currentWeight}
              onChangeText={setCurrentWeight}
              placeholder="225"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Goal Weight (lbs) <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={goalWeight}
              onChangeText={setGoalWeight}
              placeholder="200"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Height (inches) <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={height}
              onChangeText={setHeight}
              placeholder="70"
              keyboardType="numeric"
            />
            <Text style={styles.helperText}>e.g., 5'10" = 70 inches</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Age (optional)</Text>
            <TextInput
              style={styles.input}
              value={age}
              onChangeText={setAge}
              placeholder="30"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Daily Calorie Target (optional)</Text>
            <TextInput
              style={styles.input}
              value={dailyCalories}
              onChangeText={setDailyCalories}
              placeholder="1900"
              keyboardType="numeric"
            />
          </View>
        </View>

        <Pressable
          style={styles.button}
          onPress={handleContinue}
          disabled={saveProfile.isPending}
        >
          <Text style={styles.buttonText}>
            {saveProfile.isPending ? 'Saving...' : 'Continue'}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    padding: 24,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  form: {
    gap: 20,
    marginBottom: 32,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  required: {
    color: '#F44336',
  },
  input: {
    height: 56,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#FAFAFA',
  },
  helperText: {
    fontSize: 14,
    color: '#999',
  },
  button: {
    height: 56,
    backgroundColor: '#2196F3',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
