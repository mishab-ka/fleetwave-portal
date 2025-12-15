-- Add penalty division settings to admin settings
INSERT INTO admin_settings (setting_type, setting_key, setting_value, description) VALUES
('penalty_division', 'division_period', '{
  "division_days": 7,
  "enabled": true,
  "auto_apply": true
}', 'Penalty division period in days and settings')
ON CONFLICT (setting_type, setting_key) DO NOTHING;

-- Add penalty division tracking to penalty_history table
ALTER TABLE penalty_history 
ADD COLUMN IF NOT EXISTS division_days INTEGER DEFAULT 7,
ADD COLUMN IF NOT EXISTS daily_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS remaining_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS division_start_date DATE DEFAULT CURRENT_DATE;

-- Add penalty division tracking to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS daily_penalty_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS penalty_division_enabled BOOLEAN DEFAULT true;

-- Create function to calculate daily penalty amount for a driver
CREATE OR REPLACE FUNCTION calculate_daily_penalty_amount(driver_id UUID)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    total_daily_amount DECIMAL(10,2) := 0;
    penalty_record RECORD;
BEGIN
    -- Calculate total daily penalty amount from all active penalties
    FOR penalty_record IN 
        SELECT 
            COALESCE(daily_amount, amount / division_days) as daily_penalty
        FROM penalty_history 
        WHERE penalty_history.user_id = driver_id 
        AND penalty_history.status = 'active'
        AND penalty_history.remaining_amount > 0
    LOOP
        total_daily_amount := total_daily_amount + penalty_record.daily_penalty;
    END LOOP;
    
    RETURN total_daily_amount;
END;
$$ LANGUAGE plpgsql;

-- Create function to update driver's daily penalty amount
CREATE OR REPLACE FUNCTION update_driver_daily_penalty(driver_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE users 
    SET daily_penalty_amount = calculate_daily_penalty_amount(driver_id)
    WHERE users.id = driver_id;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update daily penalty amount when penalty is added/modified
CREATE OR REPLACE FUNCTION trigger_update_daily_penalty()
RETURNS TRIGGER AS $$
BEGIN
    -- Update daily penalty amount for the affected driver
    PERFORM update_driver_daily_penalty(NEW.user_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for penalty_history table
DROP TRIGGER IF EXISTS update_daily_penalty_trigger ON penalty_history;
CREATE TRIGGER update_daily_penalty_trigger
    AFTER INSERT OR UPDATE OR DELETE ON penalty_history
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_daily_penalty();

-- Create function to process daily penalty deductions
CREATE OR REPLACE FUNCTION process_daily_penalty_deductions()
RETURNS VOID AS $$
DECLARE
    driver_record RECORD;
    penalty_record RECORD;
    deduction_amount DECIMAL(10,2);
BEGIN
    -- Process each driver with active penalties
    FOR driver_record IN 
        SELECT users.id, users.daily_penalty_amount
        FROM users 
        WHERE users.daily_penalty_amount > 0
        AND users.penalty_division_enabled = true
    LOOP
        -- Process each active penalty for the driver
        FOR penalty_record IN 
            SELECT penalty_history.id, penalty_history.daily_amount, penalty_history.remaining_amount
            FROM penalty_history 
            WHERE penalty_history.user_id = driver_record.id 
            AND penalty_history.status = 'active'
            AND penalty_history.remaining_amount > 0
            ORDER BY penalty_history.created_at ASC
        LOOP
            -- Calculate deduction amount (either daily amount or remaining amount, whichever is smaller)
            deduction_amount := LEAST(penalty_record.daily_amount, penalty_record.remaining_amount);
            
            -- Update penalty remaining amount
            UPDATE penalty_history 
            SET remaining_amount = remaining_amount - deduction_amount
            WHERE penalty_history.id = penalty_record.id;
            
            -- If penalty is fully paid, mark as paid
            IF penalty_record.remaining_amount - deduction_amount <= 0 THEN
                UPDATE penalty_history 
                SET status = 'paid', remaining_amount = 0
                WHERE penalty_history.id = penalty_record.id;
            END IF;
        END LOOP;
        
        -- Recalculate daily penalty amount for the driver
        PERFORM update_driver_daily_penalty(driver_record.id);
    END LOOP;
END;
$$ LANGUAGE plpgsql;
