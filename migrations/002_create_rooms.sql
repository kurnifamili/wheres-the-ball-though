-- Create rooms table for multiplayer
CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pin_code VARCHAR(6) UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  current_image_url TEXT,
  current_answer_position JSONB
);

-- Create room_players table
CREATE TABLE IF NOT EXISTS room_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  player_name VARCHAR(100) NOT NULL,
  score INTEGER DEFAULT 0,
  last_round_time INTEGER, -- milliseconds taken in last round
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(room_id, player_name)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_rooms_pin_code ON rooms(pin_code);
CREATE INDEX IF NOT EXISTS idx_room_players_room_id ON room_players(room_id);

-- Add host tracking column
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS host_player_name VARCHAR(100);

-- Enable real-time for these tables
ALTER PUBLICATION supabase_realtime ADD TABLE room_players;
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;

