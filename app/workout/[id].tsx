/**
 * Active Workout Screen
 * Mobile-optimized exercise logging with FlatList performance
 */

import { View, Text, StyleSheet, FlatList, Pressable, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useState, useCallback, useEffect, useMemo } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useWorkoutDetail } from '@/hooks/use-workouts';
import { useStartWorkoutSession, useLogExercise, useCompleteWorkoutSession, useLastPerformance } from '@/hooks/use-workout-sessions';
import { useWorkoutSession } from '@/stores/workout-session';
import PreWorkoutBriefModal from '@/components/PreWorkoutBriefModal';
import WorkoutAnalysisModal from '@/components/WorkoutAnalysisModal';

interface ExerciseRowData {
  id: string;
  exercise_id: string;
  name: string;
  round_number: number;
  target_reps: number | null;
  target_time: number | null;
  order: number;
}

export default function ActiveWorkoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: workoutDetail, isLoading } = useWorkoutDetail(id);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [activeExerciseId, setActiveExerciseId] = useState<string | null>(null);
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [showPreBrief, setShowPreBrief] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  const startSession = useStartWorkoutSession();
  const logExercise = useLogExercise();
  const completeSession = useCompleteWorkoutSession();

  const { loggedExercises, logSet, getTotalSets } = useWorkoutSession();

  // Show pre-workout brief on mount (don't auto-start session)
  useEffect(() => {
    if (workoutDetail && !hasStarted) {
      setShowPreBrief(true);
    }
  }, [workoutDetail, hasStarted]);

  const handleStartWorkout = useCallback(() => {
    setShowPreBrief(false);
    setHasStarted(true);

    startSession.mutate(id, {
      onSuccess: (session) => {
        setSessionId(session.id);
      },
    });
  }, [id, startSession]);

  // Flatten exercises from rounds into a single list
  const exerciseList: ExerciseRowData[] = useMemo(() => {
    if (!workoutDetail) return [];

    const list: ExerciseRowData[] = [];
    workoutDetail.rounds.forEach((round) => {
      round.exercises.forEach((ex) => {
        list.push({
          id: `${round.id}-${ex.id}`,
          exercise_id: ex.exercise_id,
          name: ex.exercise?.name || 'Unknown Exercise',
          round_number: round.round_number,
          target_reps: ex.target_reps,
          target_time: ex.target_time,
          order: ex.order_in_round,
        });
      });
    });
    return list;
  }, [workoutDetail]);

  const handleLogSet = useCallback(() => {
    if (!sessionId || !activeExerciseId) return;

    const activeExercise = exerciseList.find(e => e.exercise_id === activeExerciseId);
    if (!activeExercise) return;

    const weightNum = weight ? parseFloat(weight) : undefined;
    const repsNum = reps ? parseInt(reps) : undefined;

    // Log to backend
    logExercise.mutate({
      session_id: sessionId,
      exercise_id: activeExerciseId,
      round_number: activeExercise.round_number,
      weight_used: weightNum,
      reps_completed: repsNum,
    });

    // Log to local state
    logSet(activeExerciseId, activeExercise.name, activeExercise.round_number, {
      weight: weightNum,
      reps: repsNum,
    });

    // Clear inputs
    setWeight('');
    setReps('');
  }, [sessionId, activeExerciseId, weight, reps, exerciseList, logExercise, logSet]);

  const handleCompleteWorkout = useCallback(() => {
    if (!sessionId) return;

    Alert.alert(
      'Complete Workout',
      'How did you feel during this workout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: '1 - Low Energy',
          onPress: () => finishWorkout(1),
        },
        {
          text: '2 - Below Average',
          onPress: () => finishWorkout(2),
        },
        {
          text: '3 - Average',
          onPress: () => finishWorkout(3),
        },
        {
          text: '4 - Good Energy',
          onPress: () => finishWorkout(4),
        },
        {
          text: '5 - Great Energy',
          onPress: () => finishWorkout(5),
        },
      ]
    );
  }, [sessionId]);

  const finishWorkout = (rating: number) => {
    if (!sessionId) return;

    completeSession.mutate(
      {
        sessionId,
        subjectiveRating: rating,
      },
      {
        onSuccess: () => {
          // Show AI analysis modal instead of immediate redirect
          setShowAnalysis(true);
        },
      }
    );
  };

  const handleCloseAnalysis = useCallback(() => {
    setShowAnalysis(false);
    router.back();
  }, []);

  const renderExerciseRow = useCallback(
    ({ item }: { item: ExerciseRowData }) => {
      const isActive = item.exercise_id === activeExerciseId;
      const isLogged = loggedExercises.has(item.exercise_id);

      if (!isActive) {
        // Collapsed row
        return (
          <Pressable
            style={[styles.collapsedRow, isLogged && styles.loggedRow]}
            onPress={() => setActiveExerciseId(item.exercise_id)}
            accessibilityLabel={`${item.name}, tap to log`}
          >
            <View style={styles.rowLeft}>
              {isLogged && (
                <FontAwesome name="check-circle" size={20} color="#4CAF50" />
              )}
              <Text style={styles.exerciseName}>{item.name}</Text>
            </View>
            <FontAwesome name="chevron-right" size={16} color="#999" />
          </Pressable>
        );
      }

      // Expanded row (active exercise)
      const exerciseLog = loggedExercises.get(item.exercise_id);
      const lastSet = exerciseLog?.sets[exerciseLog.sets.length - 1];

      return (
        <View style={styles.expandedRow}>
          <View style={styles.expandedHeader}>
            <Text style={styles.expandedExerciseName}>{item.name}</Text>
            <Pressable onPress={() => setActiveExerciseId(null)}>
              <FontAwesome name="times" size={20} color="#999" />
            </Pressable>
          </View>

          <View style={styles.targetRow}>
            <Text style={styles.targetLabel}>Target:</Text>
            <Text style={styles.targetValue}>
              {item.target_reps && `${item.target_reps} reps`}
              {item.target_time && `${item.target_time} sec`}
            </Text>
          </View>

          {lastSet && (
            <Text style={styles.lastSetText}>
              Last set: {lastSet.weight ? `${lastSet.weight} lbs x ` : ''}
              {lastSet.reps || '--'} reps
            </Text>
          )}

          <View style={styles.inputRow}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Weight (lbs)</Text>
              <TextInput
                style={styles.input}
                value={weight}
                onChangeText={setWeight}
                placeholder="60"
                keyboardType="numeric"
                accessibilityLabel="Weight used"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Reps</Text>
              <TextInput
                style={styles.input}
                value={reps}
                onChangeText={setReps}
                placeholder="12"
                keyboardType="numeric"
                accessibilityLabel="Reps completed"
              />
            </View>
          </View>

          <Pressable
            style={styles.logButton}
            onPress={handleLogSet}
            accessibilityLabel="Log this set"
          >
            <Text style={styles.logButtonText}>LOG SET</Text>
          </Pressable>

          {exerciseLog && exerciseLog.sets.length > 0 && (
            <View style={styles.setsHistory}>
              <Text style={styles.setsHistoryTitle}>
                Sets logged: {exerciseLog.sets.length}
              </Text>
              {exerciseLog.sets.map((set, index) => (
                <Text key={index} style={styles.setHistoryText}>
                  Set {index + 1}: {set.weight || 'BW'} lbs x {set.reps} reps
                </Text>
              ))}
            </View>
          )}
        </View>
      );
    },
    [activeExerciseId, loggedExercises, weight, reps, handleLogSet]
  );

  const getItemLayout = useCallback(
    (data: ExerciseRowData[] | null | undefined, index: number) => {
      const item = data?.[index];
      const isActive = item?.exercise_id === activeExerciseId;
      const length = isActive ? 400 : 64; // Expanded vs collapsed height

      // Calculate offset by summing previous heights
      let offset = 0;
      for (let i = 0; i < index; i++) {
        const prevItem = data?.[i];
        offset += prevItem?.exercise_id === activeExerciseId ? 400 : 64;
      }

      return { length, offset, index };
    },
    [activeExerciseId]
  );

  if (isLoading || !workoutDetail) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading workout...</Text>
      </View>
    );
  }

  return (
    <>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <Text style={styles.workoutTitle}>{workoutDetail.workout.name}</Text>
          <Text style={styles.progressText}>
            {getTotalSets()} sets logged
          </Text>
        </View>

        <FlatList
          data={exerciseList}
          renderItem={renderExerciseRow}
          keyExtractor={(item) => item.id}
          getItemLayout={getItemLayout}
          contentContainerStyle={styles.listContent}
          maxToRenderPerBatch={10}
          windowSize={21}
          removeClippedSubviews={true}
        />

        <View style={styles.footer}>
          <Pressable style={styles.completeButton} onPress={handleCompleteWorkout}>
            <Text style={styles.completeButtonText}>Complete Workout</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {/* Pre-Workout Brief Modal */}
      <PreWorkoutBriefModal
        visible={showPreBrief}
        workoutId={id}
        onStart={handleStartWorkout}
        onCancel={() => {
          setShowPreBrief(false);
          router.back();
        }}
      />

      {/* Post-Workout Analysis Modal */}
      <WorkoutAnalysisModal
        visible={showAnalysis}
        sessionId={sessionId}
        onClose={handleCloseAnalysis}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  workoutTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
  },
  listContent: {
    paddingBottom: 16,
  },
  collapsedRow: {
    height: 64,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  loggedRow: {
    backgroundColor: '#F0F9FF',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    color: '#000',
  },
  expandedRow: {
    backgroundColor: '#FAFAFA',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  expandedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  expandedExerciseName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    flex: 1,
  },
  targetRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  targetLabel: {
    fontSize: 14,
    color: '#666',
  },
  targetValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2196F3',
  },
  lastSetText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  input: {
    height: 56,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 18,
    backgroundColor: '#fff',
  },
  logButton: {
    height: 56,
    backgroundColor: '#2196F3',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  setsHistory: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  setsHistoryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  setHistoryText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  footer: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  completeButton: {
    height: 56,
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completeButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
});
