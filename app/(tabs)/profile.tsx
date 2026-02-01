/**
 * Profile Screen
 * User settings and account management with editable fields
 */

import { View, Text, StyleSheet, Pressable, TextInput, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useAuth } from '@/lib/auth-context';
import { useUserProfile, useSaveUserProfile } from '@/hooks/use-user-profile';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { data: profile, isLoading } = useUserProfile();
  const saveProfile = useSaveUserProfile();

  const [isEditMode, setIsEditMode] = useState(false);
  const [editedProfile, setEditedProfile] = useState({
    current_weight: '',
    goal_weight: '',
    height: '',
    age: '',
    daily_calorie_target: '',
  });

  // Populate edit fields when profile loads or edit mode is enabled
  useEffect(() => {
    if (profile && isEditMode) {
      setEditedProfile({
        current_weight: profile.current_weight?.toString() || '',
        goal_weight: profile.goal_weight?.toString() || '',
        height: profile.height?.toString() || '',
        age: profile.age?.toString() || '',
        daily_calorie_target: profile.daily_calorie_target?.toString() || '',
      });
    }
  }, [profile, isEditMode]);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
      Alert.alert('Error', 'Failed to sign out');
    }
  };

  const handleSave = async () => {
    // Validate inputs
    const weight = parseFloat(editedProfile.current_weight);
    const goalWeight = parseFloat(editedProfile.goal_weight);
    const height = parseFloat(editedProfile.height);
    const age = parseInt(editedProfile.age);
    const calorieTarget = parseInt(editedProfile.daily_calorie_target);

    if (editedProfile.current_weight && (isNaN(weight) || weight < 50 || weight > 500)) {
      Alert.alert('Validation Error', 'Current weight must be between 50 and 500 lbs');
      return;
    }

    if (editedProfile.goal_weight && (isNaN(goalWeight) || goalWeight < 50 || goalWeight > 500)) {
      Alert.alert('Validation Error', 'Goal weight must be between 50 and 500 lbs');
      return;
    }

    if (editedProfile.height && (isNaN(height) || height < 36 || height > 96)) {
      Alert.alert('Validation Error', 'Height must be between 36 and 96 inches (3-8 feet)');
      return;
    }

    if (editedProfile.age && (isNaN(age) || age < 13 || age > 120)) {
      Alert.alert('Validation Error', 'Age must be between 13 and 120');
      return;
    }

    if (editedProfile.daily_calorie_target && (isNaN(calorieTarget) || calorieTarget < 1000 || calorieTarget > 5000)) {
      Alert.alert('Validation Error', 'Daily calorie target must be between 1000 and 5000');
      return;
    }

    try {
      await saveProfile.mutateAsync({
        current_weight: editedProfile.current_weight ? weight : undefined,
        goal_weight: editedProfile.goal_weight ? goalWeight : undefined,
        height: editedProfile.height ? height : undefined,
        age: editedProfile.age ? age : undefined,
        daily_calorie_target: editedProfile.daily_calorie_target ? calorieTarget : undefined,
      });

      Alert.alert('Success', 'Profile updated successfully');
      setIsEditMode(false);
    } catch (error: any) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', error.message || 'Failed to save profile');
    }
  };

  const handleCancel = () => {
    setIsEditMode(false);
    // Reset fields
    if (profile) {
      setEditedProfile({
        current_weight: profile.current_weight?.toString() || '',
        goal_weight: profile.goal_weight?.toString() || '',
        height: profile.height?.toString() || '',
        age: profile.age?.toString() || '',
        daily_calorie_target: profile.daily_calorie_target?.toString() || '',
      });
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Profile</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </View>
        <Pressable
          style={styles.editButton}
          onPress={() => setIsEditMode(!isEditMode)}
        >
          <FontAwesome
            name={isEditMode ? 'times' : 'pencil'}
            size={20}
            color={isEditMode ? '#F44336' : '#2196F3'}
          />
        </Pressable>
      </View>

      {/* Profile Fields */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Body Metrics</Text>

        {/* Current Weight */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Current Weight (lbs)</Text>
          {isEditMode ? (
            <TextInput
              style={styles.input}
              value={editedProfile.current_weight}
              onChangeText={(text) =>
                setEditedProfile({ ...editedProfile, current_weight: text })
              }
              placeholder="185"
              keyboardType="decimal-pad"
            />
          ) : (
            <Text style={styles.fieldValue}>{profile?.current_weight || '--'} lbs</Text>
          )}
        </View>

        {/* Goal Weight */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Goal Weight (lbs)</Text>
          {isEditMode ? (
            <TextInput
              style={styles.input}
              value={editedProfile.goal_weight}
              onChangeText={(text) =>
                setEditedProfile({ ...editedProfile, goal_weight: text })
              }
              placeholder="175"
              keyboardType="decimal-pad"
            />
          ) : (
            <Text style={styles.fieldValue}>{profile?.goal_weight || '--'} lbs</Text>
          )}
        </View>

        {/* Height */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Height (inches)</Text>
          {isEditMode ? (
            <TextInput
              style={styles.input}
              value={editedProfile.height}
              onChangeText={(text) =>
                setEditedProfile({ ...editedProfile, height: text })
              }
              placeholder="70"
              keyboardType="decimal-pad"
            />
          ) : (
            <Text style={styles.fieldValue}>
              {profile?.height
                ? `${profile.height} in (${Math.floor(profile.height / 12)}' ${profile.height % 12}")`
                : '--'}
            </Text>
          )}
        </View>

        {/* Age */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Age</Text>
          {isEditMode ? (
            <TextInput
              style={styles.input}
              value={editedProfile.age}
              onChangeText={(text) =>
                setEditedProfile({ ...editedProfile, age: text })
              }
              placeholder="30"
              keyboardType="number-pad"
            />
          ) : (
            <Text style={styles.fieldValue}>{profile?.age || '--'} years</Text>
          )}
        </View>
      </View>

      {/* Nutrition */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Nutrition</Text>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Daily Calorie Target</Text>
          {isEditMode ? (
            <TextInput
              style={styles.input}
              value={editedProfile.daily_calorie_target}
              onChangeText={(text) =>
                setEditedProfile({ ...editedProfile, daily_calorie_target: text })
              }
              placeholder="2000"
              keyboardType="number-pad"
            />
          ) : (
            <Text style={styles.fieldValue}>
              {profile?.daily_calorie_target || '--'} cal/day
            </Text>
          )}
        </View>
      </View>

      {/* Save/Cancel Buttons */}
      {isEditMode && (
        <View style={styles.editActions}>
          <Pressable
            style={[styles.actionButton, styles.cancelButton]}
            onPress={handleCancel}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
          <Pressable
            style={[styles.actionButton, styles.saveButton]}
            onPress={handleSave}
            disabled={saveProfile.isPending}
          >
            {saveProfile.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Save Changes</Text>
            )}
          </Pressable>
        </View>
      )}

      {/* Sign Out Button */}
      <Pressable style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    color: '#666',
  },
  editButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 16,
  },
  field: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  fieldValue: {
    fontSize: 16,
    color: '#000',
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#FAFAFA',
    color: '#000',
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  signOutButton: {
    height: 56,
    backgroundColor: '#F44336',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  signOutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
