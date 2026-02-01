-- Sam's Workout Coach - Seed Pre-Programmed Circuits
-- Migration: 20260201000002_seed_workout_circuits.sql
-- Creates Sam's Weekly Circuit Program with INFERNO, FORGE, TITAN, and SURGE workouts

-- This migration creates a template workout program that can be copied for new users
-- The program is not associated with any user initially - it will be copied when users sign up

-- ============================================================================
-- HELPER FUNCTION: Create circuits for a specific user
-- ============================================================================

CREATE OR REPLACE FUNCTION create_default_circuits_for_user(target_user_id UUID)
RETURNS UUID AS $$
DECLARE
  program_id UUID;
  inferno_id UUID;
  forge_id UUID;
  titan_id UUID;
  surge_id UUID;
  round_id UUID;

  -- Exercise IDs (lookup from existing exercises)
  ex_goblet_squat UUID;
  ex_walking_lunges UUID;
  ex_plank UUID;
  ex_jump_squats UUID;
  ex_bulgarian_split UUID;
  ex_russian_twists UUID;
  ex_mountain_climbers UUID;
  ex_dead_bug UUID;
  ex_pushups UUID;
  ex_overhead_press UUID;
  ex_dumbbell_bench UUID;
  ex_dips UUID;
  ex_side_plank UUID;
  ex_lateral_raises UUID;
  ex_ab_wheel UUID;
  ex_dumbbell_row UUID;
  ex_lat_pulldown UUID;
  ex_pullups UUID;
  ex_seated_cable_row UUID;
  ex_towel_pullups UUID;
  ex_face_pulls UUID;
  ex_hanging_leg_raises UUID;
  ex_kettlebell_swings UUID;
  ex_burpees UUID;
  ex_box_jumps UUID;
  ex_medicine_ball_slams UUID;
  ex_battle_ropes UUID;
  ex_sprawls UUID;
  ex_turkish_getup UUID;

BEGIN
  -- Lookup exercise IDs
  SELECT id INTO ex_goblet_squat FROM exercises WHERE name = 'Goblet Squat' AND is_default = true;
  SELECT id INTO ex_walking_lunges FROM exercises WHERE name = 'Walking Lunges' AND is_default = true;
  SELECT id INTO ex_plank FROM exercises WHERE name = 'Plank' AND is_default = true;
  SELECT id INTO ex_jump_squats FROM exercises WHERE name = 'Jump Squats' AND is_default = true;
  SELECT id INTO ex_bulgarian_split FROM exercises WHERE name = 'Bulgarian Split Squat' AND is_default = true;
  SELECT id INTO ex_russian_twists FROM exercises WHERE name = 'Russian Twists' AND is_default = true;
  SELECT id INTO ex_mountain_climbers FROM exercises WHERE name = 'Mountain Climbers' AND is_default = true;
  SELECT id INTO ex_dead_bug FROM exercises WHERE name = 'Dead Bug' AND is_default = true;
  SELECT id INTO ex_pushups FROM exercises WHERE name = 'Push-ups' AND is_default = true;
  SELECT id INTO ex_overhead_press FROM exercises WHERE name = 'Overhead Press' AND is_default = true;
  SELECT id INTO ex_dumbbell_bench FROM exercises WHERE name = 'Dumbbell Bench Press' AND is_default = true;
  SELECT id INTO ex_dips FROM exercises WHERE name = 'Dips' AND is_default = true;
  SELECT id INTO ex_side_plank FROM exercises WHERE name = 'Side Plank' AND is_default = true;
  SELECT id INTO ex_lateral_raises FROM exercises WHERE name = 'Lateral Raises' AND is_default = true;
  SELECT id INTO ex_ab_wheel FROM exercises WHERE name = 'Ab Wheel Rollout' AND is_default = true;
  SELECT id INTO ex_dumbbell_row FROM exercises WHERE name = 'Dumbbell Row' AND is_default = true;
  SELECT id INTO ex_lat_pulldown FROM exercises WHERE name = 'Lat Pulldown' AND is_default = true;
  SELECT id INTO ex_pullups FROM exercises WHERE name = 'Pull-ups' AND is_default = true;
  SELECT id INTO ex_seated_cable_row FROM exercises WHERE name = 'Seated Cable Row' AND is_default = true;
  SELECT id INTO ex_towel_pullups FROM exercises WHERE name = 'Towel Pull-ups' AND is_default = true;
  SELECT id INTO ex_face_pulls FROM exercises WHERE name = 'Face Pulls' AND is_default = true;
  SELECT id INTO ex_hanging_leg_raises FROM exercises WHERE name = 'Hanging Leg Raises' AND is_default = true;
  SELECT id INTO ex_kettlebell_swings FROM exercises WHERE name = 'Kettlebell Swings' AND is_default = true;
  SELECT id INTO ex_burpees FROM exercises WHERE name = 'Burpees' AND is_default = true;
  SELECT id INTO ex_box_jumps FROM exercises WHERE name = 'Box Jumps' AND is_default = true;
  SELECT id INTO ex_medicine_ball_slams FROM exercises WHERE name = 'Medicine Ball Slams' AND is_default = true;
  SELECT id INTO ex_battle_ropes FROM exercises WHERE name = 'Battle Ropes' AND is_default = true;
  SELECT id INTO ex_sprawls FROM exercises WHERE name = 'Sprawls' AND is_default = true;
  SELECT id INTO ex_turkish_getup FROM exercises WHERE name = 'Turkish Get-up' AND is_default = true;

  -- Create the workout program
  INSERT INTO workout_programs (user_id, name, description, source, is_active)
  VALUES (
    target_user_id,
    'Sam''s Weekly Circuit Program',
    'High-intensity circuit training designed for BJJ athletes. 4 workouts per week targeting legs, push, pull, and full-body conditioning. Each workout has 3 rounds: Foundation, Intensity, and Burnout.',
    'Pre-programmed',
    true
  )
  RETURNING id INTO program_id;

  -- ============================================================================
  -- INFERNO (Tuesday) - Legs + Core Power
  -- ============================================================================
  INSERT INTO workouts (program_id, name, description, day_of_week, duration_estimate)
  VALUES (
    program_id,
    'INFERNO',
    'Legs + Core Power. Builds explosive leg strength and core stability. Warm up with 5 min dynamic stretching. Cool down with 5 min leg stretching.',
    2, -- Tuesday
    45
  )
  RETURNING id INTO inferno_id;

  -- INFERNO Round 1: Foundation
  INSERT INTO workout_rounds (workout_id, round_number, name, rest_after_round, notes)
  VALUES (inferno_id, 1, 'Foundation', 90, 'Focus on form and control. Moderate intensity.')
  RETURNING id INTO round_id;

  INSERT INTO workout_exercises (round_id, exercise_id, order_in_round, target_reps, rest_after_exercise)
  VALUES
    (round_id, ex_goblet_squat, 1, 15, 30),
    (round_id, ex_walking_lunges, 2, 20, 30),
    (round_id, ex_plank, 3, NULL, 60);

  UPDATE workout_exercises SET target_time = 45 WHERE round_id = round_id AND exercise_id = ex_plank;

  -- INFERNO Round 2: Intensity
  INSERT INTO workout_rounds (workout_id, round_number, name, rest_after_round, notes)
  VALUES (inferno_id, 2, 'Intensity', 90, 'Increase weight/speed. Push hard but maintain form.')
  RETURNING id INTO round_id;

  INSERT INTO workout_exercises (round_id, exercise_id, order_in_round, target_reps, rest_after_exercise)
  VALUES
    (round_id, ex_jump_squats, 1, 15, 30),
    (round_id, ex_bulgarian_split, 2, 12, 30),
    (round_id, ex_russian_twists, 3, 30, 60);

  -- INFERNO Round 3: Burnout
  INSERT INTO workout_rounds (workout_id, round_number, name, rest_after_round, notes)
  VALUES (inferno_id, 3, 'Burnout', 0, 'Maximum effort! Go until failure.')
  RETURNING id INTO round_id;

  INSERT INTO workout_exercises (round_id, exercise_id, order_in_round, target_reps, rest_after_exercise)
  VALUES
    (round_id, ex_jump_squats, 1, 20, 20),
    (round_id, ex_mountain_climbers, 2, 40, 20),
    (round_id, ex_dead_bug, 3, 20, 0);

  -- ============================================================================
  -- FORGE (Wednesday) - Push + Core Stability
  -- ============================================================================
  INSERT INTO workouts (program_id, name, description, day_of_week, duration_estimate)
  VALUES (
    program_id,
    'FORGE',
    'Push + Core Stability. Chest, shoulders, triceps with core work. Warm up with arm circles and light band work. Cool down with upper body stretching.',
    3, -- Wednesday
    45
  )
  RETURNING id INTO forge_id;

  -- FORGE Round 1: Foundation
  INSERT INTO workout_rounds (workout_id, round_number, name, rest_after_round, notes)
  VALUES (forge_id, 1, 'Foundation', 90, 'Controlled tempo. Feel the muscle engagement.')
  RETURNING id INTO round_id;

  INSERT INTO workout_exercises (round_id, exercise_id, order_in_round, target_reps, rest_after_exercise)
  VALUES
    (round_id, ex_pushups, 1, 15, 30),
    (round_id, ex_overhead_press, 2, 12, 30),
    (round_id, ex_plank, 3, NULL, 60);

  UPDATE workout_exercises SET target_time = 45 WHERE round_id = round_id AND exercise_id = ex_plank;

  -- FORGE Round 2: Intensity
  INSERT INTO workout_rounds (workout_id, round_number, name, rest_after_round, notes)
  VALUES (forge_id, 2, 'Intensity', 90, 'Increase load. Push through the burn.')
  RETURNING id INTO round_id;

  INSERT INTO workout_exercises (round_id, exercise_id, order_in_round, target_reps, rest_after_exercise)
  VALUES
    (round_id, ex_dumbbell_bench, 1, 10, 30),
    (round_id, ex_dips, 2, 12, 30),
    (round_id, ex_side_plank, 3, NULL, 60);

  UPDATE workout_exercises SET target_time = 30 WHERE round_id = round_id AND exercise_id = ex_side_plank;

  -- FORGE Round 3: Burnout
  INSERT INTO workout_rounds (workout_id, round_number, name, rest_after_round, notes)
  VALUES (forge_id, 3, 'Burnout', 0, 'AMRAP! Leave nothing in the tank.')
  RETURNING id INTO round_id;

  INSERT INTO workout_exercises (round_id, exercise_id, order_in_round, target_reps, rest_after_exercise)
  VALUES
    (round_id, ex_pushups, 1, 20, 20),
    (round_id, ex_lateral_raises, 2, 15, 20),
    (round_id, ex_ab_wheel, 3, 10, 0);

  -- ============================================================================
  -- TITAN (Friday) - Pull + Rotational Power
  -- ============================================================================
  INSERT INTO workouts (program_id, name, description, day_of_week, duration_estimate)
  VALUES (
    program_id,
    'TITAN',
    'Pull + Rotational Power. Back, biceps, and rotational core strength for grappling. Warm up with band pull-aparts and scapular activation. Cool down with thoracic stretching.',
    5, -- Friday
    45
  )
  RETURNING id INTO titan_id;

  -- TITAN Round 1: Foundation
  INSERT INTO workout_rounds (workout_id, round_number, name, rest_after_round, notes)
  VALUES (titan_id, 1, 'Foundation', 90, 'Full range of motion. Squeeze at the top.')
  RETURNING id INTO round_id;

  INSERT INTO workout_exercises (round_id, exercise_id, order_in_round, target_reps, rest_after_exercise)
  VALUES
    (round_id, ex_dumbbell_row, 1, 12, 30),
    (round_id, ex_lat_pulldown, 2, 12, 30),
    (round_id, ex_dead_bug, 3, 16, 60);

  -- TITAN Round 2: Intensity
  INSERT INTO workout_rounds (workout_id, round_number, name, rest_after_round, notes)
  VALUES (titan_id, 2, 'Intensity', 90, 'Heavier weight. Explosive pulls.')
  RETURNING id INTO round_id;

  INSERT INTO workout_exercises (round_id, exercise_id, order_in_round, target_reps, rest_after_exercise)
  VALUES
    (round_id, ex_pullups, 1, 8, 30),
    (round_id, ex_seated_cable_row, 2, 12, 30),
    (round_id, ex_russian_twists, 3, 30, 60);

  -- TITAN Round 3: Burnout
  INSERT INTO workout_rounds (workout_id, round_number, name, rest_after_round, notes)
  VALUES (titan_id, 3, 'Burnout', 0, 'Grip strength and endurance focus!')
  RETURNING id INTO round_id;

  INSERT INTO workout_exercises (round_id, exercise_id, order_in_round, target_reps, rest_after_exercise)
  VALUES
    (round_id, ex_towel_pullups, 1, 6, 20),
    (round_id, ex_face_pulls, 2, 20, 20),
    (round_id, ex_hanging_leg_raises, 3, 12, 0);

  -- ============================================================================
  -- SURGE (Sunday) - Full Body HIIT
  -- ============================================================================
  INSERT INTO workouts (program_id, name, description, day_of_week, duration_estimate)
  VALUES (
    program_id,
    'SURGE',
    'Full Body HIIT. High-intensity functional movements for overall conditioning and fat loss. Warm up with jump rope and dynamic movements. Cool down with full body stretching.',
    0, -- Sunday
    45
  )
  RETURNING id INTO surge_id;

  -- SURGE Round 1: Foundation
  INSERT INTO workout_rounds (workout_id, round_number, name, rest_after_round, notes)
  VALUES (surge_id, 1, 'Foundation', 90, 'Get the heart rate up. Steady pace.')
  RETURNING id INTO round_id;

  INSERT INTO workout_exercises (round_id, exercise_id, order_in_round, target_reps, rest_after_exercise)
  VALUES
    (round_id, ex_kettlebell_swings, 1, 20, 30),
    (round_id, ex_burpees, 2, 10, 30),
    (round_id, ex_plank, 3, NULL, 60);

  UPDATE workout_exercises SET target_time = 45 WHERE round_id = round_id AND exercise_id = ex_plank;

  -- SURGE Round 2: Intensity
  INSERT INTO workout_rounds (workout_id, round_number, name, rest_after_round, notes)
  VALUES (surge_id, 2, 'Intensity', 90, 'All-out effort. Maximum power.')
  RETURNING id INTO round_id;

  INSERT INTO workout_exercises (round_id, exercise_id, order_in_round, target_reps, rest_after_exercise)
  VALUES
    (round_id, ex_box_jumps, 1, 15, 30),
    (round_id, ex_medicine_ball_slams, 2, 20, 30),
    (round_id, ex_mountain_climbers, 3, 40, 60);

  -- SURGE Round 3: Burnout
  INSERT INTO workout_rounds (workout_id, round_number, name, rest_after_round, notes)
  VALUES (surge_id, 3, 'Burnout', 0, 'Final push! Finish strong!')
  RETURNING id INTO round_id;

  INSERT INTO workout_exercises (round_id, exercise_id, order_in_round, target_reps, rest_after_exercise)
  VALUES
    (round_id, ex_battle_ropes, 1, NULL, 20),
    (round_id, ex_sprawls, 2, 15, 20),
    (round_id, ex_turkish_getup, 3, 6, 0);

  UPDATE workout_exercises SET target_time = 30 WHERE round_id = round_id AND exercise_id = ex_battle_ropes;

  RETURN program_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENT
-- ============================================================================

COMMENT ON FUNCTION create_default_circuits_for_user IS 'Creates the default Sam''s Weekly Circuit Program for a new user. Call this during onboarding.';
