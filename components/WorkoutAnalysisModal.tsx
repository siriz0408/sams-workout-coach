/**
 * Workout Analysis Modal
 * Displays AI analysis after completing a workout session
 */

import { View, Text, StyleSheet, Modal, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { supabase } from '@/lib/supabase';

interface WorkoutAnalysisModalProps {
  visible: boolean;
  sessionId: string | null;
  onClose: () => void;
}

interface WorkoutAnalysis {
  summary: string;
  highlights: string[];
  observations: string[];
  performance_score: number;
  recommendations: string[];
  metadata?: {
    generated_at: string;
  };
}

export default function WorkoutAnalysisModal({
  visible,
  sessionId,
  onClose,
}: WorkoutAnalysisModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState<WorkoutAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible && sessionId) {
      fetchAnalysis();
    }
  }, [visible, sessionId]);

  const fetchAnalysis = async () => {
    if (!sessionId) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke('analyze-workout', {
        body: { session_id: sessionId },
      });

      if (functionError) {
        throw functionError;
      }

      setAnalysis(data);

      // Save analysis to session
      await supabase
        .from('user_workout_sessions')
        .update({ ai_analysis: data })
        .eq('id', sessionId);

    } catch (err: any) {
      console.error('Error fetching workout analysis:', err);
      setError(err.message || 'Failed to analyze workout');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    fetchAnalysis();
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return '#4CAF50'; // Great
    if (score >= 6) return '#2196F3'; // Good
    if (score >= 4) return '#FF9800'; // Okay
    return '#F44336'; // Needs attention
  };

  const getScoreLabel = (score: number) => {
    if (score >= 8) return 'Excellent';
    if (score >= 6) return 'Good';
    if (score >= 4) return 'Fair';
    return 'Challenging';
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Workout Analysis</Text>
            <Pressable onPress={onClose} accessibilityLabel="Close">
              <FontAwesome name="times" size={24} color="#666" />
            </Pressable>
          </View>

          {/* Loading State */}
          {isLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2196F3" />
              <Text style={styles.loadingText}>Analyzing your performance...</Text>
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
              <Pressable style={styles.skipButton} onPress={onClose}>
                <Text style={styles.skipButtonText}>Close</Text>
              </Pressable>
            </View>
          )}

          {/* Analysis Content */}
          {analysis && !isLoading && !error && (
            <>
              <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Performance Score */}
                <View style={styles.scoreContainer}>
                  <View
                    style={[
                      styles.scoreCircle,
                      { borderColor: getScoreColor(analysis.performance_score) },
                    ]}
                  >
                    <Text
                      style={[
                        styles.scoreNumber,
                        { color: getScoreColor(analysis.performance_score) },
                      ]}
                    >
                      {analysis.performance_score}
                    </Text>
                    <Text style={styles.scoreOutOf}>/10</Text>
                  </View>
                  <Text
                    style={[
                      styles.scoreLabel,
                      { color: getScoreColor(analysis.performance_score) },
                    ]}
                  >
                    {getScoreLabel(analysis.performance_score)}
                  </Text>
                </View>

                {/* Summary */}
                <View style={styles.section}>
                  <Text style={styles.summaryText}>{analysis.summary}</Text>
                </View>

                {/* Highlights */}
                {analysis.highlights && analysis.highlights.length > 0 && (
                  <View style={styles.section}>
                    <View style={styles.iconRow}>
                      <FontAwesome name="star" size={16} color="#4CAF50" />
                      <Text style={styles.sectionTitle}>Highlights</Text>
                    </View>
                    {analysis.highlights.map((highlight, index) => (
                      <View key={index} style={styles.listItem}>
                        <FontAwesome name="check-circle" size={14} color="#4CAF50" />
                        <Text style={styles.listItemText}>{highlight}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Observations */}
                {analysis.observations && analysis.observations.length > 0 && (
                  <View style={styles.section}>
                    <View style={styles.iconRow}>
                      <FontAwesome name="eye" size={16} color="#2196F3" />
                      <Text style={styles.sectionTitle}>Observations</Text>
                    </View>
                    {analysis.observations.map((observation, index) => (
                      <View key={index} style={styles.listItem}>
                        <FontAwesome name="circle" size={8} color="#2196F3" />
                        <Text style={styles.listItemText}>{observation}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Recommendations */}
                {analysis.recommendations && analysis.recommendations.length > 0 && (
                  <View style={styles.section}>
                    <View style={styles.iconRow}>
                      <FontAwesome name="lightbulb-o" size={16} color="#FF9800" />
                      <Text style={styles.sectionTitle}>For Next Time</Text>
                    </View>
                    {analysis.recommendations.map((recommendation, index) => (
                      <View key={index} style={styles.recommendationCard}>
                        <Text style={styles.recommendationText}>{recommendation}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </ScrollView>

              {/* Close Button */}
              <View style={styles.footer}>
                <Pressable style={styles.closeButton} onPress={onClose}>
                  <Text style={styles.closeButtonText}>Done</Text>
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
  scoreContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  scoreCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  scoreNumber: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  scoreOutOf: {
    fontSize: 16,
    color: '#999',
  },
  scoreLabel: {
    fontSize: 18,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    fontWeight: '500',
    textAlign: 'center',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 8,
    paddingLeft: 4,
  },
  listItemText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  recommendationCard: {
    backgroundColor: '#FFF8E1',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#FF9800',
  },
  recommendationText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  closeButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
