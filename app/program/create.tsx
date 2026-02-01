/**
 * Manual Program Builder
 * Multi-step form to create custom workout programs
 */

import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, Alert } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useCreateProgram } from '@/hooks/use-workout-programs';
import { useCreateWorkout, useCreateWorkoutRound, useAddExerciseToRound } from '@/hooks/use-workouts';
import { useExercises } from '@/hooks/use-exercises';
import { useSetActiveProgram } from '@/hooks/use-workout-programs';

type Step = 'program' | 'workout' | 'rounds' | 'exercises';

interface WorkoutData {
  name: string;
  description: string;
  day_of_week: number;
  duration_estimate: number;
}

interface RoundData {
  round_number: number;
  name: string;
  rest_after_round: number;
}

interface ExerciseData {
  exercise_id: string;
  target_reps: number;
  target_time?: number;
  rest_after_exercise: number;
}

export default function CreateProgramScreen() {
  const [step, setStep] = useState<Step>('program');

  // Program details
  const [programName, setProgramName] = useState('');
  const [programDescription, setProgramDescription] = useState('');

  // Workout details
  const [workoutName, setWorkoutName] = useState('');
  const [workoutDescription, setWorkoutDescription] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState('1');
  const [duration, setDuration] = useState('45');

  // Rounds
  const [numRounds, setNumRounds] = useState('3');
  const [roundNames, setRoundNames] = useState<string[]>(['Round 1', 'Round 2', 'Round 3']);

  // Exercises
  const [selectedExercises, setSelectedExercises] = useState<ExerciseData[]>([]);

  const createProgram = useCreateProgram();
  const createWorkout = useCreateWorkout();
  const createRound = useCreateWorkoutRound();
  const addExercise = useAddExerciseToRound();
  const setActive = useSetActiveProgram();
  const { data: exercises } = useExercises();

  const handleCreateProgram = async () => {
    if (!programName.trim()) {
      Alert.alert('Error', 'Please enter a program name');
      return;
    }

    try {
      // 1. Create program
      const program = await createProgram.mutateAsync({
        name: programName,
        description: programDescription || undefined,
        source: 'Manual',
        is_active: false,
      });

      // 2. Create workout
      const workout = await createWorkout.mutateAsync({
        program_id: program.id,
        name: workoutName || 'Workout 1',
        description: workoutDescription || undefined,
        day_of_week: parseInt(dayOfWeek),
        duration_estimate: parseInt(duration),
      });

      // 3. Create rounds
      const rounds = [];
      for (let i = 0; i < parseInt(numRounds); i++) {
        const round = await createRound.mutateAsync({
          workout_id: workout.id,
          round_number: i + 1,
          name: roundNames[i] || `Round ${i + 1}`,
          rest_after_round: 60,
        });
        rounds.push(round);
      }

      // 4. Add exercises (3 per round for demo)
      if (exercises && exercises.length > 0) {
        for (let i = 0; i < rounds.length; i++) {
          // Add 3 exercises per round
          const exercisesToAdd = exercises.slice(i * 3, (i * 3) + 3);

          for (let j = 0; j < exercisesToAdd.length; j++) {
            await addExercise.mutateAsync({
              round_id: rounds[i].id,
              exercise_id: exercisesToAdd[j].id,
              order_in_round: j + 1,
              target_reps: 12,
              rest_after_exercise: 60,
            });
          }
        }
      }

      // 5. Set as active program
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
      console.error('Error creating program:', error);
      Alert.alert('Error', 'Failed to create program. Please try again.');
    }
  };

  const renderProgramStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Create Program</Text>
      <Text style={styles.stepSubtitle}>
        Let's start by naming your program
      </Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Program Name *</Text>
        <TextInput
          style={styles.input}
          value={programName}
          onChangeText={setProgramName}
          placeholder="e.g., BJJ Strength Program"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Description (optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={programDescription}
          onChangeText={setProgramDescription}
          placeholder="What's this program for?"
          multiline
          numberOfLines={3}
        />
      </View>

      <Pressable
        style={styles.primaryButton}
        onPress={() => setStep('workout')}
        disabled={!programName.trim()}
      >
        <Text style={styles.primaryButtonText}>Next: Add Workout</Text>
        <FontAwesome name="arrow-right" size={16} color="#fff" />
      </Pressable>
    </View>
  );

  const renderWorkoutStep = () => (
    <View style={styles.stepContent}>
      <Pressable style={styles.backButton} onPress={() => setStep('program')}>
        <FontAwesome name="arrow-left" size={16} color="#2196F3" />
        <Text style={styles.backButtonText}>Back</Text>
      </Pressable>

      <Text style={styles.stepTitle}>Add Workout</Text>
      <Text style={styles.stepSubtitle}>
        Create your first workout day
      </Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Workout Name *</Text>
        <TextInput
          style={styles.input}
          value={workoutName}
          onChangeText={setWorkoutName}
          placeholder="e.g., Legs + Core"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Description (optional)</Text>
        <TextInput
          style={styles.input}
          value={workoutDescription}
          onChangeText={setWorkoutDescription}
          placeholder="Focus and goals"
        />
      </View>

      <View style={styles.row}>
        <View style={[styles.inputGroup, { flex: 1 }]}>
          <Text style={styles.label}>Day of Week</Text>
          <TextInput
            style={styles.input}
            value={dayOfWeek}
            onChangeText={setDayOfWeek}
            placeholder="1"
            keyboardType="numeric"
          />
          <Text style={styles.helperText}>1=Mon, 7=Sun</Text>
        </View>

        <View style={[styles.inputGroup, { flex: 1 }]}>
          <Text style={styles.label}>Duration (min)</Text>
          <TextInput
            style={styles.input}
            value={duration}
            onChangeText={setDuration}
            placeholder="45"
            keyboardType="numeric"
          />
        </View>
      </View>

      <Pressable
        style={styles.primaryButton}
        onPress={() => setStep('rounds')}
        disabled={!workoutName.trim()}
      >
        <Text style={styles.primaryButtonText}>Next: Configure Rounds</Text>
        <FontAwesome name="arrow-right" size={16} color="#fff" />
      </Pressable>
    </View>
  );

  const renderRoundsStep = () => (
    <View style={styles.stepContent}>
      <Pressable style={styles.backButton} onPress={() => setStep('workout')}>
        <FontAwesome name="arrow-left" size={16} color="#2196F3" />
        <Text style={styles.backButtonText}>Back</Text>
      </Pressable>

      <Text style={styles.stepTitle}>Configure Rounds</Text>
      <Text style={styles.stepSubtitle}>
        How many rounds/circuits in this workout?
      </Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Number of Rounds</Text>
        <TextInput
          style={styles.input}
          value={numRounds}
          onChangeText={(val) => {
            setNumRounds(val);
            const num = parseInt(val) || 3;
            setRoundNames(Array.from({ length: num }, (_, i) => roundNames[i] || `Round ${i + 1}`));
          }}
          placeholder="3"
          keyboardType="numeric"
        />
      </View>

      {roundNames.map((name, index) => (
        <View key={index} style={styles.inputGroup}>
          <Text style={styles.label}>Round {index + 1} Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={(val) => {
              const newNames = [...roundNames];
              newNames[index] = val;
              setRoundNames(newNames);
            }}
            placeholder={`Round ${index + 1}`}
          />
        </View>
      ))}

      <View style={styles.infoBox}>
        <FontAwesome name="info-circle" size={16} color="#2196F3" />
        <Text style={styles.infoText}>
          We'll automatically add 3 exercises per round from your exercise library
        </Text>
      </View>

      <Pressable
        style={styles.primaryButton}
        onPress={handleCreateProgram}
        disabled={createProgram.isPending}
      >
        <Text style={styles.primaryButtonText}>
          {createProgram.isPending ? 'Creating...' : 'Create Program'}
        </Text>
        <FontAwesome name="check" size={16} color="#fff" />
      </Pressable>
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Progress Indicator */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressStep, step !== 'program' && styles.progressStepComplete]}>
          <Text style={styles.progressStepText}>1</Text>
        </View>
        <View style={[styles.progressLine, step !== 'program' && styles.progressLineComplete]} />
        <View style={[styles.progressStep, step === 'rounds' && styles.progressStepComplete]}>
          <Text style={styles.progressStepText}>2</Text>
        </View>
        <View style={[styles.progressLine, step === 'rounds' && styles.progressLineComplete]} />
        <View style={[styles.progressStep, step === 'rounds' && styles.progressStepComplete]}>
          <Text style={styles.progressStepText}>3</Text>
        </View>
      </View>

      {/* Step Content */}
      {step === 'program' && renderProgramStep()}
      {step === 'workout' && renderWorkoutStep()}
      {step === 'rounds' && renderRoundsStep()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    padding: 24,
    paddingBottom: 48,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  progressStep: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressStepComplete: {
    backgroundColor: '#2196F3',
  },
  progressStepText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#E0E0E0',
  },
  progressLineComplete: {
    backgroundColor: '#2196F3',
  },
  stepContent: {
    gap: 20,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
  },
  stepSubtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: -12,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
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
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 56,
    backgroundColor: '#2196F3',
    borderRadius: 12,
    marginTop: 12,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2196F3',
  },
  infoBox: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1976D2',
    lineHeight: 20,
  },
});
