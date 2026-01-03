-- Migration: Add is_main_pastor field to pastors table
-- This migration adds a boolean field to distinguish main pastors from assistant pastors

-- Add the new column to the pastors table
ALTER TABLE pastors 
ADD COLUMN is_main_pastor BOOLEAN DEFAULT FALSE;

-- Create an index for better performance when filtering by main pastor status
CREATE INDEX idx_pastors_main_pastor ON pastors(is_main_pastor);

-- Update existing pastors to set some as main pastors (optional)
-- You can uncomment and modify the query below to set existing pastors as main pastors
-- UPDATE pastors SET is_main_pastor = TRUE WHERE name LIKE '%Pendeta Utama%' OR name LIKE '%Senior Pastor%';

-- Add comment to document the new field
COMMENT ON COLUMN pastors.is_main_pastor IS 'Boolean flag to indicate if this is the main pastor/shepherd of the church';
