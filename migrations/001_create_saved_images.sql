-- Create saved_images table
CREATE TABLE IF NOT EXISTS saved_images (
  id SERIAL PRIMARY KEY,
  url TEXT NOT NULL,
  answer_x_min DECIMAL(5,4) NOT NULL,
  answer_y_min DECIMAL(5,4) NOT NULL,
  answer_x_max DECIMAL(5,4) NOT NULL,
  answer_y_max DECIMAL(5,4) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_saved_images_created_at ON saved_images(created_at DESC);

