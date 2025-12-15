-- Update room status to include online/offline functionality
-- This migration updates the rooms table to support online/offline status

-- Update the status constraint to include online/offline
ALTER TABLE rooms DROP CONSTRAINT IF EXISTS rooms_status_check;
ALTER TABLE rooms ADD CONSTRAINT rooms_status_check 
CHECK (status IN ('active', 'maintenance', 'inactive', 'online', 'offline'));

-- Set default status to 'online' for existing rooms
UPDATE rooms SET status = 'online' WHERE status = 'active';

-- Update the default value
ALTER TABLE rooms ALTER COLUMN status SET DEFAULT 'online';











