-- Add new columns for media generation results
-- Run this in Supabase SQL Editor AFTER 002_add_medium_close_up.sql

-- Add contact_sheet_url and video_variations to shots table
ALTER TABLE shots ADD COLUMN IF NOT EXISTS contact_sheet_url text;
ALTER TABLE shots ADD COLUMN IF NOT EXISTS video_variations jsonb DEFAULT '[]';
