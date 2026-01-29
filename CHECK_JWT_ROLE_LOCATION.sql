-- ============================================
-- CHECK WHERE ROLE IS IN JWT
-- Run this to see exactly where your role is stored
-- ============================================

SELECT 
    'JWT Role Location Check' as check_name,
    auth.jwt() ->> 'role' as jwt_direct_role,
    auth.jwt() -> 'user_metadata' ->> 'role' as user_metadata_role,
    auth.jwt() -> 'app_metadata' ->> 'role' as app_metadata_role,
    CASE 
        WHEN auth.jwt() ->> 'role' IN ('admin', 'super_admin', 'manager', 'accountant') 
        THEN '✅ Found in: JWT directly (auth.jwt() ->> ''role'')'
        WHEN auth.jwt() -> 'user_metadata' ->> 'role' IN ('admin', 'super_admin', 'manager', 'accountant')
        THEN '✅ Found in: user_metadata (auth.jwt() -> ''user_metadata'' ->> ''role'')'
        WHEN auth.jwt() -> 'app_metadata' ->> 'role' IN ('admin', 'super_admin', 'manager', 'accountant')
        THEN '✅ Found in: app_metadata (auth.jwt() -> ''app_metadata'' ->> ''role'')'
        ELSE '❌ NOT FOUND in JWT - Role may be in users table instead'
    END as location;

-- Show full JWT structure (for debugging)
SELECT 
    'Full JWT Structure' as info,
    jsonb_pretty(auth.jwt()) as jwt_json;

