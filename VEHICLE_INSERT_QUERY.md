# Vehicle Database Insert Query

## Complete Vehicles Table Schema

Based on the codebase, the vehicles table includes the following columns:

```sql
CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_number VARCHAR(20) NOT NULL UNIQUE,
    fleet_name VARCHAR(255),
    total_trips INTEGER DEFAULT 0,
    deposit DECIMAL(10, 2) DEFAULT 0,
    online BOOLEAN DEFAULT true,
    actual_rent DECIMAL(10, 2) DEFAULT 0,
    offline_from_date TIMESTAMP WITH TIME ZONE,
    online_from_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## Insert Query - Basic Version

### Minimum Required Fields (vehicle_number only)

```sql
INSERT INTO vehicles (vehicle_number)
VALUES ('DL01AB1234');
```

**Note**: This will use defaults for all other fields:
- `id`: Auto-generated UUID
- `total_trips`: 0
- `deposit`: 0
- `online`: true
- `actual_rent`: 0
- `created_at`: Current timestamp
- `updated_at`: Current timestamp

---

## Insert Query - Full Version (All Fields)

```sql
INSERT INTO vehicles (
    vehicle_number,
    fleet_name,
    total_trips,
    deposit,
    online,
    actual_rent,
    offline_from_date,
    online_from_date
)
VALUES (
    'DL01AB1234',           -- Vehicle number (REQUIRED, must be unique)
    'Fleet A',              -- Fleet name (optional)
    0,                      -- Total trips (default: 0)
    2500.00,                -- Deposit amount (default: 0)
    true,                   -- Online status (default: true)
    4200.00,                -- Actual rent/week (default: 0)
    NULL,                   -- Offline from date (optional)
    NOW()                   -- Online from date (optional, use NOW() if setting online=true)
);
```

---

## Insert Query - Recommended Version (Most Common)

```sql
INSERT INTO vehicles (
    vehicle_number,
    fleet_name,
    deposit,
    online,
    actual_rent
)
VALUES (
    UPPER(TRIM('DL01AB1234')),  -- Vehicle number (normalized to uppercase, trimmed)
    'Fleet A',                   -- Fleet name (optional)
    2500.00,                     -- Deposit amount
    true,                        -- Online status
    4200.00                      -- Weekly fixed rent (optional, 0 = use calculated rent)
);
```

---

## Multiple Vehicle Insert (Batch)

```sql
INSERT INTO vehicles (vehicle_number, fleet_name, deposit, online, actual_rent)
VALUES
    ('DL01AB1234', 'Fleet A', 2500.00, true, 4200.00),
    ('DL01CD5678', 'Fleet B', 3000.00, true, 4500.00),
    ('DL01EF9012', 'Fleet C', 2500.00, false, 0),
    ('DL01GH3456', 'Fleet A', 2800.00, true, 4300.00);
```

---

## Insert with Conflict Handling (UPSERT)

If you want to insert or update if vehicle already exists:

```sql
INSERT INTO vehicles (vehicle_number, fleet_name, deposit, online, actual_rent)
VALUES ('DL01AB1234', 'Fleet A', 2500.00, true, 4200.00)
ON CONFLICT (vehicle_number) 
DO UPDATE SET
    fleet_name = EXCLUDED.fleet_name,
    deposit = EXCLUDED.deposit,
    online = EXCLUDED.online,
    actual_rent = EXCLUDED.actual_rent,
    updated_at = NOW();
```

---

## Practical Examples

### Example 1: Add a New Online Vehicle

```sql
INSERT INTO vehicles (
    vehicle_number,
    fleet_name,
    deposit,
    online,
    online_from_date
)
VALUES (
    'MH12XY9999',
    'Main Fleet',
    3000.00,
    true,
    NOW()
);
```

### Example 2: Add Vehicle with Fixed Weekly Rent

```sql
INSERT INTO vehicles (
    vehicle_number,
    fleet_name,
    deposit,
    online,
    actual_rent,
    online_from_date
)
VALUES (
    'KA03AB8888',
    'Premium Fleet',
    5000.00,
    true,
    5500.00,  -- Fixed weekly rent of ₹5,500
    NOW()
);
```

### Example 3: Add Offline Vehicle (Not Available)

```sql
INSERT INTO vehicles (
    vehicle_number,
    fleet_name,
    deposit,
    online,
    offline_from_date
)
VALUES (
    'DL01OFF999',
    'Maintenance',
    0,
    false,
    NOW()  -- Vehicle is offline from now
);
```

### Example 4: Simple Vehicle (Minimum Fields)

```sql
INSERT INTO vehicles (vehicle_number)
VALUES ('TN09ZZ1111');
```

---

## Field Descriptions

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `id` | UUID | No | Auto | Primary key (auto-generated) |
| `vehicle_number` | VARCHAR(20) | **Yes** | - | Unique vehicle registration number |
| `fleet_name` | VARCHAR(255) | No | NULL | Fleet/group name |
| `total_trips` | INTEGER | No | 0 | Total lifetime trips |
| `deposit` | DECIMAL(10,2) | No | 0 | Vehicle deposit amount (₹) |
| `online` | BOOLEAN | No | true | Vehicle availability status |
| `actual_rent` | DECIMAL(10,2) | No | 0 | Fixed weekly rent (0 = use calculated) |
| `offline_from_date` | TIMESTAMP | No | NULL | When vehicle went offline |
| `online_from_date` | TIMESTAMP | No | NULL | When vehicle came online |
| `created_at` | TIMESTAMP | No | NOW() | Record creation timestamp |
| `updated_at` | TIMESTAMP | No | NOW() | Last update timestamp |

---

## Important Notes

1. **Vehicle Number Must Be Unique**: The `vehicle_number` has a UNIQUE constraint, so duplicate vehicle numbers will cause an error.

2. **Normalize Vehicle Numbers**: The application code converts vehicle numbers to uppercase and trims whitespace. Do the same in SQL:
   ```sql
   UPPER(TRIM('dl01ab1234'))  -- Result: 'DL01AB1234'
   ```

3. **Online Status Dates**:
   - If `online = true`: Set `online_from_date = NOW()`
   - If `online = false`: Set `offline_from_date = NOW()`

4. **Actual Rent**:
   - `actual_rent = 0`: Vehicle uses trip-based calculated rent
   - `actual_rent > 0`: Vehicle uses fixed weekly rent amount

5. **Deposit**: Usually set when vehicle is assigned to a driver, but can be set at creation.

---

## Validation Before Insert

### Check if Vehicle Exists

```sql
-- Check if vehicle already exists
SELECT vehicle_number 
FROM vehicles 
WHERE UPPER(TRIM(vehicle_number)) = UPPER(TRIM('DL01AB1234'));
```

### Insert Only if Not Exists

```sql
INSERT INTO vehicles (vehicle_number, fleet_name, deposit, online)
SELECT 
    'DL01AB1234',
    'Fleet A',
    2500.00,
    true
WHERE NOT EXISTS (
    SELECT 1 
    FROM vehicles 
    WHERE UPPER(TRIM(vehicle_number)) = 'DL01AB1234'
);
```

---

## Complete Insert Example (Production Ready)

```sql
-- Step 1: Check if vehicle exists
DO $$
DECLARE
    v_exists BOOLEAN;
    v_vehicle_number VARCHAR(20) := UPPER(TRIM('DL01AB1234'));
BEGIN
    -- Check if vehicle exists
    SELECT EXISTS(
        SELECT 1 FROM vehicles 
        WHERE vehicle_number = v_vehicle_number
    ) INTO v_exists;

    -- Insert only if doesn't exist
    IF NOT v_exists THEN
        INSERT INTO vehicles (
            vehicle_number,
            fleet_name,
            deposit,
            online,
            actual_rent,
            online_from_date
        )
        VALUES (
            v_vehicle_number,
            'Main Fleet',
            2500.00,
            true,
            0,  -- Use calculated rent
            NOW()
        );
        
        RAISE NOTICE 'Vehicle % inserted successfully', v_vehicle_number;
    ELSE
        RAISE NOTICE 'Vehicle % already exists', v_vehicle_number;
    END IF;
END $$;
```

---

## Code Implementation Reference

From `src/pages/admin/AdminVehicles.tsx`:

```typescript
// JavaScript/TypeScript version (using Supabase client)
const { error } = await supabase.from("vehicles").insert([
  {
    vehicle_number: 'DL01AB1234'.toUpperCase().trim(),
    fleet_name: 'Fleet A',
    deposit: 2500.00,
    total_trips: 0,
    online: true,
    actual_rent: 0
  }
]);
```

---

## Related Queries

### Get All Vehicles

```sql
SELECT * FROM vehicles ORDER BY created_at DESC;
```

### Get Online Vehicles Only

```sql
SELECT * FROM vehicles WHERE online = true ORDER BY vehicle_number;
```

### Get Vehicles by Fleet

```sql
SELECT * FROM vehicles WHERE fleet_name = 'Fleet A' ORDER BY vehicle_number;
```

### Update Vehicle

```sql
UPDATE vehicles 
SET 
    fleet_name = 'New Fleet Name',
    deposit = 3000.00,
    online = true,
    updated_at = NOW()
WHERE vehicle_number = 'DL01AB1234';
```

---

This documentation provides all the information needed to insert vehicles into the database!

