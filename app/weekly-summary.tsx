/**
 * Weekly Summary Screen
 * AI-powered weekly coaching report with comprehensive analysis
 */

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { useQueryClient } from '@tanstack/react-query';
import { useApproveRecommendation, useRejectRecommendation } from '@/hooks/use-ai-recommendations';

interface WeeklySummaryData {
  headline: string;
  metrics: {
    workouts_completed: number;
    bjj_sessions: number;
    nutrition_adherence: number;
    weight_change: number;
  };
  strength_progress: {
    exercise_name: string;
    previous_best: string;
    current_best: string;
    improvement: string;
  }[];
  nutrition_analysis: string;
  recovery_assessment: string;
  recommendations: {
    id?: string;
    type: string;
    title: string;
    description: string;
    reasoning: string;
  }[];
  metadata?: {
    generated_at: string;
    week_start: string;
    week_end: string;
  };
}

export default function WeeklySummaryScreen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const approveRecommendation = useApproveRecommendation();
  const rejectRecommendation = useRejectRecommendation();

  const [isLoading, setIsLoading] = useState(false);
  const [summary, setSummary] = useState<WeeklySummaryData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [approvedRecs, setApprovedRecs] = useState<Set<string>>(new Set());
  const [rejectedRecs, setRejectedRecs] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchWeeklySummary();
  }, []);

  const fetchWeeklySummary = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Calculate week boundaries
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - 7);

      const { data, error: functionError } = await supabase.functions.invoke('weekly-summary', {
        body: {
          week_start: weekStart.toISOString(),
          week_end: now.toISOString(),
        },
      });

      if (functionError) {
        throw functionError;
      }

      setSummary(data);

      // Save recommendations to database if they don't have IDs yet
      if (data.recommendations && data.recommendations.length > 0) {
        for (const rec of data.recommendations) {
          if (!rec.id) {
            // Create recommendation in database
            const { data: savedRec, error: recError } = await supabase
              .from('ai_recommendations')
              .insert({
                user_id: user?.id,
                recommendation_type: rec.type,
                target_exercise_id: null,
                suggested_weight: null,
                suggested_reps: null,
                reasoning: rec.reasoning,
                status: 'pending',
                created_at: new Date().toISOString(),
              })
              .select()
              .single();

            if (!recError && savedRec) {
              rec.id = savedRec.id;
            }
          }
        }
      }
    } catch (err: any) {
      console.error('Error fetching weekly summary:', err);
      setError(err.message || 'Failed to generate weekly summary');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (recId: string) => {
    if (!recId) return;

    setApprovedRecs(new Set([...approvedRecs, recId]));

    await approveRecommendation.mutateAsync(recId, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['ai-recommendations'] });
      },
    });
  };

  const handleReject = async (recId: string) => {
    if (!recId) return;

    setRejectedRecs(new Set([...rejectedRecs, recId]));

    await rejectRecommendation.mutateAsync(recId, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['ai-recommendations'] });
      },
    });
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Generating your weekly summary...</Text>
        <Text style={styles.loadingSubtext}>
          Analyzing workouts, nutrition, and recovery...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <FontAwesome name="exclamation-triangle" size={64} color="#F44336" />
        <Text style={styles.errorTitle}>Unable to Generate Summary</Text>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.retryButton} onPress={fetchWeeklySummary}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  if (!summary) {
    return (
      <View style={styles.errorContainer}>
        <FontAwesome name="calendar-times-o" size={64} color="#999" />
        <Text style={styles.errorTitle}>No Data Available</Text>
        <Text style={styles.errorText}>
          Not enough activity this week to generate a summary
        </Text>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backIcon}>
          <FontAwesome name="arrow-left" size={24} color="#000" />
        </Pressable>
        <Text style={styles.title}>Weekly Summary</Text>
      </View>

      {/* Headline */}
      <View style={styles.headlineCard}>
        <FontAwesome name="trophy" size={32} color="#FFC107" />
        <Text style={styles.headline}>{summary.headline}</Text>
      </View>

      {/* Metrics Grid */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>This Week's Numbers</Text>
        <View style={styles.metricsGrid}>
          <View style={styles.metric}>
            <FontAwesome name="check-circle" size={24} color="#4CAF50" />
            <Text style={styles.metricValue}>{summary.metrics.workouts_completed}</Text>
            <Text style={styles.metricLabel}>Workouts</Text>
          </View>
          <View style={styles.metric}>
            <FontAwesome name="star" size={24} color="#9C27B0" />
            <Text style={styles.metricValue}>{summary.metrics.bjj_sessions}</Text>
            <Text style={styles.metricLabel}>BJJ/Activities</Text>
          </View>
          <View style={styles.metric}>
            <FontAwesome name="cutlery" size={24} color="#FF9800" />
            <Text style={styles.metricValue}>{summary.metrics.nutrition_adherence}%</Text>
            <Text style={styles.metricLabel}>Nutrition</Text>
          </View>
          <View style={styles.metric}>
            <FontAwesome
              name={summary.metrics.weight_change >= 0 ? 'arrow-up' : 'arrow-down'}
              size={24}
              color={summary.metrics.weight_change >= 0 ? '#F44336' : '#4CAF50'}
            />
            <Text style={styles.metricValue}>
              {summary.metrics.weight_change > 0 ? '+' : ''}
              {summary.metrics.weight_change} lbs
            </Text>
            <Text style={styles.metricLabel}>Weight Change</Text>
          </View>
        </View>
      </View>

      {/* Strength Progress */}
      {summary.strength_progress && summary.strength_progress.length > 0 && (
        <View style={styles.section}>
          <View style={styles.iconRow}>
            <FontAwesome name="bolt" size={20} color="#2196F3" />
            <Text style={styles.sectionTitle}>Strength Gains</Text>
          </View>
          {summary.strength_progress.map((progress, index) => (
            <View key={index} style={styles.progressCard}>
              <Text style={styles.progressExercise}>{progress.exercise_name}</Text>
              <View style={styles.progressComparison}>
                <Text style={styles.progressPrevious}>Was: {progress.previous_best}</Text>
                <FontAwesome name="arrow-right" size={14} color="#2196F3" />
                <Text style={styles.progressCurrent}>Now: {progress.current_best}</Text>
              </View>
              <Text style={styles.progressImprovement}>{progress.improvement}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Nutrition Analysis */}
      {summary.nutrition_analysis && (
        <View style={styles.section}>
          <View style={styles.iconRow}>
            <FontAwesome name="pie-chart" size={20} color="#FF9800" />
            <Text style={styles.sectionTitle}>Nutrition Insights</Text>
          </View>
          <View style={styles.analysisCard}>
            <Text style={styles.analysisText}>{summary.nutrition_analysis}</Text>
          </View>
        </View>
      )}

      {/* Recovery Assessment */}
      {summary.recovery_assessment && (
        <View style={styles.section}>
          <View style={styles.iconRow}>
            <FontAwesome name="heartbeat" size={20} color="#F44336" />
            <Text style={styles.sectionTitle}>Recovery Status</Text>
          </View>
          <View style={styles.analysisCard}>
            <Text style={styles.analysisText}>{summary.recovery_assessment}</Text>
          </View>
        </View>
      )}

      {/* AI Recommendations */}
      {summary.recommendations && summary.recommendations.length > 0 && (
        <View style={styles.section}>
          <View style={styles.iconRow}>
            <FontAwesome name="magic" size={20} color="#2196F3" />
            <Text style={styles.sectionTitle}>Coach Recommendations</Text>
          </View>
          {summary.recommendations.map((rec, index) => {
            const isApproved = rec.id ? approvedRecs.has(rec.id) : false;
            const isRejected = rec.id ? rejectedRecs.has(rec.id) : false;

            return (
              <View key={index} style={styles.recommendationCard}>
                <Text style={styles.recTitle}>{rec.title}</Text>
                <Text style={styles.recDescription}>{rec.description}</Text>
                <Text style={styles.recReasoning}>Why: {rec.reasoning}</Text>

                {rec.id && !isApproved && !isRejected && (
                  <View style={styles.recActions}>
                    <Pressable
                      style={styles.approveButton}
                      onPress={() => handleApprove(rec.id!)}
                    >
                      <FontAwesome name="check" size={16} color="#fff" />
                      <Text style={styles.approveButtonText}>Approve</Text>
                    </Pressable>
                    <Pressable
                      style={styles.rejectButton}
                      onPress={() => handleReject(rec.id!)}
                    >
                      <FontAwesome name="times" size={16} color="#666" />
                      <Text style={styles.rejectButtonText}>Reject</Text>
                    </Pressable>
                  </View>
                )}

                {isApproved && (
                  <View style={styles.statusBadge}>
                    <FontAwesome name="check-circle" size={16} color="#4CAF50" />
                    <Text style={styles.statusText}>Approved</Text>
                  </View>
                )}

                {isRejected && (
                  <View style={styles.statusBadge}>
                    <FontAwesome name="times-circle" size={16} color="#999" />
                    <Text style={styles.statusText}>Rejected</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <Pressable style={styles.doneButton} onPress={() => router.back()}>
          <Text style={styles.doneButtonText}>Back to Home</Text>
        </Pressable>
      </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    marginTop: 24,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 24,
    backgroundColor: '#2196F3',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    marginTop: 12,
    paddingHorizontal: 32,
    paddingVertical: 12,
  },
  backButtonText: {
    color: '#2196F3',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backIcon: {
    marginRight: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  headlineCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  headline: {
    marginTop: 12,
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 12,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metric: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 8,
  },
  metricLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  progressCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  progressExercise: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  progressComparison: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  progressPrevious: {
    fontSize: 14,
    color: '#999',
  },
  progressCurrent: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  progressImprovement: {
    fontSize: 14,
    color: '#2196F3',
    fontStyle: 'italic',
  },
  analysisCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
  },
  analysisText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  recommendationCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  recTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  recDescription: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
    lineHeight: 20,
  },
  recReasoning: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  recActions: {
    flexDirection: 'row',
    gap: 12,
  },
  approveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 8,
  },
  approveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F5F5F5',
    paddingVertical: 12,
    borderRadius: 8,
  },
  rejectButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  footer: {
    padding: 16,
  },
  doneButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
