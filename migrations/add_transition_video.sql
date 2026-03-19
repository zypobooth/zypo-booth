-- Add transition_video_url column to frames table
-- transition_video_url: URL to a video file (.mp4, .webm) that plays full-screen when the frame is selected

ALTER TABLE frames ADD COLUMN IF NOT EXISTS transition_video_url TEXT DEFAULT NULL;
