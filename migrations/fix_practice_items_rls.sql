-- Fix practice_items RLS policy
-- This script drops and recreates the SELECT policy for practice_items

-- First, drop existing policies on practice_items
DROP POLICY IF EXISTS "Users can view own practice items" ON practice_items;
DROP POLICY IF EXISTS "Users can insert practice items for own KCs" ON practice_items;
DROP POLICY IF EXISTS "Users can update own practice items" ON practice_items;
DROP POLICY IF EXISTS "Users can delete own practice items" ON practice_items;

-- Make sure RLS is enabled
ALTER TABLE practice_items ENABLE ROW LEVEL SECURITY;

-- Recreate all policies with simpler conditions first
-- SELECT: Allow users to see items where user_id matches OR user_id is NULL
CREATE POLICY "Users can view own practice items"
    ON practice_items FOR SELECT
    USING (auth.uid() = user_id OR user_id IS NULL);

-- INSERT: Users can only insert items for themselves
CREATE POLICY "Users can insert practice items for own KCs"
    ON practice_items FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can update their own items
CREATE POLICY "Users can update own practice items"
    ON practice_items FOR UPDATE
    USING (auth.uid() = user_id OR user_id IS NULL)
    WITH CHECK (auth.uid() = user_id);

-- DELETE: Users can delete their own items
CREATE POLICY "Users can delete own practice items"
    ON practice_items FOR DELETE
    USING (auth.uid() = user_id OR user_id IS NULL);

-- Verify the policy was created
SELECT polname, polcmd, polpermissive
FROM pg_policies
WHERE tablename = 'practice_items';
