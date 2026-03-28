-- Add medium_close_up to the shot_type constraint
-- Run this in Supabase SQL Editor

ALTER TABLE shots DROP CONSTRAINT IF EXISTS shots_shot_type_check;
ALTER TABLE shots ADD CONSTRAINT shots_shot_type_check
  CHECK (shot_type IN ('wide', 'medium', 'medium_close_up', 'close_up', 'extreme_close_up', 'over_shoulder', 'pov', 'aerial', 'custom'));
