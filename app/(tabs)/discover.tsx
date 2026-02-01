/**
 * Discover Screen
 * AI-powered workout discovery (form-based and chat modes)
 */

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { useCreateProgram } from '@/hooks/use-workout-programs';
import { useCreateWorkout, useCreateWorkoutRound, useAddExerciseToRound } from '@/hooks/use-workouts';
import { useSetActiveProgram } from '@/hooks/use-workout-programs';
import { useExercises } from '@/hooks/use-exercises';

type Goal = 'strength' | 'weight_loss' | 'muscle_gain' | 'endurance' | 'mobility';

interface GeneratedProgram {
  id: string;
  name: string;
  description: string;
  source: string;
  days_per_week: number;
  estimated_duration_per_session: number;
  workouts: GeneratedWorkout[];
  ai_reasoning?: string;
}

interface GeneratedWorkout {
  name: string;
  day_of_week: number;
  description: string;
  rounds: GeneratedRound[];
}

interface GeneratedRound {
  round_number: number;
  name: string;
  rest_after_round: number;
  exercises: GeneratedExercise[];
}

interface GeneratedExercise {
  name: string;
  order_in_round: number;
  target_reps?: number;
  target_time?: number;
  rest_after_exercise: number;
  notes?: string;
}

const GOALS: { value: Goal; label: string; icon: string }[] = [
  { value: 'strength', label: 'Strength', icon: 'bolt' },
  { value: 'weight_loss', label: 'Weight Loss', icon: 'fire' },
  { value: 'muscle_gain', label: 'Muscle Gain', icon: 'trophy' },
  { value: 'endurance', label: 'Endurance', icon: 'heartbeat' },
  { value: 'mobility', label: 'Mobility', icon: 'expand' },
];

const EQUIPMENT_OPTIONS = [
  'dumbbells',
  'kettlebells',
  'barbell',
  'pull-up bar',
  'resistance bands',
  'bodyweight',
];

export default function DiscoverScreen() {
  const { user } = useAuth();
  const { data: existingExercises } = useExercises();

  // Form state
  const [selectedGoals, setSelectedGoals] = useState<Goal[]>(['strength']);
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>(['dumbbells', 'bodyweight']);
  const [daysPerWeek, setDaysPerWeek] = useState('4');
  const [sessionDuration, setSessionDuration] = useState('45');
  const [constraints, setConstraints] = useState('');

  // UI state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedProgram, setGeneratedProgram] = useState<GeneratedProgram | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Mutations
  const createProgram = useCreateProgram();
  const createWorkout = useCreateWorkout();
  const createRound = useCreateWorkoutRound();
  const addExercise = useAddExerciseToRound();
  const setActive = useSetActiveProgram();

  const toggleGoal = (goal: Goal) => {
    if (selectedGoals.includes(goal)) {
      setSelectedGoals(selectedGoals.filter((g) => g !== goal));
    } else {
      setSelectedGoals([...selectedGoals, goal]);
    }
  };

  const toggleEquipment = (equipment: string) => {
    if (selectedEquipment.includes(equipment)) {
      setSelectedEquipment(selectedEquipment.filter((e) => e !== equipment));
    } else {
      setSelectedEquipment([...selectedEquipment, equipment]);
    }
  };

  const handleGenerate = async () => {
    if (selectedGoals.length === 0) {
      Alert.alert('Error', 'Please select at least one goal');
      return;
    }

    if (selectedEquipment.length === 0) {
      Alert.alert('Error', 'Please select at least one equipment type');
      return;
    }

    const days = parseInt(daysPerWeek);
    if (isNaN(days) || days < 1 || days > 7) {
      Alert.alert('Error', 'Days per week must be between 1 and 7');
      return;
    }

    setIsGenerating(true);
    setGeneratedProgram(null);

    try {
      const { data, error } = await supabase.functions.invoke('generate-workout', {
        body: {
          goals: selectedGoals,
          constraints: constraints.trim() ? constraints.split(',').map((c) => c.trim()) : [],
          equipment: selectedEquipment,
          days_per_week: days,
          session_duration: parseInt(sessionDuration) || 45,
          experience_level: 'intermediate',
        },
      });

      if (error) throw error;

      setGeneratedProgram(data.program);
    } catch (error: any) {
      console.error('Error generating workout:', error);
      Alert.alert('Error', error.message || 'Failed to generate workout. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveProgram = async () => {
    if (!generatedProgram) return;

    setIsSaving(true);

    try {
      // 1. Create program
      const program = await createProgram.mutateAsync({
        name: generatedProgram.name,
        description: generatedProgram.description,
        source: 'AI Generated',
        is_active: false,
      });

      // 2. Create workouts with rounds and exercises
      for (const workoutData of generatedProgram.workouts) {
        const workout = await createWorkout.mutateAsync({
          program_id: program.id,
          name: workoutData.name,
          description: workoutData.description,
          day_of_week: workoutData.day_of_week,
          duration_estimate: generatedProgram.estimated_duration_per_session,
        });

        // Create rounds
        for (const roundData of workoutData.rounds) {
          const round = await createRound.mutateAsync({
            workout_id: workout.id,
            round_number: roundData.round_number,
            name: roundData.name,
            rest_after_round: roundData.rest_after_round,
          });

          // Add exercises to round
          for (const exerciseData of roundData.exercises) {
            // Find matching exercise in library or create placeholder
            const existingExercise = existingExercises?.find(
              (ex) => ex.name.toLowerCase() === exerciseData.name.toLowerCase()
            );

            const exerciseId = existingExercise?.id || existingExercises?.[0]?.id;

            if (exerciseId) {
              await addExercise.mutateAsync({
                round_id: round.id,
                exercise_id: exerciseId,
                order_in_round: exerciseData.order_in_round,
                target_reps: exerciseData.target_reps || null,
                target_time: exerciseData.target_time || null,
                rest_after_exercise: exerciseData.rest_after_exercise,
                notes: exerciseData.notes || null,
              });
            }
          }
        }
      }

      // 3. Set as active program
      await setActive.mutateAsync(program.id);

      Alert.alert(
        'Success!',
        'Program created and set as active',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/(tabs)'),
          },
        ]
      );
    } catch (error) {
      console.error('Error saving program:', error);
      Alert.alert('Error', 'Failed to save program. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Discover Workouts</Text>
        <Text style={styles.subtitle}>
          AI will generate a custom program based on your goals
        </Text>
      </View>

      {!generatedProgram ? (
        /* Generation Form */
        <>
          {/* Goals */}
          <View style={styles.section}>
            <Text style={styles.label}>Fitness Goals *</Text>
            <View style={styles.chipGroup}>
              {GOALS.map((goal) => (
                <Pressable
                  key={goal.value}
                  style={[
                    styles.chip,
                    selectedGoals.includes(goal.value) && styles.chipActive,
                  ]}
                  onPress={() => toggleGoal(goal.value)}
                >
                  <FontAwesome
                    name={goal.icon as any}
                    size={16}
                    color={selectedGoals.includes(goal.value) ? '#fff' : '#666'}
                  />
                  <Text
                    style={[
                      styles.chipText,
                      selectedGoals.includes(goal.value) && styles.chipTextActive,
                    ]}
                  >
                    {goal.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Equipment */}
          <View style={styles.section}>
            <Text style={styles.label}>Available Equipment *</Text>
            <View style={styles.chipGroup}>
              {EQUIPMENT_OPTIONS.map((equipment) => (
                <Pressable
                  key={equipment}
                  style={[
                    styles.chip,
                    selectedEquipment.includes(equipment) && styles.chipActive,
                  ]}
                  onPress={() => toggleEquipment(equipment)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      selectedEquipment.includes(equipment) && styles.chipTextActive,
                    ]}
                  >
                    {equipment}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Days & Duration */}
          <View style={styles.row}>
            <View style={[styles.section, { flex: 1 }]}>
              <Text style={styles.label}>Days/Week</Text>
              <TextInput
                style={styles.input}
                value={daysPerWeek}
                onChangeText={setDaysPerWeek}
                keyboardType="numeric"
                placeholder="4"
              />
            </View>
            <View style={[styles.section, { flex: 1 }]}>
              <Text style={styles.label}>Minutes/Session</Text>
              <TextInput
                style={styles.input}
                value={sessionDuration}
                onChangeText={setSessionDuration}
                keyboardType="numeric"
                placeholder="45"
              />
            </View>
          </View>

          {/* Constraints */}
          <View style={styles.section}>
            <Text style={styles.label}>Constraints (optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={constraints}
              onChangeText={setConstraints}
              placeholder="e.g., shoulder injury, 3x/week BJJ training"
              multiline
              numberOfLines={3}
            />
            <Text style={styles.helperText}>
              Separate multiple constraints with commas
            </Text>
          </View>

          {/* Generate Button */}
          <Pressable
            style={[styles.primaryButton, isGenerating && styles.primaryButtonDisabled]}
            onPress={handleGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <ActivityIndicator color="#fff" />
                <Text style={styles.primaryButtonText}>Generating...</Text>
              </>
            ) : (
              <>
                <FontAwesome name="magic" size={18} color="#fff" />
                <Text style={styles.primaryButtonText}>Generate Program</Text>
              </>
            )}
          </Pressable>
        </>
      ) : (
        /* Generated Program Preview */
        <>
          <View style={styles.programCard}>
            <View style={styles.programHeader}>
              <FontAwesome name="star" size={24} color="#FFC107" />
              <Text style={styles.programName}>{generatedProgram.name}</Text>
            </View>

            <Text style={styles.programDescription}>
              {generatedProgram.description}
            </Text>

            <View style={styles.programMeta}>
              <View style={styles.metaItem}>
                <FontAwesome name="calendar" size={16} color="#2196F3" />
                <Text style={styles.metaText}>
                  {generatedProgram.days_per_week} days/week
                </Text>
              </View>
              <View style={styles.metaItem}>
                <FontAwesome name="clock-o" size={16} color="#2196F3" />
                <Text style={styles.metaText}>
                  {generatedProgram.estimated_duration_per_session} min/session
                </Text>
              </View>
            </View>

            {generatedProgram.ai_reasoning && (
              <View style={styles.reasoningBox}>
                <Text style={styles.reasoningTitle}>🤖 AI Reasoning</Text>
                <Text style={styles.reasoningText}>
                  {generatedProgram.ai_reasoning}
                </Text>
              </View>
            )}
          </View>

          {/* Workouts Preview */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Workouts</Text>
            {generatedProgram.workouts.map((workout, index) => (
              <View key={index} style={styles.workoutCard}>
                <Text style={styles.workoutName}>{workout.name}</Text>
                <Text style={styles.workoutDescription}>{workout.description}</Text>
                <Text style={styles.workoutMeta}>
                  {workout.rounds.length} rounds • {workout.rounds.reduce((sum, r) => sum + r.exercises.length, 0)} exercises
                </Text>
              </View>
            ))}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <Pressable
              style={styles.secondaryButton}
              onPress={() => setGeneratedProgram(null)}
              disabled={isSaving}
            >
              <Text style={styles.secondaryButtonText}>Try Again</Text>
            </Pressable>
            <Pressable
              style={[styles.primaryButton, isSaving && styles.primaryButtonDisabled]}
              onPress={handleSaveProgram}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <ActivityIndicator color="#fff" />
                  <Text style={styles.primaryButtonText}>Saving...</Text>
                </>
              ) : (
                <>
                  <FontAwesome name="check" size={18} color="#fff" />
                  <Text style={styles.primaryButtonText}>Add to My Programs</Text>
                </>
              )}
            </Pressable>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    paddingBottom: 32,
  },
  header: {
    padding: 24,
    paddingBottom: 16,
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
  section: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  chipGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  chipActive: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  chipTextActive: {
    color: '#fff',
  },
  row: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 24,
  },
  input: {
    height: 56,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    height: 100,
    paddingTop: 16,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 14,
    color: '#999',
    marginTop: 6,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 56,
    backgroundColor: '#2196F3',
    borderRadius: 12,
    marginHorizontal: 24,
    marginTop: 8,
  },
  primaryButtonDisabled: {
    backgroundColor: '#BBDEFB',
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  secondaryButton: {
    flex: 1,
    height: 56,
    borderWidth: 2,
    borderColor: '#2196F3',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2196F3',
  },
  programCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  programHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  programName: {
    flex: 1,
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
  },
  programDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
    lineHeight: 24,
  },
  programMeta: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 14,
    color: '#666',
  },
  reasoningBox: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
  },
  reasoningTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976D2',
    marginBottom: 8,
  },
  reasoningText: {
    fontSize: 14,
    color: '#1976D2',
    lineHeight: 20,
  },
  workoutCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  workoutName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 6,
  },
  workoutDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  workoutMeta: {
    fontSize: 12,
    color: '#999',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    marginTop: 8,
  },
});
