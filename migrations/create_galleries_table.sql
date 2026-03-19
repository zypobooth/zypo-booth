-- Create galleries table
CREATE TABLE IF NOT EXISTS galleries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL UNIQUE,
    strip_url TEXT,
    raw_photos JSONB DEFAULT '[]'::JSONB,
    gif_url TEXT,
    video_url TEXT,
    config JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Add index for session_id
CREATE INDEX IF NOT EXISTS idx_galleries_session_id ON galleries(session_id);

-- Enable RLS
ALTER TABLE galleries ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access" ON galleries
    FOR SELECT USING (true);

-- Allow authenticated insert
-- For now, let's allow service role or authenticated if we have it
CREATE POLICY "Allow authenticated insert" ON galleries
    FOR INSERT WITH CHECK (true); -- We might want to restrict this later

CREATE POLICY "Allow authenticated update" ON galleries
    FOR UPDATE USING (true);

CREATE POLICY "Allow authenticated delete" ON galleries
    FOR DELETE USING (true);
