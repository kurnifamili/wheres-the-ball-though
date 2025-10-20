-- Add game_started field to rooms table
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS game_started BOOLEAN DEFAULT FALSE;
