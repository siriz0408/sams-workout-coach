/**
 * Exercise Detail Modal
 * Shows exercise information, AI form cues, performance history, and video links
 */

import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Linking } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { VictoryLine, VictoryChart, VictoryAxis, VictoryTheme, VictoryScatter } from 'victory-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { useExerciseHistory } from '@/hooks/use-workout-sessions';
import { Dimensions } from 'react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface Exercise {
  id: string;
  name: string;
  muscle_groups: string[];
  equipment: string[];
  ai_form_cues: string | null;
  video_url: string | null;
  is_default: boolean;
  created_by: string | null;
}

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const exerciseId = typeof id === 'string' ? id : id?.[0];

  // Fetch exercise details
  const { data: exercise, isLoading: exerciseLoading } = useQuery({
    queryKey: ['exercise', exerciseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .eq('id', exerciseId)
        .single();

      if (error) throw error;
      return data as Exercise;
    },
    enabled: !!exerciseId,
  });

  // Fetch performance history
  const { data: history, isLoading: historyLoading } = useExerciseHistory(exerciseId, 10);

  // Calculate performance stats
  const weights = history?.map(log => log.weight_used).filter(Boolean) || [];
  const reps = history?.map(log => log.reps_completed).filter(Boolean) || [];
  const currentMax = weights.length > 0 ? Math.max(...weights) : 0;
  const avgReps = reps.length > 0 ? Math.round(reps.reduce((a, b) => a + b, 0) / reps.length) : 0;

  // Format chart data
  const chartData = history
    ?.map((log, index) => ({
      x: index,
      y: log.weight_used || 0,
      date: new Date(log.logged_at),
      reps: log.reps_completed,
    }))
    .reverse() || []; // Reverse to show oldest first

  const handleOpenVideo = () => {
    if (exercise?.video_url) {
      Linking.openURL(exercise.video_url);
    }
  };

  if (exerciseLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Loading exercise details...</Text>
        </View>
      </View>
    );
  }

  if (!exercise) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <FontAwesome name="exclamation-circle" size={64} color="#F44336" />
          <Text style={styles.errorText}>Exercise not found</Text>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.closeButton}>
          <FontAwesome name="times" size={28} color="#1a1a1a" />
        </Pressable>
        <Text style={styles.title}>{exercise.name}</Text>
      </View>

      {/* Muscle Groups */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Target Muscles</Text>
        <View style={styles.tagContainer}>
          {exercise.muscle_groups.map((muscle) => (
            <View key={muscle} style={[styles.tag, styles.muscleTag]}>
              <Text style={styles.tagText}>{muscle}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Equipment */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Equipment Needed</Text>
        <View style={styles.tagContainer}>
          {exercise.equipment.map((item) => (
            <View key={item} style={[styles.tag, styles.equipmentTag]}>
              <FontAwesome name="check" size={12} color="#4CAF50" />
              <Text style={[styles.tagText, { marginLeft: 6 }]}>{item}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* AI Form Cues */}
      {exercise.ai_form_cues && (
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <FontAwesome name="lightbulb-o" size={20} color="#FF9800" />
            <Text style={styles.sectionTitle}>Form Tips</Text>
          </View>
          <Text style={styles.formCues}>{exercise.ai_form_cues}</Text>
        </View>
      )}

      {/* Video Link */}
      {exercise.video_url && (
        <Pressable style={styles.videoButton} onPress={handleOpenVideo}>
          <FontAwesome name="play-circle" size={24} color="#fff" />
          <Text style={styles.videoButtonText}>Watch Tutorial Video</Text>
        </Pressable>
      )}

      {/* Performance Stats */}
      {history && history.length > 0 && (
        <>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Your Performance</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{currentMax.toFixed(1)}</Text>
                <Text style={styles.statLabel}>Max Weight (lbs)</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{avgReps}</Text>
                <Text style={styles.statLabel}>Avg Reps</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{history.length}</Text>
                <Text style={styles.statLabel}>Sessions</Text>
              </View>
            </View>
          </View>

          {/* Performance History Chart */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Weight Progression</Text>
            <Text style={styles.chartSubtitle}>Last {history.length} sessions</Text>

            <VictoryChart
              theme={VictoryTheme.material}
              width={SCREEN_WIDTH - 64}
              height={200}
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
                  data: { stroke: '#2196F3', strokeWidth: 3 },
                }}
              />
              <VictoryScatter
                data={chartData}
                size={5}
                style={{
                  data: { fill: '#2196F3' },
                }}
              />
            </VictoryChart>
          </View>

          {/* Recent Sessions */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Recent Sessions</Text>
            {history.slice(0, 5).map((log, index) => (
              <View key={log.id} style={styles.sessionItem}>
                <View style={styles.sessionInfo}>
                  <Text style={styles.sessionDate}>
                    {new Date(log.logged_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </Text>
                  <Text style={styles.sessionDetails}>
                    {log.weight_used ? `${log.weight_used} lbs` : 'Bodyweight'}
                    {log.reps_completed && ` × ${log.reps_completed} reps`}
                    {log.time_completed && ` • ${log.time_completed}s`}
                  </Text>
                </View>
                {log.notes && (
                  <Text style={styles.sessionNotes}>{log.notes}</Text>
                )}
              </View>
            ))}
          </View>
        </>
      )}

      {/* No History State */}
      {(!history || history.length === 0) && (
        <View style={styles.emptyState}>
          <FontAwesome name="line-chart" size={48} color="#E0E0E0" />
          <Text style={styles.emptyText}>
            No performance data yet. Complete workouts to track your progress!
          </Text>
        </View>
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
    paddingTop: 16,
  },
  closeButton: {
    alignSelf: 'flex-end',
    padding: 8,
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
    marginLeft: 8,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  muscleTag: {
    backgroundColor: '#E3F2FD',
  },
  equipmentTag: {
    backgroundColor: '#E8F5E9',
    flexDirection: 'row',
    alignItems: 'center',
  },
  tagText: {
    fontSize: 14,
    color: '#1a1a1a',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  formCues: {
    fontSize: 15,
    color: '#333',
    lineHeight: 24,
  },
  videoButton: {
    backgroundColor: '#F44336',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  videoButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  chartSubtitle: {
    fontSize: 14,
    color: '#999',
    marginBottom: 16,
    marginTop: -8,
  },
  sessionItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  sessionInfo: {
    marginBottom: 4,
  },
  sessionDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  sessionDetails: {
    fontSize: 15,
    color: '#666',
  },
  sessionNotes: {
    fontSize: 13,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 4,
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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#F44336',
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
