-- Sam's Workout Coach - Update Nutrition Schema for Meal-Level Tracking
-- Migration: 20260201000003_update_nutrition_schema.sql
-- Adds protein, carbs, fats, and meal_name columns to support individual meal logging

-- ============================================================================
-- ALTER NUTRITION_LOGS TABLE
-- ============================================================================

-- Add macro columns for detailed tracking
ALTER TABLE nutrition_logs
  ADD COLUMN protein DECIMAL(6,2),  -- grams of protein
  ADD COLUMN carbs DECIMAL(6,2),    -- grams of carbohydrates
  ADD COLUMN fats DECIMAL(6,2),     -- grams of fats
  ADD COLUMN meal_name TEXT;        -- e.g., "Breakfast", "Lunch", "Dinner", "Snack"

-- Make target_status nullable since it can be calculated from calories
ALTER TABLE nutrition_logs
  ALTER COLUMN target_status DROP NOT NULL;

-- ============================================================================
-- ADD HELPFUL VIEW FOR DAILY NUTRITION TOTALS
-- ============================================================================

CREATE OR REPLACE VIEW daily_nutrition_summary AS
SELECT
  user_id,
  date,
  SUM(calories) as total_calories,
  SUM(protein) as total_protein,
  SUM(carbs) as total_carbs,
  SUM(fats) as total_fats,
  COUNT(*) as meal_count,
  array_agg(meal_name ORDER BY created_at) as meals,
  MAX(created_at) as last_updated
FROM nutrition_logs
GROUP BY user_id, date
ORDER BY date DESC;

-- Apply RLS to the view (inherits from nutrition_logs)
ALTER VIEW daily_nutrition_summary SET (security_barrier = true);

-- ============================================================================
-- HELPER FUNCTION: Calculate if on track with targets
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_target_status(
  actual_calories INTEGER,
  target_calories INTEGER,
  tolerance_pct DECIMAL DEFAULT 0.10
)
RETURNS target_status AS $$
BEGIN
  IF actual_calories < target_calories * (1 - tolerance_pct) THEN
    RETURN 'under';
  ELSIF actual_calories > target_calories * (1 + tolerance_pct) THEN
    RETURN 'over';
  ELSE
    RETURN 'on_track';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN nutrition_logs.protein IS 'Grams of protein in this meal';
COMMENT ON COLUMN nutrition_logs.carbs IS 'Grams of carbohydrates in this meal';
COMMENT ON COLUMN nutrition_logs.fats IS 'Grams of fats in this meal';
COMMENT ON COLUMN nutrition_logs.meal_name IS 'Name of meal (e.g., Breakfast, Lunch, Dinner, Snack, Post-Workout)';
COMMENT ON VIEW daily_nutrition_summary IS 'Aggregated daily nutrition totals per user';
COMMENT ON FUNCTION calculate_target_status IS 'Helper function to determine if calories are under, on track, or over target with configurable tolerance';
