-- Sam's Workout Coach - Initial Database Schema
-- Migration: 20260201000000_initial_schema.sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

CREATE TYPE intensity_level AS ENUM ('light', 'moderate', 'hard');
CREATE TYPE activity_type AS ENUM ('bjj', 'softball', 'other');
CREATE TYPE target_status AS ENUM ('under', 'on_track', 'over');
CREATE TYPE recommendation_type AS ENUM ('progression', 'deload', 'exercise_swap');
CREATE TYPE recommendation_status AS ENUM ('pending', 'accepted', 'rejected');

-- ============================================================================
-- TABLES
-- ============================================================================

-- User profiles (extends Supabase auth.users)
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_weight DECIMAL(5,2),
  goal_weight DECIMAL(5,2),
  height INTEGER,  -- inches
  age INTEGER,
  daily_calorie_target INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Exercise library (shared + user custom)
CREATE TABLE exercises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  muscle_groups TEXT[],
  equipment TEXT[],
  ai_form_cues TEXT,
  video_url TEXT,
  is_default BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workout programs
CREATE TABLE workout_programs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  source TEXT,  -- e.g., "AI Generated", "Reddit r/fitness", "Manual"
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workouts (templates within programs)
CREATE TABLE workouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  program_id UUID NOT NULL REFERENCES workout_programs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6),
  duration_estimate INTEGER,  -- minutes
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workout rounds
CREATE TABLE workout_rounds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workout_id UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  name TEXT,
  rest_after_round INTEGER,  -- seconds
  notes TEXT
);

-- Workout exercises (exercises within rounds)
CREATE TABLE workout_exercises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  round_id UUID NOT NULL REFERENCES workout_rounds(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  order_in_round INTEGER NOT NULL,
  target_reps INTEGER,
  target_time INTEGER,  -- seconds
  rest_after_exercise INTEGER,  -- seconds
  notes TEXT
);

-- User workout sessions (logged workouts)
CREATE TABLE user_workout_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workout_id UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  duration_minutes INTEGER,
  subjective_rating INTEGER CHECK (subjective_rating >= 1 AND subjective_rating <= 5),
  notes TEXT,
  ai_analysis JSONB,  -- AI post-workout analysis
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Exercise logs (individual exercise performance)
CREATE TABLE exercise_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES user_workout_sessions(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  weight_used DECIMAL(6,2),  -- lbs
  reps_completed INTEGER,
  time_completed INTEGER,  -- seconds
  notes TEXT,
  logged_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity logs (BJJ, softball, etc.)
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type activity_type NOT NULL,
  date DATE NOT NULL,
  intensity intensity_level NOT NULL,
  duration_minutes INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Body measurements
CREATE TABLE body_measurements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  measured_at TIMESTAMPTZ NOT NULL,
  weight DECIMAL(5,2) NOT NULL,  -- lbs
  body_fat_pct DECIMAL(4,2),
  additional_measurements JSONB
);

-- Nutrition logs
CREATE TABLE nutrition_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  calories INTEGER NOT NULL,
  target_status target_status NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI recommendations
CREATE TABLE ai_recommendations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recommendation_type recommendation_type NOT NULL,
  exercise_id UUID REFERENCES exercises(id),
  current_value TEXT,
  suggested_value TEXT,
  reasoning TEXT NOT NULL,
  status recommendation_status DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- User's active program and workouts
CREATE INDEX idx_workout_programs_user_active ON workout_programs(user_id, is_active) WHERE is_active = true;
CREATE INDEX idx_workouts_program ON workouts(program_id);
CREATE INDEX idx_workout_rounds_workout ON workout_rounds(workout_id);
CREATE INDEX idx_workout_exercises_round ON workout_exercises(round_id);

-- Recent workout sessions and logs
CREATE INDEX idx_user_workout_sessions_user_date ON user_workout_sessions(user_id, started_at DESC);
CREATE INDEX idx_exercise_logs_session ON exercise_logs(session_id);

-- Exercise performance history for AI analysis (partial index)
CREATE INDEX idx_exercise_logs_exercise_completed ON exercise_logs(exercise_id, logged_at DESC)
  WHERE weight_used IS NOT NULL OR reps_completed IS NOT NULL;

-- Body weight tracking
CREATE INDEX idx_body_measurements_user_date ON body_measurements(user_id, measured_at DESC);

-- Activity logs for recovery analysis
CREATE INDEX idx_activity_logs_user_date ON activity_logs(user_id, date DESC);

-- Pending AI recommendations (partial index)
CREATE INDEX idx_ai_recommendations_pending ON ai_recommendations(user_id, created_at DESC)
  WHERE status = 'pending';

-- Nutrition tracking
CREATE INDEX idx_nutrition_logs_user_date ON nutrition_logs(user_id, date DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE body_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_recommendations ENABLE ROW LEVEL SECURITY;

-- User profiles policies
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Workout programs policies
CREATE POLICY "Users can manage own programs" ON workout_programs
  FOR ALL USING (auth.uid() = user_id);

-- Workouts policies (cascade from programs)
CREATE POLICY "Users can view workouts in their programs" ON workouts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM workout_programs WHERE id = workouts.program_id AND user_id = auth.uid())
  );
CREATE POLICY "Users can manage workouts in their programs" ON workouts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM workout_programs WHERE id = workouts.program_id AND user_id = auth.uid())
  );

-- Workout rounds policies
CREATE POLICY "Users can view rounds in their workouts" ON workout_rounds
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workouts w
      JOIN workout_programs wp ON w.program_id = wp.id
      WHERE w.id = workout_rounds.workout_id AND wp.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can manage rounds in their workouts" ON workout_rounds
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workouts w
      JOIN workout_programs wp ON w.program_id = wp.id
      WHERE w.id = workout_rounds.workout_id AND wp.user_id = auth.uid()
    )
  );

-- Workout exercises policies
CREATE POLICY "Users can view exercises in their rounds" ON workout_exercises
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workout_rounds wr
      JOIN workouts w ON wr.workout_id = w.id
      JOIN workout_programs wp ON w.program_id = wp.id
      WHERE wr.id = workout_exercises.round_id AND wp.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can manage exercises in their rounds" ON workout_exercises
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workout_rounds wr
      JOIN workouts w ON wr.workout_id = w.id
      JOIN workout_programs wp ON w.program_id = wp.id
      WHERE wr.id = workout_exercises.round_id AND wp.user_id = auth.uid()
    )
  );

-- User workout sessions policies
CREATE POLICY "Users can manage own sessions" ON user_workout_sessions
  FOR ALL USING (auth.uid() = user_id);

-- Exercise logs policies
CREATE POLICY "Users can manage own exercise logs" ON exercise_logs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_workout_sessions WHERE id = exercise_logs.session_id AND user_id = auth.uid())
  );

-- Exercises table policies (read defaults, manage own)
CREATE POLICY "Users can view default exercises" ON exercises
  FOR SELECT USING (is_default = true);
CREATE POLICY "Users can view own exercises" ON exercises
  FOR SELECT USING (auth.uid() = created_by);
CREATE POLICY "Users can insert own exercises" ON exercises
  FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update own exercises" ON exercises
  FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Users can delete own exercises" ON exercises
  FOR DELETE USING (auth.uid() = created_by);

-- Activity logs, measurements, nutrition, recommendations policies
CREATE POLICY "Users can manage own activities" ON activity_logs
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own measurements" ON body_measurements
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own nutrition" ON nutrition_logs
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own recommendations" ON ai_recommendations
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workout_programs_updated_at
  BEFORE UPDATE ON workout_programs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE user_profiles IS 'User profile data extending Supabase auth.users';
COMMENT ON TABLE exercises IS 'Shared exercise library (is_default=true) and user custom exercises';
COMMENT ON TABLE workout_programs IS 'User workout programs (can have multiple, one active)';
COMMENT ON TABLE workouts IS 'Individual workout templates within a program';
COMMENT ON TABLE workout_rounds IS 'Rounds/circuits within a workout';
COMMENT ON TABLE workout_exercises IS 'Exercises within a round with targets';
COMMENT ON TABLE user_workout_sessions IS 'Logged workout sessions with AI analysis';
COMMENT ON TABLE exercise_logs IS 'Individual exercise performance within a session';
COMMENT ON TABLE activity_logs IS 'BJJ, softball, and other activities for recovery tracking';
COMMENT ON TABLE body_measurements IS 'Weight and body composition tracking';
COMMENT ON TABLE nutrition_logs IS 'Daily calorie tracking';
COMMENT ON TABLE ai_recommendations IS 'AI-generated training recommendations pending approval';
