/**
 * Discovery State Store (Zustand)
 * Manages UI state for AI workout discovery flow
 */

import { create } from 'zustand';

export type DiscoveryMode = 'form' | 'chat';

export interface ProgramOption {
  id: string;
  name: string;
  description: string;
  source: string;
  source_url?: string;
  days_per_week: number;
  estimated_duration_per_session: number;
  // Full workout details would be here
}

interface DiscoveryStateStore {
  // Mode selection
  mode: DiscoveryMode;
  setMode: (mode: DiscoveryMode) => void;

  // Form-based discovery state
  formGoals: string[];
  formConstraints: string[];
  formEquipment: string[];
  formDaysPerWeek: number;
  formExperienceLevel: 'beginner' | 'intermediate' | 'advanced';

  setFormGoals: (goals: string[]) => void;
  setFormConstraints: (constraints: string[]) => void;
  setFormEquipment: (equipment: string[]) => void;
  setFormDaysPerWeek: (days: number) => void;
  setFormExperienceLevel: (level: 'beginner' | 'intermediate' | 'advanced') => void;

  // Chat-based discovery state
  chatMessages: { role: 'user' | 'assistant'; content: string }[];
  addChatMessage: (role: 'user' | 'assistant', content: string) => void;
  clearChat: () => void;

  // Results state
  discoveredPrograms: ProgramOption[];
  selectedProgramId: string | null;

  setDiscoveredPrograms: (programs: ProgramOption[]) => void;
  setSelectedProgram: (id: string | null) => void;

  // Loading and error
  isLoading: boolean;
  error: string | null;

  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Reset
  resetDiscovery: () => void;
}

export const useDiscoveryState = create<DiscoveryStateStore>((set) => ({
  // Initial state
  mode: 'form',
  formGoals: [],
  formConstraints: [],
  formEquipment: [],
  formDaysPerWeek: 3,
  formExperienceLevel: 'intermediate',
  chatMessages: [],
  discoveredPrograms: [],
  selectedProgramId: null,
  isLoading: false,
  error: null,

  // Actions
  setMode: (mode) => set({ mode }),

  setFormGoals: (goals) => set({ formGoals: goals }),
  setFormConstraints: (constraints) => set({ formConstraints: constraints }),
  setFormEquipment: (equipment) => set({ formEquipment: equipment }),
  setFormDaysPerWeek: (days) => set({ formDaysPerWeek: days }),
  setFormExperienceLevel: (level) => set({ formExperienceLevel: level }),

  addChatMessage: (role, content) =>
    set((state) => ({
      chatMessages: [...state.chatMessages, { role, content }],
    })),
  clearChat: () => set({ chatMessages: [] }),

  setDiscoveredPrograms: (programs) => set({ discoveredPrograms: programs }),
  setSelectedProgram: (id) => set({ selectedProgramId: id }),

  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  resetDiscovery: () =>
    set({
      formGoals: [],
      formConstraints: [],
      formEquipment: [],
      formDaysPerWeek: 3,
      formExperienceLevel: 'intermediate',
      chatMessages: [],
      discoveredPrograms: [],
      selectedProgramId: null,
      isLoading: false,
      error: null,
    }),
}));
