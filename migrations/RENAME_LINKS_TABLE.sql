-- MIGRATION SCRIPT: Rename Table for ZYPO Booth Rebranding
-- Execute this in your Supabase SQL Editor

-- 1. Rename the main table
ALTER TABLE IF EXISTS public.pixenze_links RENAME TO zypo_links;

-- 2. Rename the Primary Key index to match the new naming convention (optional but recommended)
-- Note: Replace 'pixenze_links_pkey' if your auto-generated PK name differs
ALTER INDEX IF EXISTS pixenze_links_pkey RENAME TO zypo_links_pkey;

-- 3. If you have Row Level Security (RLS) policies, they will automatically apply 
-- to the renamed table, no need to recreate them!
