/**
 * Home/Dashboard Screen
 * Shows today's workout, quick actions, and weekly progress
 */

import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useActiveProgram } from '@/hooks/use-workout-programs';
import { useTodaysWorkout } from '@/hooks/use-workouts';
import { useWorkoutSessions } from '@/hooks/use-workout-sessions';
import { QuickLogWeight, QuickLogCalories, QuickLogActivity } from '@/components/QuickLogModals';
import { usePendingRecommendations } from '@/hooks/use-ai-recommendations';
import { RecommendationCard } from '@/components/RecommendationCard';
import { useWorkoutStreaks } from '@/hooks/use-workout-streaks';

export default function HomeScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [showCaloriesModal, setShowCaloriesModal] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);

  const { data: profile, refetch: refetchProfile, isLoading: profileLoading } = useUserProfile();
  const { data: activeProgram, refetch: refetchProgram, isLoading: programLoading } = useActiveProgram();
  const { data: todaysWorkout, refetch: refetchWorkout, isLoading: workoutLoading } = useTodaysWorkout();
  const { data: sessions, refetch: refetchSessions, isLoading: sessionsLoading } = useWorkoutSessions(7);
  const { data: recommendations, refetch: refetchRecommendations, isLoading: recommendationsLoading } = usePendingRecommendations();
  const { data: streaks } = useWorkoutStreaks();

  const isInitialLoading = profileLoading || programLoading || workoutLoading;

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      refetchProfile(),
      refetchProgram(),
      refetchWorkout(),
      refetchSessions(),
      refetchRecommendations(),
    ]);
    setRefreshing(false);
  };

  // Calculate weekly progress
  const thisWeekSessions = sessions?.filter(session => {
    const sessionDate = new Date(session.started_at);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return sessionDate >= weekAgo && session.completed_at;
  });

  const completedThisWeek = thisWeekSessions?.length || 0;

  // Loading skeleton for initial load
  if (isInitialLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading your dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Welcome Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back!</Text>
          {profile && (
            <View style={styles.progressBadge}>
              <Text style={styles.progressText}>
                {profile.current_weight || '--'} lbs
              </Text>
              <Text style={styles.progressLabel}>
                Goal: {profile.goal_weight || '--'} lbs
              </Text>
            </View>
          )}
        </View>
        {streaks && streaks.currentStreak > 0 && (
          <View style={styles.streakBadge}>
            <Text style={styles.streakNumber}>{streaks.currentStreak}</Text>
            <Text style={styles.streakLabel}>day streak 🔥</Text>
          </View>
        )}
      </View>

      {/* Today's Workout Card */}
      {todaysWorkout ? (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <FontAwesome name="calendar-check-o" size={24} color="#2196F3" />
            <Text style={styles.cardTitle}>Today's Workout</Text>
          </View>

          <Text style={styles.workoutName}>{todaysWorkout.name}</Text>
          {todaysWorkout.description && (
            <Text style={styles.workoutDescription}>
              {todaysWorkout.description}
            </Text>
          )}

          {todaysWorkout.duration_estimate && (
            <View style={styles.workoutMeta}>
              <FontAwesome name="clock-o" size={16} color="#666" />
              <Text style={styles.workoutMetaText}>
                {todaysWorkout.duration_estimate} min
              </Text>
            </View>
          )}

          <Pressable
            style={styles.startButton}
            onPress={() => router.push(`/workout/${todaysWorkout.id}`)}
          >
            <Text style={styles.startButtonText}>Start Workout</Text>
            <FontAwesome name="arrow-right" size={16} color="#fff" />
          </Pressable>
        </View>
      ) : activeProgram ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>No workout scheduled for today</Text>
          <Text style={styles.emptyText}>
            Rest day or no workout assigned to {new Date().toLocaleDateString('en-US', { weekday: 'long' })}
          </Text>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>No Active Program</Text>
          <Text style={styles.emptyText}>
            Discover a workout program to get started
          </Text>
          <Pressable
            style={styles.secondaryButton}
            onPress={() => router.push('/(tabs)/discover')}
          >
            <Text style={styles.secondaryButtonText}>Discover Workouts</Text>
          </Pressable>
        </View>
      )}

      {/* Weekly Summary Banner */}
      <Pressable
        style={styles.weeklySummaryBanner}
        onPress={() => router.push('/weekly-summary')}
      >
        <View style={styles.bannerIcon}>
          <FontAwesome name="bar-chart" size={24} color="#fff" />
        </View>
        <View style={styles.bannerContent}>
          <Text style={styles.bannerTitle}>Ready for your weekly report?</Text>
          <Text style={styles.bannerSubtitle}>
            Get AI insights on your progress, nutrition, and recovery
          </Text>
        </View>
        <FontAwesome name="chevron-right" size={20} color="#2196F3" />
      </Pressable>

      {/* AI Recommendations */}
      {recommendations && recommendations.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <FontAwesome name="magic" size={20} color="#2196F3" />
            <Text style={styles.sectionTitle}>AI Coach Suggestions</Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            Your AI coach has {recommendations.length} recommendation{recommendations.length > 1 ? 's' : ''} to help you progress
          </Text>
          {recommendations.map((recommendation) => (
            <RecommendationCard
              key={recommendation.id}
              recommendation={recommendation}
              onApproved={() => refetchRecommendations()}
              onRejected={() => refetchRecommendations()}
            />
          ))}
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActions}>
          <Pressable
            style={styles.quickAction}
            onPress={() => setShowWeightModal(true)}
            accessibilityLabel="Log your weight"
            accessibilityRole="button"
          >
            <FontAwesome name="plus-circle" size={32} color="#4CAF50" />
            <Text style={styles.quickActionText}>Log Weight</Text>
          </Pressable>

          <Pressable
            style={styles.quickAction}
            onPress={() => setShowCaloriesModal(true)}
            accessibilityLabel="Log daily calories"
            accessibilityRole="button"
          >
            <FontAwesome name="cutlery" size={32} color="#FF9800" />
            <Text style={styles.quickActionText}>Log Calories</Text>
          </Pressable>

          <Pressable
            style={styles.quickAction}
            onPress={() => setShowActivityModal(true)}
            accessibilityLabel="Log BJJ or other activity"
            accessibilityRole="button"
          >
            <FontAwesome name="star" size={32} color="#9C27B0" />
            <Text style={styles.quickActionText}>Log Activity</Text>
          </Pressable>
        </View>
      </View>

      {/* Weekly Progress */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>This Week</Text>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{completedThisWeek}</Text>
            <Text style={styles.statLabel}>Workouts</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>
              {thisWeekSessions?.[0]?.subjective_rating || '--'}
            </Text>
            <Text style={styles.statLabel}>Avg Energy</Text>
          </View>
        </View>
      </View>

      {/* Active Program Info */}
      {activeProgram && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <FontAwesome name="trophy" size={20} color="#FFC107" />
            <Text style={styles.cardTitle}>Active Program</Text>
          </View>
          <Text style={styles.programName}>{activeProgram.name}</Text>
          {activeProgram.description && (
            <Text style={styles.programDescription}>
              {activeProgram.description}
            </Text>
          )}
          <Pressable
            style={styles.linkButton}
            onPress={() => router.push(`/program/${activeProgram.id}`)}
          >
            <Text style={styles.linkButtonText}>View Details</Text>
            <FontAwesome name="chevron-right" size={14} color="#2196F3" />
          </Pressable>
        </View>
      )}

      {/* Quick Log Modals */}
      <QuickLogWeight
        visible={showWeightModal}
        onClose={() => {
          setShowWeightModal(false);
          refetchProfile();
        }}
      />
      <QuickLogCalories
        visible={showCaloriesModal}
        onClose={() => setShowCaloriesModal(false)}
      />
      <QuickLogActivity
        visible={showActivityModal}
        onClose={() => setShowActivityModal(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  progressBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2196F3',
  },
  progressLabel: {
    fontSize: 14,
    color: '#666',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  workoutName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  workoutDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
  },
  workoutMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  workoutMetaText: {
    fontSize: 14,
    color: '#666',
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 56,
    backgroundColor: '#2196F3',
    borderRadius: 12,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginBottom: 16,
  },
  secondaryButton: {
    height: 48,
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
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  quickAction: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  stat: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  programName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  programDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 8,
  },
  linkButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2196F3',
  },
  weeklySummaryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  bannerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  bannerContent: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  bannerSubtitle: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  streakBadge: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FF9800',
  },
  streakNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FF9800',
  },
  streakLabel: {
    fontSize: 12,
    color: '#FF9800',
    fontWeight: '600',
  },
});
