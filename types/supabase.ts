/**
 * Supabase Database Types
 *
 * TODO: Generate these types from your Supabase schema using:
 * npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/supabase.ts
 *
 * This is a placeholder type definition. Replace with generated types once database is set up.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string
          current_weight: number | null
          goal_weight: number | null
          height: number | null
          age: number | null
          daily_calorie_target: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          current_weight?: number | null
          goal_weight?: number | null
          height?: number | null
          age?: number | null
          daily_calorie_target?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          current_weight?: number | null
          goal_weight?: number | null
          height?: number | null
          age?: number | null
          daily_calorie_target?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      // Add other table types as needed
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      intensity_level: 'light' | 'moderate' | 'hard'
      activity_type: 'bjj' | 'softball' | 'other'
      target_status: 'under' | 'on_track' | 'over'
      recommendation_type: 'progression' | 'deload' | 'exercise_swap'
      recommendation_status: 'pending' | 'accepted' | 'rejected'
    }
  }
}
