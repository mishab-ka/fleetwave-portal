-- Add 'extra_collection' to the penalty transaction types
-- This updates the CHECK constraint to include 'extra_collection' as a valid type
-- This is for tracking extra amounts collected from drivers (e.g., rent is 600 but collecting 700)

ALTER TABLE public.driver_penalty_transactions 
DROP CONSTRAINT IF EXISTS driver_penalty_transactions_type_check;

ALTER TABLE public.driver_penalty_transactions 
ADD CONSTRAINT driver_penalty_transactions_type_check 
CHECK (type IN ('penalty', 'penalty_paid', 'bonus', 'refund', 'due', 'extra_collection'));










