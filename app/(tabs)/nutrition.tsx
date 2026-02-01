/**
 * Nutrition Tracking Screen
 * Daily meal logging with macro tracking and weekly adherence
 */

import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useState } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useDailyNutrition, useWeeklyAdherence, useLogMeal, useMealsByDate, useDeleteMeal } from '@/hooks/use-nutrition';
import { useUserProfile } from '@/hooks/use-user-profile';

export default function NutritionScreen() {
  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [showMealForm, setShowMealForm] = useState(false);

  // Meal form state
  const [mealName, setMealName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fats, setFats] = useState('');

  const { data: profile } = useUserProfile();
  const { data: dailyNutrition, isLoading: dailyLoading } = useDailyNutrition(selectedDate);
  const { data: weeklyAdherence, isLoading: weeklyLoading } = useWeeklyAdherence();
  const { data: meals, isLoading: mealsLoading } = useMealsByDate(selectedDate);
  const logMeal = useLogMeal();
  const deleteMeal = useDeleteMeal();

  const targetCalories = profile?.daily_calorie_target || 2000;
  const targetProtein = 180; // Default protein target

  const handleLogMeal = () => {
    if (!mealName || !calories) {
      Alert.alert('Error', 'Please enter meal name and calories');
      return;
    }

    logMeal.mutate({
      date: selectedDate,
      meal_name: mealName,
      calories: parseInt(calories),
      protein: protein ? parseFloat(protein) : undefined,
      carbs: carbs ? parseFloat(carbs) : undefined,
      fats: fats ? parseFloat(fats) : undefined,
    }, {
      onSuccess: () => {
        // Reset form
        setMealName('');
        setCalories('');
        setProtein('');
        setCarbs('');
        setFats('');
        setShowMealForm(false);
      },
      onError: (error) => {
        Alert.alert('Error', 'Failed to log meal: ' + error.message);
      },
    });
  };

  const handleDeleteMeal = (mealId: string, mealName: string) => {
    Alert.alert(
      'Delete Meal',
      `Delete ${mealName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMeal.mutate(mealId),
        },
      ]
    );
  };

  const caloriePercentage = dailyNutrition
    ? Math.min((dailyNutrition.total_calories / targetCalories) * 100, 100)
    : 0;

  const proteinPercentage = dailyNutrition
    ? Math.min((dailyNutrition.total_protein / targetProtein) * 100, 100)
    : 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on_track': return '#4CAF50';
      case 'over': return '#FF9800';
      case 'under': return '#2196F3';
      default: return '#9E9E9E';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'on_track': return 'On Track';
      case 'over': return 'Over Target';
      case 'under': return 'Under Target';
      default: return 'No Data';
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Nutrition Tracking</Text>
        <Text style={styles.subtitle}>Track your daily meals and macros</Text>
      </View>

      {/* Weekly Adherence Card */}
      {weeklyAdherence && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Weekly Adherence</Text>
            <View style={[styles.badge, { backgroundColor: weeklyAdherence.adherence_pct >= 70 ? '#4CAF50' : '#FF9800' }]}>
              <Text style={styles.badgeText}>{weeklyAdherence.adherence_pct}%</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{weeklyAdherence.days_on_track}</Text>
              <Text style={styles.statLabel}>On Track</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{weeklyAdherence.avg_calories}</Text>
              <Text style={styles.statLabel}>Avg Calories</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{weeklyAdherence.avg_protein}g</Text>
              <Text style={styles.statLabel}>Avg Protein</Text>
            </View>
          </View>
        </View>
      )}

      {/* Daily Progress Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Today's Nutrition</Text>
          {dailyNutrition && (
            <View style={[styles.badge, { backgroundColor: getStatusColor(dailyNutrition.target_status) }]}>
              <Text style={styles.badgeText}>{getStatusText(dailyNutrition.target_status)}</Text>
            </View>
          )}
        </View>

        {dailyLoading ? (
          <ActivityIndicator size="small" color="#2196F3" />
        ) : dailyNutrition ? (
          <>
            {/* Calories Progress */}
            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>Calories</Text>
                <Text style={styles.progressValue}>
                  {dailyNutrition.total_calories} / {targetCalories}
                </Text>
              </View>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, {
                  width: `${caloriePercentage}%`,
                  backgroundColor: getStatusColor(dailyNutrition.target_status),
                }]} />
              </View>
            </View>

            {/* Protein Progress */}
            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>Protein</Text>
                <Text style={styles.progressValue}>
                  {Math.round(dailyNutrition.total_protein)}g / {targetProtein}g
                </Text>
              </View>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, {
                  width: `${proteinPercentage}%`,
                  backgroundColor: '#4CAF50',
                }]} />
              </View>
            </View>

            {/* Macros Summary */}
            <View style={styles.macrosRow}>
              <View style={styles.macroItem}>
                <Text style={styles.macroValue}>{Math.round(dailyNutrition.total_carbs)}g</Text>
                <Text style={styles.macroLabel}>Carbs</Text>
              </View>
              <View style={styles.macroItem}>
                <Text style={styles.macroValue}>{Math.round(dailyNutrition.total_fats)}g</Text>
                <Text style={styles.macroLabel}>Fats</Text>
              </View>
              <View style={styles.macroItem}>
                <Text style={styles.macroValue}>{dailyNutrition.meal_count}</Text>
                <Text style={styles.macroLabel}>Meals</Text>
              </View>
            </View>
          </>
        ) : (
          <Text style={styles.noDataText}>No meals logged today</Text>
        )}
      </View>

      {/* Log Meal Button */}
      <Pressable
        style={styles.logButton}
        onPress={() => setShowMealForm(!showMealForm)}
      >
        <FontAwesome name={showMealForm ? "minus" : "plus"} size={20} color="#fff" />
        <Text style={styles.logButtonText}>
          {showMealForm ? 'Cancel' : 'Log Meal'}
        </Text>
      </Pressable>

      {/* Meal Form */}
      {showMealForm && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Log a Meal</Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Meal Name *</Text>
            <TextInput
              style={styles.input}
              value={mealName}
              onChangeText={setMealName}
              placeholder="e.g., Breakfast, Lunch, Snack"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Calories *</Text>
            <TextInput
              style={styles.input}
              value={calories}
              onChangeText={setCalories}
              placeholder="e.g., 500"
              keyboardType="numeric"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.formRow}>
            <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Protein (g)</Text>
              <TextInput
                style={styles.input}
                value={protein}
                onChangeText={setProtein}
                placeholder="e.g., 30"
                keyboardType="numeric"
                placeholderTextColor="#999"
              />
            </View>

            <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>Carbs (g)</Text>
              <TextInput
                style={styles.input}
                value={carbs}
                onChangeText={setCarbs}
                placeholder="e.g., 50"
                keyboardType="numeric"
                placeholderTextColor="#999"
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Fats (g)</Text>
            <TextInput
              style={styles.input}
              value={fats}
              onChangeText={setFats}
              placeholder="e.g., 15"
              keyboardType="numeric"
              placeholderTextColor="#999"
            />
          </View>

          <Pressable
            style={[styles.submitButton, logMeal.isPending && styles.submitButtonDisabled]}
            onPress={handleLogMeal}
            disabled={logMeal.isPending}
          >
            {logMeal.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Log Meal</Text>
            )}
          </Pressable>
        </View>
      )}

      {/* Today's Meals */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Today's Meals</Text>

        {mealsLoading ? (
          <ActivityIndicator size="small" color="#2196F3" />
        ) : meals && meals.length > 0 ? (
          meals.map((meal) => (
            <View key={meal.id} style={styles.mealItem}>
              <View style={styles.mealInfo}>
                <Text style={styles.mealName}>{meal.meal_name}</Text>
                <Text style={styles.mealDetails}>
                  {meal.calories} cal
                  {meal.protein ? ` • ${Math.round(meal.protein)}g protein` : ''}
                  {meal.carbs ? ` • ${Math.round(meal.carbs)}g carbs` : ''}
                  {meal.fats ? ` • ${Math.round(meal.fats)}g fats` : ''}
                </Text>
              </View>
              <Pressable
                onPress={() => handleDeleteMeal(meal.id, meal.meal_name || 'this meal')}
                style={styles.deleteButton}
              >
                <FontAwesome name="trash-o" size={18} color="#F44336" />
              </Pressable>
            </View>
          ))
        ) : (
          <Text style={styles.noDataText}>No meals logged yet today</Text>
        )}
      </View>
    </ScrollView>
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
    marginBottom: 24,
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
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
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
  },
  progressSection: {
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  progressValue: {
    fontSize: 14,
    color: '#666',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  macrosRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  macroItem: {
    alignItems: 'center',
  },
  macroValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  macroLabel: {
    fontSize: 12,
    color: '#666',
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
  formGroup: {
    marginBottom: 16,
  },
  formRow: {
    flexDirection: 'row',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1a1a1a',
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  mealItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  mealInfo: {
    flex: 1,
  },
  mealName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  mealDetails: {
    fontSize: 14,
    color: '#666',
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
});
