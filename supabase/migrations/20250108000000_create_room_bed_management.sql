-- Create room and bed management system
-- This migration creates tables for managing driver accommodation

-- 1. Create rooms table
CREATE TABLE IF NOT EXISTS rooms (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    room_number INTEGER NOT NULL UNIQUE,
    room_name VARCHAR(50),
    total_beds INTEGER NOT NULL DEFAULT 5, -- Each room has 5 beds
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create beds table
CREATE TABLE IF NOT EXISTS beds (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    bed_number INTEGER NOT NULL,
    bed_name VARCHAR(50), -- e.g., "Bed A", "Bed B"
    status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'maintenance')),
    daily_rent DECIMAL(10,2) DEFAULT 100.00, -- ₹100 per day per driver
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(room_id, bed_number)
);

-- 3. Create bed assignments table
CREATE TABLE IF NOT EXISTS bed_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    bed_id UUID NOT NULL REFERENCES beds(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    shift VARCHAR(20) NOT NULL CHECK (shift IN ('morning', 'night')),
    assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE, -- NULL means currently active
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'ended', 'transferred')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(bed_id, shift, assigned_date) -- One driver per shift per bed per day
);

-- 4. Create rent transactions table
CREATE TABLE IF NOT EXISTS rent_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bed_id UUID NOT NULL REFERENCES beds(id) ON DELETE CASCADE,
    report_id UUID REFERENCES fleet_reports(id) ON DELETE SET NULL,
    rent_date DATE NOT NULL,
    rent_amount DECIMAL(10,2) NOT NULL DEFAULT 100.00,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'waived')),
    payment_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Add room and bed info to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS current_room_id UUID REFERENCES rooms(id),
ADD COLUMN IF NOT EXISTS current_bed_id UUID REFERENCES beds(id),
ADD COLUMN IF NOT EXISTS current_shift VARCHAR(20) CHECK (current_shift IN ('morning', 'night'));

-- 6. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_beds_room_id ON beds(room_id);
CREATE INDEX IF NOT EXISTS idx_beds_status ON beds(status);
CREATE INDEX IF NOT EXISTS idx_bed_assignments_user_id ON bed_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_bed_assignments_bed_id ON bed_assignments(bed_id);
CREATE INDEX IF NOT EXISTS idx_bed_assignments_date ON bed_assignments(assigned_date);
CREATE INDEX IF NOT EXISTS idx_rent_transactions_user_id ON rent_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_rent_transactions_date ON rent_transactions(rent_date);
CREATE INDEX IF NOT EXISTS idx_rent_transactions_status ON rent_transactions(status);

-- 7. Insert initial room data (6 rooms with 5 beds each = 30 beds total)
INSERT INTO rooms (room_number, room_name, total_beds) VALUES
(1, 'Room 1', 5),
(2, 'Room 2', 5),
(3, 'Room 3', 5),
(4, 'Room 4', 5),
(5, 'Room 5', 5),
(6, 'Room 6', 5)
ON CONFLICT (room_number) DO NOTHING;

-- 8. Insert bed data for each room
DO $$
DECLARE
    room_record RECORD;
    bed_num INTEGER;
BEGIN
    FOR room_record IN SELECT id, room_number FROM rooms LOOP
        FOR bed_num IN 1..5 LOOP
            INSERT INTO beds (room_id, bed_number, bed_name, daily_rent)
            VALUES (
                room_record.id, 
                bed_num, 
                'Bed ' || CHR(64 + bed_num), -- A, B, C, D, E
                100.00
            )
            ON CONFLICT (room_id, bed_number) DO NOTHING;
        END LOOP;
    END LOOP;
END $$;

-- 9. Create function to calculate monthly rent
CREATE OR REPLACE FUNCTION calculate_monthly_rent(
    p_user_id UUID,
    p_month DATE DEFAULT CURRENT_DATE
)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    total_rent DECIMAL(10,2) := 0;
    report_count INTEGER;
BEGIN
    -- Count reports submitted in the month (1 report = 1 day)
    SELECT COUNT(*) INTO report_count
    FROM fleet_reports 
    WHERE user_id = p_user_id 
    AND DATE_TRUNC('month', rent_date) = DATE_TRUNC('month', p_month)
    AND status != 'rejected';
    
    -- Calculate rent: ₹100 per report (day)
    total_rent := report_count * 100.00;
    
    RETURN total_rent;
END;
$$ LANGUAGE plpgsql;

-- 10. Create function to get bed occupancy status
CREATE OR REPLACE FUNCTION get_bed_occupancy_status(p_bed_id UUID)
RETURNS TABLE (
    bed_id UUID,
    morning_driver_name TEXT,
    night_driver_name TEXT,
    is_fully_occupied BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.id as bed_id,
        COALESCE(morning_driver.name, 'Available') as morning_driver_name,
        COALESCE(night_driver.name, 'Available') as night_driver_name,
        (morning_driver.id IS NOT NULL AND night_driver.id IS NOT NULL) as is_fully_occupied
    FROM beds b
    LEFT JOIN bed_assignments ba_morning ON b.id = ba_morning.bed_id 
        AND ba_morning.shift = 'morning' 
        AND ba_morning.status = 'active'
        AND ba_morning.end_date IS NULL
    LEFT JOIN users morning_driver ON ba_morning.user_id = morning_driver.id
    LEFT JOIN bed_assignments ba_night ON b.id = ba_night.bed_id 
        AND ba_night.shift = 'night' 
        AND ba_night.status = 'active'
        AND ba_night.end_date IS NULL
    LEFT JOIN users night_driver ON ba_night.user_id = night_driver.id
    WHERE b.id = p_bed_id;
END;
$$ LANGUAGE plpgsql;

-- 11. Create trigger to update bed status based on assignments
CREATE OR REPLACE FUNCTION update_bed_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Update bed status based on assignments
    UPDATE beds 
    SET status = CASE 
        WHEN (SELECT COUNT(*) FROM bed_assignments 
              WHERE bed_id = NEW.bed_id 
              AND status = 'active' 
              AND end_date IS NULL) >= 2 
        THEN 'occupied'
        WHEN (SELECT COUNT(*) FROM bed_assignments 
              WHERE bed_id = NEW.bed_id 
              AND status = 'active' 
              AND end_date IS NULL) = 1 
        THEN 'occupied'
        ELSE 'available'
    END
    WHERE id = NEW.bed_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_bed_status
    AFTER INSERT OR UPDATE OR DELETE ON bed_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_bed_status();

-- 12. Add comments for documentation
COMMENT ON TABLE rooms IS 'Driver accommodation rooms - 6 rooms total';
COMMENT ON TABLE beds IS 'Individual beds in rooms - 5 beds per room, 30 total';
COMMENT ON TABLE bed_assignments IS 'Driver assignments to beds for specific shifts';
COMMENT ON TABLE rent_transactions IS 'Daily rent transactions based on submitted reports';
COMMENT ON COLUMN beds.daily_rent IS 'Daily rent per driver in INR (₹100)';
COMMENT ON COLUMN bed_assignments.shift IS 'Driver shift: morning or night (12hr each)';
COMMENT ON COLUMN rent_transactions.rent_amount IS 'Rent amount per day (₹100)';











