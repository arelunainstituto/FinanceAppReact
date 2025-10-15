-- Migration to fix paid_date column type from DATE to TIMESTAMP WITH TIME ZONE
-- This ensures that both date and time information are preserved

-- Alter the paid_date column to support full timestamp with timezone
ALTER TABLE payments 
ALTER COLUMN paid_date TYPE TIMESTAMP WITH TIME ZONE 
USING CASE 
  WHEN paid_date IS NOT NULL THEN paid_date::timestamp AT TIME ZONE 'UTC'
  ELSE NULL 
END;

-- Add a comment to document the change
COMMENT ON COLUMN payments.paid_date IS 'Date and time when the payment was made (with timezone support)';