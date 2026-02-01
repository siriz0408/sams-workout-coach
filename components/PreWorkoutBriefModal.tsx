/**
 * Pre-Workout Brief Modal
 * Displays AI recommendations before starting a workout session
 */

import { View, Text, StyleSheet, Modal, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { supabase } from '@/lib/supabase';

interface PreWorkoutBriefModalProps {
  visible: boolean;
  workoutId: string;
  onStart: () => void;
  onCancel: () => void;
}

interface ExerciseRecommendation {
  exercise_name: string;
  suggested_weight?: number;
  suggested_reps?: number;
  notes?: string;
}

interface PreWorkoutBrief {
  brief: string;
  recommendations: ExerciseRecommendation[];
  recovery_context?: string;
  focus?: string;
  metadata?: {
    generated_at: string;
    cached_until?: string;
  };
}

export default function PreWorkoutBriefModal({
  visible,
  workoutId,
  onStart,
  onCancel,
}: PreWorkoutBriefModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [brief, setBrief] = useState<PreWorkoutBrief | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible && workoutId) {
      fetchBrief();
    }
  }, [visible, workoutId]);

  const fetchBrief = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke('pre-workout-brief', {
        body: { workout_id: workoutId },
      });

      if (functionError) {
        throw functionError;
      }

      setBrief(data);
    } catch (err: any) {
      console.error('Error fetching pre-workout brief:', err);
      setError(err.message || 'Failed to load workout brief');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    fetchBrief();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onCancel}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Pre-Workout Brief</Text>
            <Pressable onPress={onCancel} accessibilityLabel="Close">
              <FontAwesome name="times" size={24} color="#666" />
            </Pressable>
          </View>

          {/* Loading State */}
          {isLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2196F3" />
              <Text style={styles.loadingText}>Preparing your workout...</Text>
            </View>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <View style={styles.errorContainer}>
              <FontAwesome name="exclamation-triangle" size={48} color="#F44336" />
              <Text style={styles.errorText}>{error}</Text>
              <Pressable style={styles.retryButton} onPress={handleRetry}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </Pressable>
              <Pressable style={styles.skipButton} onPress={onStart}>
                <Text style={styles.skipButtonText}>Skip & Start Anyway</Text>
              </Pressable>
            </View>
          )}

          {/* Brief Content */}
          {brief && !isLoading && !error && (
            <>
              <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Main Brief */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Today's Focus</Text>
                  <Text style={styles.briefText}>{brief.brief}</Text>
                </View>

                {/* Recovery Context */}
                {brief.recovery_context && (
                  <View style={styles.section}>
                    <View style={styles.iconRow}>
                      <FontAwesome name="heartbeat" size={16} color="#FF9800" />
                      <Text style={styles.sectionTitle}>Recovery Status</Text>
                    </View>
                    <Text style={styles.contextText}>{brief.recovery_context}</Text>
                  </View>
                )}

                {/* Focus */}
                {brief.focus && (
                  <View style={styles.section}>
                    <View style={styles.iconRow}>
                      <FontAwesome name="bullseye" size={16} color="#2196F3" />
                      <Text style={styles.sectionTitle}>Key Focus</Text>
                    </View>
                    <Text style={styles.focusText}>{brief.focus}</Text>
                  </View>
                )}

                {/* Exercise Recommendations */}
                {brief.recommendations && brief.recommendations.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Suggested Targets</Text>
                    {brief.recommendations.map((rec, index) => (
                      <View key={index} style={styles.recommendationCard}>
                        <Text style={styles.exerciseName}>{rec.exercise_name}</Text>
                        {rec.suggested_weight && (
                          <Text style={styles.suggestion}>
                            Try: {rec.suggested_weight} lbs x {rec.suggested_reps || '?'} reps
                          </Text>
                        )}
                        {rec.notes && (
                          <Text style={styles.recNotes}>{rec.notes}</Text>
                        )}
                      </View>
                    ))}
                  </View>
                )}
              </ScrollView>

              {/* Start Button */}
              <View style={styles.footer}>
                <Pressable style={styles.startButton} onPress={onStart}>
                  <FontAwesome name="play" size={18} color="#fff" />
                  <Text style={styles.startButtonText}>Start Workout</Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  loadingContainer: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    padding: 40,
    alignItems: 'center',
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  skipButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
  },
  skipButtonText: {
    color: '#2196F3',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollContent: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  briefText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  contextText: {
    fontSize: 14,
    color: '#FF9800',
    lineHeight: 20,
    backgroundColor: '#FFF8E1',
    padding: 12,
    borderRadius: 8,
  },
  focusText: {
    fontSize: 14,
    color: '#2196F3',
    lineHeight: 20,
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
  },
  recommendationCard: {
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  exerciseName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  suggestion: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
    marginBottom: 4,
  },
  recNotes: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  startButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
