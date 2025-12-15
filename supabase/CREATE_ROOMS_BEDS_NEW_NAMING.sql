-- Create Rooms and Beds with New Naming Convention
-- Rooms: Alphabets (Room A, Room B, etc.)
-- Beds: Numbers (Bed 1, Bed 2, etc.)

-- Insert rooms with alphabet names (if they don't exist)
INSERT INTO rooms (room_number, room_name, total_beds, status) VALUES
(1, 'Room A', 5, 'online'),
(2, 'Room B', 5, 'online'),
(3, 'Room C', 5, 'online'),
(4, 'Room D', 5, 'online'),
(5, 'Room E', 5, 'online'),
(6, 'Room F', 5, 'online')
ON CONFLICT (room_number) 
DO UPDATE SET 
  room_name = EXCLUDED.room_name,
  total_beds = EXCLUDED.total_beds;

-- Insert beds with number names
DO $$
DECLARE
    room_record RECORD;
    bed_num INTEGER;
BEGIN
    FOR room_record IN SELECT id, room_number, room_name FROM rooms ORDER BY room_number LOOP
        FOR bed_num IN 1..5 LOOP
            INSERT INTO beds (room_id, bed_number, bed_name, daily_rent, status)
            VALUES (
                room_record.id, 
                bed_num, 
                'Bed ' || bed_num::TEXT, -- Bed 1, Bed 2, etc.
                100.00,
                'available'
            )
            ON CONFLICT (room_id, bed_number) 
            DO UPDATE SET 
              bed_name = EXCLUDED.bed_name;
        END LOOP;
    END LOOP;
END $$;

-- Verify the naming convention
SELECT 
  r.room_number AS "Room #",
  r.room_name AS "Room Name",
  r.status AS "Room Status",
  COUNT(b.id) AS "Total Beds",
  COUNT(CASE WHEN b.status = 'available' THEN 1 END) AS "Available Beds"
FROM rooms r
LEFT JOIN beds b ON b.room_id = r.id
GROUP BY r.room_number, r.room_name, r.status
ORDER BY r.room_number;

-- Show sample beds
SELECT 
  r.room_name AS "Room",
  b.bed_name AS "Bed",
  b.status AS "Status",
  b.daily_rent AS "Daily Rent"
FROM beds b
JOIN rooms r ON r.id = b.room_id
ORDER BY r.room_number, b.bed_number
LIMIT 15;

