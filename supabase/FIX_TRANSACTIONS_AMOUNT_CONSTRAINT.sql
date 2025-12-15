-- Fix transactions table amount constraint to allow negative amounts
-- This script removes the amount > 0 constraint that's preventing negative transaction amounts

-- First, let's see what constraints currently exist on the transactions table
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.transactions'::regclass
AND contype = 'c';

-- Drop the problematic constraint if it exists
ALTER TABLE public.transactions 
DROP CONSTRAINT IF EXISTS transactions_amount_check;

-- Also check for any other amount-related constraints
ALTER TABLE public.transactions 
DROP CONSTRAINT IF EXISTS transactions_amount_positive_check;

-- Add a new constraint that prevents zero amounts but allows positive and negative
ALTER TABLE public.transactions 
ADD CONSTRAINT transactions_amount_check 
CHECK (amount != 0);

-- Verify the new constraint was added
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conname = 'transactions_amount_check' 
AND conrelid = 'public.transactions'::regclass;
