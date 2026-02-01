/**
 * Quick Log Modals
 * Modals for logging weight, calories, and activities (BJJ, softball)
 */

import { View, Text, StyleSheet, Modal, TextInput, Pressable, Alert, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useLogWeight, useUserProfile } from '@/hooks/use-user-profile';
import { useLogMeal } from '@/hooks/use-nutrition';
import { useLogActivity } from '@/hooks/use-activities';
import { useAuth } from '@/lib/auth-context';

interface QuickLogWeightProps {
  visible: boolean;
  onClose: () => void;
}

export function QuickLogWeight({ visible, onClose }: QuickLogWeightProps) {
  const [weight, setWeight] = useState('');
  const logWeight = useLogWeight();

  const handleSave = async () => {
    if (!weight || isNaN(parseFloat(weight))) {
      Alert.alert('Error', 'Please enter a valid weight');
      return;
    }

    try {
      await logWeight.mutateAsync({
        weight: parseFloat(weight),
        measured_at: new Date(),
      });

      Alert.alert('Success', 'Weight logged!');
      setWeight('');
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to log weight');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Log Weight</Text>
            <Pressable onPress={onClose}>
              <FontAwesome name="times" size={24} color="#666" />
            </Pressable>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Weight (lbs)</Text>
            <TextInput
              style={styles.input}
              value={weight}
              onChangeText={setWeight}
              placeholder="225"
              keyboardType="numeric"
              autoFocus
            />
          </View>

          <View style={styles.modalActions}>
            <Pressable style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={styles.saveButton}
              onPress={handleSave}
              disabled={logWeight.isPending}
            >
              <Text style={styles.saveButtonText}>
                {logWeight.isPending ? 'Saving...' : 'Save'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

interface QuickLogCaloriesProps {
  visible: boolean;
  onClose: () => void;
}

export function QuickLogCalories({ visible, onClose }: QuickLogCaloriesProps) {
  const [calories, setCalories] = useState('');
  const [mealName, setMealName] = useState('Quick Log');
  const { data: profile } = useUserProfile();
  const logMeal = useLogMeal();

  const targetCalories = profile?.daily_calorie_target || 2000; // Default to 2000 if not set

  const handleSave = async () => {
    if (!calories || isNaN(parseInt(calories))) {
      Alert.alert('Error', 'Please enter valid calories');
      return;
    }

    logMeal.mutate({
      date: new Date().toISOString().split('T')[0],
      meal_name: mealName,
      calories: parseInt(calories),
    }, {
      onSuccess: () => {
        Alert.alert('Success', 'Calories logged!');
        setCalories('');
        onClose();
      },
      onError: () => {
        Alert.alert('Error', 'Failed to log calories');
      },
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Log Calories</Text>
            <Pressable onPress={onClose}>
              <FontAwesome name="times" size={24} color="#666" />
            </Pressable>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Calories</Text>
            <TextInput
              style={styles.input}
              value={calories}
              onChangeText={setCalories}
              placeholder="1900"
              keyboardType="numeric"
              autoFocus
            />
            <Text style={styles.helperText}>Target: {targetCalories} cal</Text>
          </View>

          <View style={styles.modalActions}>
            <Pressable style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.saveButton, logMeal.isPending && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={logMeal.isPending}
            >
              {logMeal.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Save</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

interface QuickLogActivityProps {
  visible: boolean;
  onClose: () => void;
}

export function QuickLogActivity({ visible, onClose }: QuickLogActivityProps) {
  const [activityType, setActivityType] = useState<'bjj' | 'softball' | 'other'>('bjj');
  const [intensity, setIntensity] = useState<'light' | 'moderate' | 'hard'>('moderate');
  const [duration, setDuration] = useState('90');
  const [notes, setNotes] = useState('');
  const logActivity = useLogActivity();

  const handleSave = async () => {
    logActivity.mutate({
      activity_type: activityType,
      date: new Date().toISOString().split('T')[0],
      intensity,
      duration_minutes: duration ? parseInt(duration) : undefined,
      notes: notes || undefined,
    }, {
      onSuccess: () => {
        Alert.alert('Success', 'Activity logged!');
        setDuration('90');
        setNotes('');
        onClose();
      },
      onError: () => {
        Alert.alert('Error', 'Failed to log activity');
      },
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Log Activity</Text>
            <Pressable onPress={onClose}>
              <FontAwesome name="times" size={24} color="#666" />
            </Pressable>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Activity Type</Text>
            <View style={styles.buttonGroup}>
              <Pressable
                style={[styles.toggleButton, activityType === 'bjj' && styles.toggleButtonActive]}
                onPress={() => setActivityType('bjj')}
              >
                <Text style={[styles.toggleButtonText, activityType === 'bjj' && styles.toggleButtonTextActive]}>
                  BJJ
                </Text>
              </Pressable>
              <Pressable
                style={[styles.toggleButton, activityType === 'softball' && styles.toggleButtonActive]}
                onPress={() => setActivityType('softball')}
              >
                <Text style={[styles.toggleButtonText, activityType === 'softball' && styles.toggleButtonTextActive]}>
                  Softball
                </Text>
              </Pressable>
              <Pressable
                style={[styles.toggleButton, activityType === 'other' && styles.toggleButtonActive]}
                onPress={() => setActivityType('other')}
              >
                <Text style={[styles.toggleButtonText, activityType === 'other' && styles.toggleButtonTextActive]}>
                  Other
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Intensity</Text>
            <View style={styles.buttonGroup}>
              <Pressable
                style={[styles.toggleButton, intensity === 'light' && styles.toggleButtonActive]}
                onPress={() => setIntensity('light')}
              >
                <Text style={[styles.toggleButtonText, intensity === 'light' && styles.toggleButtonTextActive]}>
                  Light
                </Text>
              </Pressable>
              <Pressable
                style={[styles.toggleButton, intensity === 'moderate' && styles.toggleButtonActive]}
                onPress={() => setIntensity('moderate')}
              >
                <Text style={[styles.toggleButtonText, intensity === 'moderate' && styles.toggleButtonTextActive]}>
                  Moderate
                </Text>
              </Pressable>
              <Pressable
                style={[styles.toggleButton, intensity === 'hard' && styles.toggleButtonActive]}
                onPress={() => setIntensity('hard')}
              >
                <Text style={[styles.toggleButtonText, intensity === 'hard' && styles.toggleButtonTextActive]}>
                  Hard
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Duration (minutes)</Text>
            <TextInput
              style={styles.input}
              value={duration}
              onChangeText={setDuration}
              placeholder="90"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Notes (optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="How did it go?"
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.modalActions}>
            <Pressable style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.saveButton, logActivity.isPending && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={logActivity.isPending}
            >
              {logActivity.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Save</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  input: {
    height: 56,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 18,
    backgroundColor: '#FAFAFA',
  },
  textArea: {
    height: 100,
    paddingTop: 16,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  toggleButton: {
    flex: 1,
    height: 48,
    borderWidth: 2,
    borderColor: '#DDD',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  toggleButtonActive: {
    borderColor: '#2196F3',
    backgroundColor: '#2196F3',
  },
  toggleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  toggleButtonTextActive: {
    color: '#fff',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    height: 56,
    borderWidth: 2,
    borderColor: '#DDD',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  saveButton: {
    flex: 1,
    height: 56,
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
