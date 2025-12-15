-- Quick fix for ambiguous column reference in trigger

-- Disable the trigger temporarily
DROP TRIGGER IF EXISTS update_daily_penalty_trigger ON penalty_history;

-- Create a simpler trigger function without ambiguous references
CREATE OR REPLACE FUNCTION trigger_update_daily_penalty()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update when penalty is active
    IF TG_OP = 'INSERT' AND NEW.status = 'active' THEN
        UPDATE users 
        SET daily_penalty_amount = (
            SELECT COALESCE(SUM(daily_amount), 0) 
            FROM penalty_history 
            WHERE user_id = NEW.user_id AND status = 'active'
        )
        WHERE id = NEW.user_id;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE users 
        SET daily_penalty_amount = (
            SELECT COALESCE(SUM(daily_amount), 0) 
            FROM penalty_history 
            WHERE user_id = NEW.user_id AND status = 'active'
        )
        WHERE id = NEW.user_id;
        
        -- If user_id changed, update old user too
        IF OLD.user_id != NEW.user_id THEN
            UPDATE users 
            SET daily_penalty_amount = (
                SELECT COALESCE(SUM(daily_amount), 0) 
                FROM penalty_history 
                WHERE user_id = OLD.user_id AND status = 'active'
            )
            WHERE id = OLD.user_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE users 
        SET daily_penalty_amount = (
            SELECT COALESCE(SUM(daily_amount), 0) 
            FROM penalty_history 
            WHERE user_id = OLD.user_id AND status = 'active'
        )
        WHERE id = OLD.user_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER update_daily_penalty_trigger
    AFTER INSERT OR UPDATE OR DELETE ON penalty_history
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_daily_penalty();
