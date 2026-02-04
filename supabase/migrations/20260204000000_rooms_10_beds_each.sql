-- Each room has 10 beds (1 person per bed, 10 spaces total per room)
-- Update total_beds and add beds 6-10 for each room

UPDATE rooms SET total_beds = 10 WHERE total_beds < 10;

-- Add beds 6-10 for each room (if they don't exist)
DO $$
DECLARE
    room_record RECORD;
    bed_num INTEGER;
BEGIN
    FOR room_record IN SELECT id, room_number FROM rooms ORDER BY room_number LOOP
        FOR bed_num IN 6..10 LOOP
            INSERT INTO beds (room_id, bed_number, bed_name, daily_rent, status)
            VALUES (
                room_record.id, 
                bed_num, 
                'Bed ' || bed_num::TEXT,
                100.00,
                'available'
            )
            ON CONFLICT (room_id, bed_number) DO NOTHING;
        END LOOP;
    END LOOP;
END $$;
