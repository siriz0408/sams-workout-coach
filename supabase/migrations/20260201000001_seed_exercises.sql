-- Sam's Workout Coach - Seed Exercise Library
-- Migration: 20260201000001_seed_exercises.sql
-- Populates exercise library with 50 common exercises

INSERT INTO exercises (name, muscle_groups, equipment, is_default) VALUES
  -- Lower Body
  ('Goblet Squat', ARRAY['legs', 'core'], ARRAY['dumbbell', 'kettlebell'], true),
  ('Barbell Back Squat', ARRAY['legs', 'core'], ARRAY['barbell'], true),
  ('Romanian Deadlift', ARRAY['legs', 'back'], ARRAY['barbell', 'dumbbell'], true),
  ('Bulgarian Split Squat', ARRAY['legs'], ARRAY['dumbbell'], true),
  ('Leg Press', ARRAY['legs'], ARRAY['machine'], true),
  ('Walking Lunges', ARRAY['legs'], ARRAY['bodyweight', 'dumbbell'], true),
  ('Jump Squats', ARRAY['legs'], ARRAY['bodyweight'], true),
  ('Leg Curl', ARRAY['legs'], ARRAY['machine'], true),
  ('Leg Extension', ARRAY['legs'], ARRAY['machine'], true),
  ('Calf Raises', ARRAY['legs'], ARRAY['bodyweight', 'dumbbell'], true),

  -- Upper Body Push
  ('Push-ups', ARRAY['chest', 'triceps', 'shoulders'], ARRAY['bodyweight'], true),
  ('Bench Press', ARRAY['chest', 'triceps', 'shoulders'], ARRAY['barbell'], true),
  ('Dumbbell Bench Press', ARRAY['chest', 'triceps', 'shoulders'], ARRAY['dumbbell'], true),
  ('Overhead Press', ARRAY['shoulders', 'triceps'], ARRAY['barbell', 'dumbbell'], true),
  ('Incline Dumbbell Press', ARRAY['chest', 'shoulders'], ARRAY['dumbbell'], true),
  ('Dips', ARRAY['chest', 'triceps'], ARRAY['bodyweight'], true),
  ('Tricep Pushdown', ARRAY['triceps'], ARRAY['cable'], true),
  ('Overhead Tricep Extension', ARRAY['triceps'], ARRAY['dumbbell'], true),
  ('Lateral Raises', ARRAY['shoulders'], ARRAY['dumbbell'], true),
  ('Front Raises', ARRAY['shoulders'], ARRAY['dumbbell'], true),

  -- Upper Body Pull
  ('Pull-ups', ARRAY['back', 'biceps'], ARRAY['bodyweight', 'pull-up bar'], true),
  ('Chin-ups', ARRAY['back', 'biceps'], ARRAY['bodyweight', 'pull-up bar'], true),
  ('Bent Over Barbell Row', ARRAY['back', 'biceps'], ARRAY['barbell'], true),
  ('Dumbbell Row', ARRAY['back', 'biceps'], ARRAY['dumbbell'], true),
  ('Lat Pulldown', ARRAY['back', 'biceps'], ARRAY['cable', 'machine'], true),
  ('Seated Cable Row', ARRAY['back', 'biceps'], ARRAY['cable'], true),
  ('Face Pulls', ARRAY['back', 'shoulders'], ARRAY['cable'], true),
  ('Bicep Curls', ARRAY['biceps'], ARRAY['dumbbell', 'barbell'], true),
  ('Hammer Curls', ARRAY['biceps', 'forearms'], ARRAY['dumbbell'], true),
  ('Preacher Curls', ARRAY['biceps'], ARRAY['dumbbell', 'barbell'], true),

  -- Core
  ('Plank', ARRAY['core'], ARRAY['bodyweight'], true),
  ('Side Plank', ARRAY['core'], ARRAY['bodyweight'], true),
  ('Dead Bug', ARRAY['core'], ARRAY['bodyweight'], true),
  ('Russian Twists', ARRAY['core'], ARRAY['bodyweight', 'dumbbell'], true),
  ('Hanging Leg Raises', ARRAY['core'], ARRAY['pull-up bar'], true),
  ('Cable Crunches', ARRAY['core'], ARRAY['cable'], true),
  ('Ab Wheel Rollout', ARRAY['core'], ARRAY['ab wheel'], true),
  ('Mountain Climbers', ARRAY['core', 'cardio'], ARRAY['bodyweight'], true),

  -- Full Body / Functional
  ('Burpees', ARRAY['full body', 'cardio'], ARRAY['bodyweight'], true),
  ('Kettlebell Swings', ARRAY['legs', 'back', 'core'], ARRAY['kettlebell'], true),
  ('Farmers Carry', ARRAY['forearms', 'core', 'legs'], ARRAY['dumbbell', 'kettlebell'], true),
  ('Box Jumps', ARRAY['legs', 'cardio'], ARRAY['box'], true),
  ('Battle Ropes', ARRAY['arms', 'shoulders', 'cardio'], ARRAY['battle ropes'], true),
  ('Medicine Ball Slams', ARRAY['core', 'shoulders', 'cardio'], ARRAY['medicine ball'], true),

  -- BJJ/Grappling Specific
  ('Grip Strength Hangs', ARRAY['forearms', 'back'], ARRAY['pull-up bar'], true),
  ('Towel Pull-ups', ARRAY['back', 'forearms'], ARRAY['pull-up bar', 'towel'], true),
  ('Bridge Hold', ARRAY['neck', 'back', 'core'], ARRAY['bodyweight'], true),
  ('Sprawls', ARRAY['legs', 'core', 'cardio'], ARRAY['bodyweight'], true),
  ('Turkish Get-up', ARRAY['full body', 'core'], ARRAY['kettlebell', 'dumbbell'], true),
  ('Resistance Band Face Pulls', ARRAY['back', 'shoulders'], ARRAY['resistance band'], true);
