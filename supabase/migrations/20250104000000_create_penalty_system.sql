-- Create penalty_history table
CREATE TABLE IF NOT EXISTS penalty_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    reason TEXT NOT NULL,
    penalty_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'waived', 'paid')),
    notes TEXT,
    photos TEXT[] DEFAULT '{}'
);

-- Add penalty-related columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS total_penalties DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS net_balance DECIMAL(10,2) DEFAULT 0;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_penalty_history_user_id ON penalty_history(user_id);
CREATE INDEX IF NOT EXISTS idx_penalty_history_date ON penalty_history(penalty_date);
CREATE INDEX IF NOT EXISTS idx_penalty_history_status ON penalty_history(status);

-- Add comments
COMMENT ON TABLE penalty_history IS 'Stores penalty history for drivers';
COMMENT ON COLUMN penalty_history.amount IS 'Penalty amount in INR';
COMMENT ON COLUMN penalty_history.reason IS 'Reason for the penalty';
COMMENT ON COLUMN penalty_history.penalty_date IS 'Date when penalty was applied';
COMMENT ON COLUMN penalty_history.status IS 'Status of penalty: active, waived, or paid';
COMMENT ON COLUMN penalty_history.notes IS 'Additional notes about the penalty';

COMMENT ON COLUMN users.total_penalties IS 'Total active penalties for the driver';
COMMENT ON COLUMN users.net_balance IS 'Net balance after deducting penalties from deposit';

-- Create storage bucket for penalty photos (run this in Supabase dashboard)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('penalty_photos', 'penalty_photos', true);
