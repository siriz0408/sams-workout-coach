/**
 * Workout Session Store (Zustand)
 * Manages ephemeral state during active workout logging
 */

import { create } from 'zustand';

export interface ExerciseLog {
  exerciseId: string;
  exerciseName: string;
  roundNumber: number;
  sets: {
    weight?: number;
    reps?: number;
    time?: number;  // seconds
    notes?: string;
  }[];
}

interface WorkoutSessionState {
  // Session data
  sessionId: string | null;
  workoutId: string | null;
  workoutName: string | null;
  startedAt: Date | null;

  // Exercise tracking
  currentExerciseId: string | null;
  loggedExercises: Map<string, ExerciseLog>;  // exerciseId -> ExerciseLog

  // Actions
  startSession: (workoutId: string, workoutName: string) => void;
  setCurrentExercise: (exerciseId: string | null) => void;
  logSet: (
    exerciseId: string,
    exerciseName: string,
    roundNumber: number,
    set: { weight?: number; reps?: number; time?: number; notes?: string }
  ) => void;
  removeLastSet: (exerciseId: string) => void;
  completeSession: () => void;
  resetSession: () => void;

  // Computed
  getTotalSets: () => number;
  getExerciseLog: (exerciseId: string) => ExerciseLog | undefined;
  isExerciseLogged: (exerciseId: string) => boolean;
}

export const useWorkoutSession = create<WorkoutSessionState>((set, get) => ({
  // Initial state
  sessionId: null,
  workoutId: null,
  workoutName: null,
  startedAt: null,
  currentExerciseId: null,
  loggedExercises: new Map(),

  // Start a new workout session
  startSession: (workoutId, workoutName) => {
    set({
      sessionId: crypto.randomUUID(),
      workoutId,
      workoutName,
      startedAt: new Date(),
      loggedExercises: new Map(),
      currentExerciseId: null,
    });
  },

  // Set the currently active exercise
  setCurrentExercise: (exerciseId) => {
    set({ currentExerciseId: exerciseId });
  },

  // Log a set for an exercise
  logSet: (exerciseId, exerciseName, roundNumber, set) => {
    set((state) => {
      const newLogs = new Map(state.loggedExercises);
      const existing = newLogs.get(exerciseId);

      if (existing) {
        // Add to existing exercise log
        existing.sets.push(set);
      } else {
        // Create new exercise log
        newLogs.set(exerciseId, {
          exerciseId,
          exerciseName,
          roundNumber,
          sets: [set],
        });
      }

      return { loggedExercises: newLogs };
    });
  },

  // Remove the last set from an exercise
  removeLastSet: (exerciseId) => {
    set((state) => {
      const newLogs = new Map(state.loggedExercises);
      const existing = newLogs.get(exerciseId);

      if (existing && existing.sets.length > 0) {
        existing.sets.pop();
        if (existing.sets.length === 0) {
          newLogs.delete(exerciseId);
        }
      }

      return { loggedExercises: newLogs };
    });
  },

  // Complete the session (to be followed by API call)
  completeSession: () => {
    // Keep session data for API call, but mark as completed
    // Actual reset happens after successful API call
  },

  // Reset session state
  resetSession: () => {
    set({
      sessionId: null,
      workoutId: null,
      workoutName: null,
      startedAt: null,
      currentExerciseId: null,
      loggedExercises: new Map(),
    });
  },

  // Get total number of sets logged
  getTotalSets: () => {
    const { loggedExercises } = get();
    let total = 0;
    loggedExercises.forEach((log) => {
      total += log.sets.length;
    });
    return total;
  },

  // Get exercise log by ID
  getExerciseLog: (exerciseId) => {
    return get().loggedExercises.get(exerciseId);
  },

  // Check if exercise has been logged
  isExerciseLogged: (exerciseId) => {
    return get().loggedExercises.has(exerciseId);
  },
}));
