# Database Migrations

## Setup Instructions

To set up the Supabase database for production:

1. Go to your Supabase Dashboard: https://app.supabase.com
2. Navigate to **SQL Editor**
3. Copy the contents of `001_create_saved_images.sql`
4. Paste and run the SQL in the editor
5. Verify the table was created in **Table Editor**

## Migration: 001_create_saved_images.sql

Creates the `saved_images` table to store:
- Image URLs
- Answer position coordinates (x_min, y_min, x_max, y_max)
- Timestamps

### Schema

```sql
saved_images (
  id SERIAL PRIMARY KEY,
  url TEXT NOT NULL,
  answer_x_min DECIMAL(5,4) NOT NULL,
  answer_y_min DECIMAL(5,4) NOT NULL,
  answer_x_max DECIMAL(5,4) NOT NULL,
  answer_y_max DECIMAL(5,4) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
)
```

### Why "answer_*" naming?

The column names use generic "answer" terminology instead of "ball" to make the schema reusable for any hidden object game (ball, character, item, etc.).

## Fallback

If Supabase is unavailable, the app automatically falls back to localStorage for image caching.

