-- Add cash_trip_blocked column to users table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'cash_trip_blocked'
    ) THEN
        ALTER TABLE users ADD COLUMN cash_trip_blocked BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Add comment to the column
COMMENT ON COLUMN users.cash_trip_blocked IS 'Flag to block driver from cash trips due to overdue payments or missing submissions';

-- Create index for better performance on cash trip blocking queries
CREATE INDEX IF NOT EXISTS idx_users_cash_trip_blocked ON users(cash_trip_blocked) WHERE cash_trip_blocked = TRUE;

