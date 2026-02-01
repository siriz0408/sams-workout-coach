/**
 * AI Recommendation Card
 * Displays AI coaching suggestions with approve/reject actions
 */

import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import {
  AIRecommendation,
  useApproveRecommendation,
  useRejectRecommendation,
} from '@/hooks/use-ai-recommendations';

interface RecommendationCardProps {
  recommendation: AIRecommendation;
  onApproved?: () => void;
  onRejected?: () => void;
}

const TYPE_CONFIG = {
  progression: {
    label: 'Progression',
    icon: 'arrow-up',
    color: '#4CAF50',
    bgColor: '#E8F5E9',
  },
  deload: {
    label: 'Deload',
    icon: 'refresh',
    color: '#FF9800',
    bgColor: '#FFF3E0',
  },
  exercise_swap: {
    label: 'Exercise Swap',
    icon: 'exchange',
    color: '#2196F3',
    bgColor: '#E3F2FD',
  },
};

export function RecommendationCard({
  recommendation,
  onApproved,
  onRejected,
}: RecommendationCardProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const approveRecommendation = useApproveRecommendation();
  const rejectRecommendation = useRejectRecommendation();

  const config = TYPE_CONFIG[recommendation.recommendation_type];

  const handleApprove = async () => {
    setIsProcessing(true);
    try {
      await approveRecommendation.mutateAsync(recommendation.id);
      onApproved?.();
    } catch (error) {
      console.error('Error approving recommendation:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    setIsProcessing(true);
    try {
      await rejectRecommendation.mutateAsync(recommendation.id);
      onRejected?.();
    } catch (error) {
      console.error('Error rejecting recommendation:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View style={styles.card}>
      {/* Type Badge */}
      <View style={[styles.typeBadge, { backgroundColor: config.bgColor }]}>
        <FontAwesome name={config.icon as any} size={14} color={config.color} />
        <Text style={[styles.typeText, { color: config.color }]}>{config.label}</Text>
      </View>

      {/* Recommendation Details */}
      <View style={styles.content}>
        {/* Current → Suggested */}
        {recommendation.current_value && recommendation.suggested_value && (
          <View style={styles.valueRow}>
            <View style={styles.valueBox}>
              <Text style={styles.valueLabel}>Current</Text>
              <Text style={styles.valueText}>{recommendation.current_value}</Text>
            </View>
            <FontAwesome name="arrow-right" size={20} color="#2196F3" />
            <View style={styles.valueBox}>
              <Text style={styles.valueLabel}>Suggested</Text>
              <Text style={[styles.valueText, { color: config.color }]}>
                {recommendation.suggested_value}
              </Text>
            </View>
          </View>
        )}

        {/* Reasoning */}
        <View style={styles.reasoningBox}>
          <View style={styles.reasoningHeader}>
            <FontAwesome name="lightbulb-o" size={16} color="#666" />
            <Text style={styles.reasoningTitle}>AI Reasoning</Text>
          </View>
          <Text style={styles.reasoningText}>{recommendation.reasoning}</Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable
            style={[styles.actionButton, styles.rejectButton]}
            onPress={handleReject}
            disabled={isProcessing}
            accessibilityLabel="Reject recommendation"
            accessibilityRole="button"
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="#F44336" />
            ) : (
              <>
                <FontAwesome name="times" size={16} color="#F44336" />
                <Text style={styles.rejectButtonText}>Not Now</Text>
              </>
            )}
          </Pressable>

          <Pressable
            style={[styles.actionButton, styles.approveButton]}
            onPress={handleApprove}
            disabled={isProcessing}
            accessibilityLabel="Approve recommendation"
            accessibilityRole="button"
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <FontAwesome name="check" size={16} color="#fff" />
                <Text style={styles.approveButtonText}>Approve</Text>
              </>
            )}
          </Pressable>
        </View>
      </View>

      {/* Timestamp */}
      <Text style={styles.timestamp}>
        {new Date(recommendation.created_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 12,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    gap: 16,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  valueBox: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  valueLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  valueText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  reasoningBox: {
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 12,
  },
  reasoningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  reasoningTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  reasoningText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
  },
  rejectButton: {
    backgroundColor: '#FFEBEE',
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  rejectButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F44336',
  },
  approveButton: {
    backgroundColor: '#4CAF50',
  },
  approveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
    textAlign: 'right',
  },
});
