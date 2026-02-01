/**
 * Activity Tracking Screen
 * Log and view BJJ, softball, and other activities for recovery tracking
 */

import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useState } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router } from 'expo-router';
import {
  useRecentActivities,
  useWeeklyActivityStats,
  useRecoveryContext,
  useDeleteActivity,
} from '@/hooks/use-activities';
import { QuickLogActivity } from '@/components/QuickLogModals';

export default function ActivityScreen() {
  const [showLogModal, setShowLogModal] = useState(false);

  const { data: recentActivities, isLoading: activitiesLoading } = useRecentActivities(14);
  const { data: weeklyStats, isLoading: statsLoading } = useWeeklyActivityStats();
  const { data: recoveryContext, isLoading: recoveryLoading } = useRecoveryContext();
  const deleteActivity = useDeleteActivity();

  const handleDeleteActivity = (activityId: string, activityName: string) => {
    Alert.alert(
      'Delete Activity',
      `Delete ${activityName} activity?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteActivity.mutate(activityId),
        },
      ]
    );
  };

  const getIntensityColor = (intensity: string) => {
    switch (intensity) {
      case 'hard': return '#F44336';
      case 'moderate': return '#FF9800';
      case 'light': return '#4CAF50';
      default: return '#9E9E9E';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'bjj': return 'hand-rock-o';
      case 'softball': return 'soccer-ball-o';
      case 'other': return 'heartbeat';
      default: return 'circle';
    }
  };

  const getActivityLabel = (type: string) => {
    switch (type) {
      case 'bjj': return 'BJJ';
      case 'softball': return 'Softball';
      case 'other': return 'Other';
      default: return type;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    }
  };

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <FontAwesome name="arrow-left" size={24} color="#1a1a1a" />
          </Pressable>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Activity Tracking</Text>
            <Text style={styles.subtitle}>Track BJJ, softball, and recovery</Text>
          </View>
        </View>

        {/* Recovery Status Card */}
        {recoveryContext && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Recovery Status</Text>
              <View style={[
                styles.badge,
                { backgroundColor: recoveryContext.needs_recovery ? '#FF9800' : '#4CAF50' }
              ]}>
                <Text style={styles.badgeText}>
                  {recoveryContext.needs_recovery ? 'Rest' : 'Ready'}
                </Text>
              </View>
            </View>

            <Text style={styles.recoveryText}>{recoveryContext.recommendation}</Text>

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {recoveryContext.days_since_last_hard !== null
                    ? recoveryContext.days_since_last_hard
                    : '-'}
                </Text>
                <Text style={styles.statLabel}>Days Since Hard</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{recoveryContext.weekly_intensity_score}</Text>
                <Text style={styles.statLabel}>Weekly Load</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{recoveryContext.recent_activities.length}</Text>
                <Text style={styles.statLabel}>Recent Sessions</Text>
              </View>
            </View>
          </View>
        )}

        {/* Weekly Stats Card */}
        {weeklyStats && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>This Week</Text>

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{weeklyStats.total_sessions}</Text>
                <Text style={styles.statLabel}>Total Sessions</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{weeklyStats.bjj_sessions}</Text>
                <Text style={styles.statLabel}>BJJ</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{weeklyStats.softball_sessions}</Text>
                <Text style={styles.statLabel}>Softball</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{Math.round(weeklyStats.total_minutes / 60)}h</Text>
                <Text style={styles.statLabel}>Total Time</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{weeklyStats.intensity_label}</Text>
                <Text style={styles.statLabel}>Avg Intensity</Text>
              </View>
            </View>
          </View>
        )}

        {/* Log Activity Button */}
        <Pressable
          style={styles.logButton}
          onPress={() => setShowLogModal(true)}
        >
          <FontAwesome name="plus" size={20} color="#fff" />
          <Text style={styles.logButtonText}>Log Activity</Text>
        </Pressable>

        {/* Recent Activities */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Recent Activities</Text>

          {activitiesLoading ? (
            <ActivityIndicator size="small" color="#2196F3" style={{ marginTop: 16 }} />
          ) : recentActivities && recentActivities.length > 0 ? (
            recentActivities.map((activity) => (
              <View key={activity.id} style={styles.activityItem}>
                <View style={[styles.activityIcon, { backgroundColor: getIntensityColor(activity.intensity) + '20' }]}>
                  <FontAwesome
                    name={getActivityIcon(activity.activity_type)}
                    size={20}
                    color={getIntensityColor(activity.intensity)}
                  />
                </View>

                <View style={styles.activityInfo}>
                  <View style={styles.activityHeader}>
                    <Text style={styles.activityName}>
                      {getActivityLabel(activity.activity_type)}
                    </Text>
                    <View style={[styles.intensityBadge, { backgroundColor: getIntensityColor(activity.intensity) }]}>
                      <Text style={styles.intensityText}>
                        {activity.intensity}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.activityDetails}>
                    {formatDate(activity.date)}
                    {activity.duration_minutes && ` • ${activity.duration_minutes} min`}
                  </Text>
                  {activity.notes && (
                    <Text style={styles.activityNotes}>{activity.notes}</Text>
                  )}
                </View>

                <Pressable
                  onPress={() => handleDeleteActivity(activity.id, getActivityLabel(activity.activity_type))}
                  style={styles.deleteButton}
                >
                  <FontAwesome name="trash-o" size={18} color="#F44336" />
                </Pressable>
              </View>
            ))
          ) : (
            <Text style={styles.noDataText}>No activities logged yet</Text>
          )}
        </View>
      </ScrollView>

      {/* Log Activity Modal */}
      <QuickLogActivity
        visible={showLogModal}
        onClose={() => setShowLogModal(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    marginRight: 16,
    padding: 8,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  recoveryText: {
    fontSize: 15,
    color: '#1a1a1a',
    marginBottom: 16,
    lineHeight: 22,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 16,
  },
  logButton: {
    backgroundColor: '#2196F3',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  logButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  activityIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activityInfo: {
    flex: 1,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  activityName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginRight: 8,
  },
  intensityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  intensityText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  activityDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  activityNotes: {
    fontSize: 13,
    color: '#999',
    fontStyle: 'italic',
  },
  deleteButton: {
    padding: 8,
  },
  noDataText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 16,
  },
});
