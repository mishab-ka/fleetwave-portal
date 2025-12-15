-- Fix any remaining ambiguous column references in penalty division functions

-- Drop existing functions and triggers
DROP TRIGGER IF EXISTS update_daily_penalty_trigger ON penalty_history;
DROP FUNCTION IF EXISTS calculate_daily_penalty_amount(UUID);
DROP FUNCTION IF EXISTS update_driver_daily_penalty(UUID);
DROP FUNCTION IF EXISTS trigger_update_daily_penalty();
DROP FUNCTION IF EXISTS process_daily_penalty_deductions();

-- Recreate functions with explicit table prefixes
CREATE OR REPLACE FUNCTION calculate_daily_penalty_amount(driver_id_param UUID)
RETURNS DECIMAL AS $$
DECLARE
    total_daily_amount DECIMAL := 0;
BEGIN
    SELECT COALESCE(SUM(penalty_history.daily_amount), 0)
    INTO total_daily_amount
    FROM penalty_history
    WHERE penalty_history.user_id = driver_id_param
    AND penalty_history.status = 'active';
    
    RETURN total_daily_amount;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_driver_daily_penalty(driver_id_param UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE users
    SET daily_penalty_amount = calculate_daily_penalty_amount(driver_id_param)
    WHERE users.id = driver_id_param;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trigger_update_daily_penalty()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM update_driver_daily_penalty(NEW.user_id);
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        PERFORM update_driver_daily_penalty(NEW.user_id);
        IF OLD.user_id != NEW.user_id THEN
            PERFORM update_driver_daily_penalty(OLD.user_id);
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM update_driver_daily_penalty(OLD.user_id);
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION process_daily_penalty_deductions()
RETURNS VOID AS $$
DECLARE
    penalty_record RECORD;
    days_elapsed INTEGER;
    amount_to_deduct DECIMAL;
BEGIN
    FOR penalty_record IN 
        SELECT 
            penalty_history.id,
            penalty_history.user_id,
            penalty_history.remaining_amount,
            penalty_history.daily_amount,
            penalty_history.division_start_date,
            penalty_history.division_days
        FROM penalty_history
        WHERE penalty_history.status = 'active'
        AND penalty_history.remaining_amount > 0
    LOOP
        -- Calculate days elapsed since division start
        days_elapsed := EXTRACT(DAY FROM (CURRENT_DATE - penalty_record.division_start_date::DATE));
        
        -- Calculate total amount to deduct
        amount_to_deduct := LEAST(days_elapsed * penalty_record.daily_amount, penalty_record.remaining_amount);
        
        -- Update remaining amount
        UPDATE penalty_history
        SET remaining_amount = penalty_record.remaining_amount - amount_to_deduct
        WHERE penalty_history.id = penalty_record.id;
        
        -- If fully paid, mark as paid
        IF penalty_record.remaining_amount - amount_to_deduct <= 0 THEN
            UPDATE penalty_history
            SET status = 'paid'
            WHERE penalty_history.id = penalty_record.id;
        END IF;
        
        -- Update driver's daily penalty amount
        PERFORM update_driver_daily_penalty(penalty_record.user_id);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
CREATE TRIGGER update_daily_penalty_trigger
    AFTER INSERT OR UPDATE OR DELETE ON penalty_history
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_daily_penalty();
