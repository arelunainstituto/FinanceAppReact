-- Migration to fix paid_date column type from DATE to TIMESTAMP WITH TIME ZONE
-- This ensures that both date and time information are preserved

-- First, let's check the current structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'payments' AND column_name = 'paid_date';

-- Alter the paid_date column to support full timestamp with timezone
ALTER TABLE payments 
ALTER COLUMN paid_date TYPE TIMESTAMP WITH TIME ZONE 
USING CASE 
  WHEN paid_date IS NOT NULL THEN paid_date::timestamp AT TIME ZONE 'UTC'
  ELSE NULL 
END;

-- Verify the change
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'payments' AND column_name = 'paid_date';