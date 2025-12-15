-- Update Room and Bed Naming Convention
-- Rooms: Use alphabets (A, B, C, D, E, F, etc.)
-- Beds: Use numbers (1, 2, 3, 4, 5, etc.)

-- Step 1: Update existing room names to use alphabets
-- Room 1 → Room A, Room 2 → Room B, etc.

UPDATE rooms
SET room_name = 'Room ' || CHR(64 + room_number)
WHERE room_number <= 26; -- A-Z (supports up to 26 rooms)

-- For rooms beyond 26, use AA, AB, etc. (if needed in future)
UPDATE rooms
SET room_name = 'Room ' || CHR(64 + ((room_number - 1) / 26)) || CHR(65 + ((room_number - 1) % 26))
WHERE room_number > 26;

-- Step 2: Update existing bed names to use numbers
-- Bed A → Bed 1, Bed B → Bed 2, etc.

UPDATE beds
SET bed_name = 'Bed ' || bed_number::TEXT;

-- Step 3: Add a comment to document the naming convention
COMMENT ON COLUMN rooms.room_name IS 'Room name using alphabets (Room A, Room B, etc.)';
COMMENT ON COLUMN beds.bed_name IS 'Bed name using numbers (Bed 1, Bed 2, etc.)';

-- Step 4: Verify the updates
SELECT 
  r.room_number,
  r.room_name AS "Room Name (Should be alphabets)",
  b.bed_number,
  b.bed_name AS "Bed Name (Should be numbers)"
FROM rooms r
LEFT JOIN beds b ON b.room_id = r.id
ORDER BY r.room_number, b.bed_number
LIMIT 30;

