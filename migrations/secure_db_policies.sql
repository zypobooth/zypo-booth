-- SECURITY UPDATE 2026: Enable RLS and Admin Policies
-- Run this script in your Supabase SQL Editor

-- 1. Enable Row Level Security on the FRAMES table
ALTER TABLE frames ENABLE ROW LEVEL SECURITY;

-- 2. Allow ANYONE (including anonymous/guests) to VIEW frames
-- This is essential for the Frame Selection page to work
DROP POLICY IF EXISTS "Public frames are viewable by everyone" ON frames;
CREATE POLICY "Public frames are viewable by everyone" 
ON frames FOR SELECT 
USING (true);

-- 3. Restrict INSERT (Add New Frame) to Admins Only
DROP POLICY IF EXISTS "Admins can insert frames" ON frames;
CREATE POLICY "Admins can insert frames" 
ON frames FOR INSERT 
WITH CHECK (
  auth.jwt() ->> 'email' IN ('nnvnxx.10@gmail.com', 'admin@sparklebooth.com')
);

-- 4. Restrict UPDATE (Edit Frame) to Admins Only
DROP POLICY IF EXISTS "Admins can update frames" ON frames;
CREATE POLICY "Admins can update frames" 
ON frames FOR UPDATE 
USING (
  auth.jwt() ->> 'email' IN ('nnvnxx.10@gmail.com', 'admin@sparklebooth.com')
);

-- 5. Restrict DELETE (Remove Frame) to Admins Only
DROP POLICY IF EXISTS "Admins can delete frames" ON frames;
CREATE POLICY "Admins can delete frames" 
ON frames FOR DELETE 
USING (
  auth.jwt() ->> 'email' IN ('nnvnxx.10@gmail.com', 'admin@sparklebooth.com')
);

-- OPTIONAL: Secure the HISTORY table as well
-- Users can only see and insert their OWN history
ALTER TABLE history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert their own history" ON history;
CREATE POLICY "Users can insert their own history" 
ON history FOR INSERT 
WITH CHECK (auth.uid() = user_id OR auth.role() = 'anon'); 
-- Note: 'anon' is allowed because Guests need to save history too.
-- Ideally, associate anon data with a session ID, but for now allowing insert is OK.
-- Preventing delete/update is the main goal.

DROP POLICY IF EXISTS "Users can select their own history" ON history;
CREATE POLICY "Users can select their own history" 
ON history FOR SELECT 
USING (auth.uid() = user_id);

-- Only Admins can see ALL history
DROP POLICY IF EXISTS "Admins can view all history" ON history;
CREATE POLICY "Admins can view all history" 
ON history FOR SELECT 
USING (
  auth.jwt() ->> 'email' IN ('nnvnxx.10@gmail.com', 'admin@sparklebooth.com')
);
