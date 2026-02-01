/**
 * Progress Screen
 * Weight trends, strength gains, and analytics with data storytelling
 */

import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions, ActivityIndicator, Modal } from 'react-native';
import { useState, useEffect } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { VictoryLine, VictoryChart, VictoryAxis, VictoryTheme, VictoryScatter } from 'victory-native';
import { useUserProfile, useWeightTrend } from '@/hooks/use-user-profile';
import { useExerciseHistory } from '@/hooks/use-workout-sessions';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { router } from 'expo-router';

type Tab = 'weight' | 'strength' | 'activity';

const SCREEN_WIDTH = Dimensions.get('window').width;

// Data storytelling color palette
const STORY_COLORS = {
  achievement: '#4CAF50',    // Green - celebrate wins
  on_track: '#2196F3',       // Blue - maintaining pace
  needs_attention: '#FF9800', // Orange - watch this
  concern: '#F44336',        // Red - action needed
  neutral: '#9E9E9E',        // Gray - reference/baseline
};

export default function ProgressScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('weight');
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [loggedExercises, setLoggedExercises] = useState<Array<{ id: string; name: string }>>([]);
  const [showExercisePicker, setShowExercisePicker] = useState(false);

  const { user } = useAuth();
  const { data: profile, isLoading: profileLoading, isError: profileError } = useUserProfile();
  const { data: weightData, isLoading: weightLoading, isError: weightError } = useWeightTrend(90); // Last 90 days
  const { data: exerciseHistory, isLoading: exerciseLoading } = useExerciseHistory(selectedExerciseId || undefined, 30);

  const isLoading = activeTab === 'weight' && (profileLoading || weightLoading);
  const hasError = activeTab === 'weight' && (profileError || weightError);

  // Fetch exercises user has logged
  useEffect(() => {
    if (user && activeTab === 'strength') {
      const fetchLoggedExercises = async () => {
        const { data, error } = await supabase
          .from('exercise_logs')
          .select(`
            exercise_id,
            exercise:exercises(id, name)
          `)
          .eq('session.user_id', user.id)
          .order('logged_at', { ascending: false });

        if (!error && data) {
          // Get unique exercises
          const uniqueExercises = Array.from(
            new Map(
              data
                .filter(log => log.exercise)
                .map(log => [log.exercise.id, { id: log.exercise.id, name: log.exercise.name }])
            ).values()
          );

          setLoggedExercises(uniqueExercises);

          // Auto-select first exercise if none selected
          if (!selectedExerciseId && uniqueExercises.length > 0) {
            setSelectedExerciseId(uniqueExercises[0].id);
          }
        }
      };

      fetchLoggedExercises();
    }
  }, [user, activeTab]);

  // Calculate weight progress metrics
  const currentWeight = weightData?.[0]?.weight || profile?.current_weight || 0;
  const goalWeight = profile?.goal_weight || 0;
  const startWeight = weightData?.[weightData.length - 1]?.weight || currentWeight;
  const totalChange = currentWeight - startWeight;
  const goalRemaining = currentWeight - goalWeight;
  const progressPercent = goalRemaining > 0
    ? ((totalChange / goalRemaining) * 100).toFixed(0)
    : 100;

  // Determine trend color
  const trendColor = goalRemaining <= 0
    ? STORY_COLORS.achievement
    : totalChange < 0
      ? STORY_COLORS.on_track
      : STORY_COLORS.needs_attention;

  // Format weight data for chart
  const chartData = weightData?.map((measurement, index) => ({
    x: index,
    y: measurement.weight,
    date: new Date(measurement.measured_at),
  })) || [];

  const renderWeightTab = () => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Loading weight data...</Text>
        </View>
      );
    }

    if (hasError) {
      return (
        <View style={styles.errorContainer}>
          <FontAwesome name="exclamation-triangle" size={48} color="#F44336" />
          <Text style={styles.errorText}>Unable to load weight data</Text>
          <Text style={styles.errorSubtext}>Please check your connection and try again</Text>
        </View>
      );
    }

    return (
    <View>
      {/* Headline & Insight */}
      <View style={styles.insightCard}>
        {totalChange !== 0 && (
          <>
            <Text style={styles.headline}>
              {totalChange < 0
                ? `You're ${Math.abs(totalChange).toFixed(1)} lbs down!`
                : `Weight up ${totalChange.toFixed(1)} lbs`}
            </Text>
            <Text style={styles.subheadline}>
              {goalRemaining > 0
                ? `${goalRemaining.toFixed(1)} lbs to goal (${progressPercent}% there)`
                : 'Goal achieved! 🎉'}
            </Text>
          </>
        )}
        {totalChange === 0 && (
          <Text style={styles.headline}>Start tracking to see your progress</Text>
        )}
      </View>

      {/* Weight Trend Chart */}
      {chartData.length > 0 && (
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Weight Trend (90 days)</Text>
          <VictoryChart
            theme={VictoryTheme.material}
            width={SCREEN_WIDTH - 32}
            height={250}
            padding={{ top: 20, bottom: 40, left: 50, right: 20 }}
          >
            <VictoryAxis
              style={{
                tickLabels: { fontSize: 10, padding: 5 },
              }}
              tickFormat={(t) => {
                const date = chartData[t]?.date;
                return date ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
              }}
            />
            <VictoryAxis
              dependentAxis
              style={{
                tickLabels: { fontSize: 10, padding: 5 },
              }}
              tickFormat={(t) => `${t} lbs`}
            />
            <VictoryLine
              data={chartData}
              style={{
                data: { stroke: trendColor, strokeWidth: 3 },
              }}
            />
            <VictoryScatter
              data={chartData}
              size={4}
              style={{
                data: { fill: trendColor },
              }}
            />
          </VictoryChart>

          {/* Chart Annotations */}
          <View style={styles.annotations}>
            <View style={styles.annotation}>
              <View style={[styles.annotationDot, { backgroundColor: STORY_COLORS.neutral }]} />
              <Text style={styles.annotationText}>Started: {startWeight.toFixed(1)} lbs</Text>
            </View>
            <View style={styles.annotation}>
              <View style={[styles.annotationDot, { backgroundColor: trendColor }]} />
              <Text style={styles.annotationText}>Current: {currentWeight.toFixed(1)} lbs</Text>
            </View>
            <View style={styles.annotation}>
              <View style={[styles.annotationDot, { backgroundColor: STORY_COLORS.achievement }]} />
              <Text style={styles.annotationText}>Goal: {goalWeight.toFixed(1)} lbs</Text>
            </View>
          </View>
        </View>
      )}

      {/* Weight Stats */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{currentWeight.toFixed(1)}</Text>
          <Text style={styles.statLabel}>Current</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: trendColor }]}>
            {totalChange >= 0 ? '+' : ''}{totalChange.toFixed(1)}
          </Text>
          <Text style={styles.statLabel}>Change</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{goalWeight.toFixed(1)}</Text>
          <Text style={styles.statLabel}>Goal</Text>
        </View>
      </View>

      {/* What's Working Section */}
      {totalChange < 0 && (
        <View style={styles.insightCard}>
          <Text style={styles.sectionTitle}>💪 What's Working</Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>✓ Consistent progress toward goal</Text>
            {totalChange < -5 && (
              <Text style={styles.bulletItem}>✓ Strong momentum - down {Math.abs(totalChange).toFixed(1)} lbs</Text>
            )}
          </View>
        </View>
      )}
    </View>
    );
  };

  const renderStrengthTab = () => {
    if (loggedExercises.length === 0) {
      return (
        <View>
          <View style={styles.insightCard}>
            <Text style={styles.headline}>Strength Progress</Text>
            <Text style={styles.subheadline}>Track your exercise improvements over time</Text>
          </View>

          <View style={styles.emptyState}>
            <FontAwesome name="line-chart" size={64} color="#E0E0E0" />
            <Text style={styles.emptyText}>
              Complete more workouts to see your strength gains
            </Text>
          </View>
        </View>
      );
    }

    const selectedExercise = loggedExercises.find(e => e.id === selectedExerciseId);

    // Calculate strength metrics
    const weights = exerciseHistory?.map(log => log.weight_used).filter(Boolean) || [];
    const currentMax = weights.length > 0 ? Math.max(...weights) : 0;
    const startWeight = weights.length > 0 ? weights[weights.length - 1] : 0;
    const totalGain = currentMax - startWeight;

    // Find PRs (personal records)
    let maxSoFar = 0;
    const prs: number[] = [];
    exerciseHistory?.forEach((log, index) => {
      if (log.weight_used && log.weight_used > maxSoFar) {
        maxSoFar = log.weight_used;
        prs.push(index);
      }
    });

    // Format chart data
    const chartData = exerciseHistory
      ?.map((log, index) => ({
        x: index,
        y: log.weight_used || 0,
        date: new Date(log.logged_at),
        reps: log.reps_completed,
        isPR: prs.includes(index),
      }))
      .reverse() || []; // Reverse to show oldest first

    return (
      <View>
        {/* Exercise Selector */}
        <View style={styles.insightCard}>
          <Text style={styles.sectionTitle}>Select Exercise</Text>
          <Pressable
            style={styles.exercisePicker}
            onPress={() => setShowExercisePicker(true)}
          >
            <Text style={styles.exercisePickerText}>
              {selectedExercise?.name || 'Choose exercise...'}
            </Text>
            <FontAwesome name="chevron-down" size={16} color="#666" />
          </Pressable>
        </View>

        {/* Headline & Stats */}
        {selectedExercise && exerciseHistory && exerciseHistory.length > 0 && (
          <>
            <View style={styles.insightCard}>
              <Text style={styles.headline}>
                {totalGain > 0 ? `+${totalGain.toFixed(1)} lbs gained!` : 'Building strength'}
              </Text>
              <Text style={styles.subheadline}>
                {prs.length} personal records set
              </Text>
            </View>

            {/* Strength Chart */}
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Weight Progression</Text>
              <VictoryChart
                theme={VictoryTheme.material}
                width={SCREEN_WIDTH - 32}
                height={250}
                padding={{ top: 20, bottom: 40, left: 50, right: 20 }}
              >
                <VictoryAxis
                  style={{
                    tickLabels: { fontSize: 10, padding: 5 },
                  }}
                  tickFormat={(t) => {
                    const date = chartData[t]?.date;
                    return date ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
                  }}
                />
                <VictoryAxis
                  dependentAxis
                  style={{
                    tickLabels: { fontSize: 10, padding: 5 },
                  }}
                  tickFormat={(t) => `${t} lbs`}
                />
                <VictoryLine
                  data={chartData}
                  style={{
                    data: { stroke: STORY_COLORS.on_track, strokeWidth: 3 },
                  }}
                />
                <VictoryScatter
                  data={chartData}
                  size={(datum: any) => datum.isPR ? 8 : 4}
                  style={{
                    data: {
                      fill: (datum: any) => datum.isPR ? STORY_COLORS.achievement : STORY_COLORS.on_track,
                    },
                  }}
                />
              </VictoryChart>

              {/* Chart Annotations */}
              <View style={styles.annotations}>
                <View style={styles.annotation}>
                  <View style={[styles.annotationDot, { backgroundColor: STORY_COLORS.achievement }]} />
                  <Text style={styles.annotationText}>Personal Record</Text>
                </View>
              </View>
            </View>

            {/* Strength Stats */}
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{currentMax.toFixed(1)}</Text>
                <Text style={styles.statLabel}>Current Max</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statValue, { color: totalGain > 0 ? STORY_COLORS.achievement : STORY_COLORS.neutral }]}>
                  {totalGain >= 0 ? '+' : ''}{totalGain.toFixed(1)}
                </Text>
                <Text style={styles.statLabel}>Total Gain</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{startWeight.toFixed(1)}</Text>
                <Text style={styles.statLabel}>Starting</Text>
              </View>
            </View>
          </>
        )}

        {/* Exercise Picker Modal */}
        <Modal
          visible={showExercisePicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowExercisePicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Exercise</Text>
                <Pressable onPress={() => setShowExercisePicker(false)}>
                  <FontAwesome name="times" size={24} color="#666" />
                </Pressable>
              </View>

              <ScrollView style={styles.exerciseList}>
                {loggedExercises.map((exercise) => (
                  <Pressable
                    key={exercise.id}
                    style={[
                      styles.exerciseItem,
                      selectedExerciseId === exercise.id && styles.exerciseItemActive,
                    ]}
                    onPress={() => {
                      setSelectedExerciseId(exercise.id);
                      setShowExercisePicker(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.exerciseItemText,
                        selectedExerciseId === exercise.id && styles.exerciseItemTextActive,
                      ]}
                    >
                      {exercise.name}
                    </Text>
                    {selectedExerciseId === exercise.id && (
                      <FontAwesome name="check" size={20} color="#2196F3" />
                    )}
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    );
  };

  const renderActivityTab = () => (
    <View>
      <View style={styles.insightCard}>
        <Text style={styles.headline}>Activity Tracking</Text>
        <Text style={styles.subheadline}>BJJ, softball, and recovery analysis</Text>
      </View>

      <Pressable
        style={styles.viewActivityButton}
        onPress={() => router.push('/activity')}
      >
        <FontAwesome name="calendar" size={20} color="#fff" />
        <Text style={styles.viewActivityButtonText}>View Full Activity Log</Text>
      </Pressable>

      <View style={styles.emptyState}>
        <FontAwesome name="heartbeat" size={64} color="#E0E0E0" />
        <Text style={styles.emptyText}>
          Track BJJ, softball, and other activities for recovery-aware training recommendations
        </Text>
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Your Progress</Text>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabs}>
        <Pressable
          style={[styles.tab, activeTab === 'weight' && styles.tabActive]}
          onPress={() => setActiveTab('weight')}
        >
          <Text style={[styles.tabText, activeTab === 'weight' && styles.tabTextActive]}>
            Weight
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'strength' && styles.tabActive]}
          onPress={() => setActiveTab('strength')}
        >
          <Text style={[styles.tabText, activeTab === 'strength' && styles.tabTextActive]}>
            Strength
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'activity' && styles.tabActive]}
          onPress={() => setActiveTab('activity')}
        >
          <Text style={[styles.tabText, activeTab === 'activity' && styles.tabTextActive]}>
            Activity
          </Text>
        </Pressable>
      </View>

      {/* Tab Content */}
      {activeTab === 'weight' && renderWeightTab()}
      {activeTab === 'strength' && renderStrengthTab()}
      {activeTab === 'activity' && renderActivityTab()}
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
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#2196F3',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  tabTextActive: {
    color: '#fff',
  },
  insightCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  headline: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  subheadline: {
    fontSize: 16,
    color: '#666',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 12,
  },
  bulletList: {
    gap: 8,
  },
  bulletItem: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  chartCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 16,
  },
  annotations: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    flexWrap: 'wrap',
    gap: 8,
  },
  annotation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  annotationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  annotationText: {
    fontSize: 12,
    color: '#666',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 24,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 64,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  errorText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#F44336',
    textAlign: 'center',
  },
  errorSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  exercisePicker: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 16,
  },
  exercisePickerText: {
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  exerciseList: {
    maxHeight: 400,
  },
  exerciseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  exerciseItemActive: {
    backgroundColor: '#E3F2FD',
  },
  exerciseItemText: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  exerciseItemTextActive: {
    fontWeight: '600',
    color: '#2196F3',
  },
  viewActivityButton: {
    backgroundColor: '#2196F3',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  viewActivityButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
