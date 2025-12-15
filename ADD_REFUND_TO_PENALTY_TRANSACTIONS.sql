-- Add 'refund' to the penalty transaction types
-- This updates the CHECK constraint to include 'refund' as a valid type

ALTER TABLE public.driver_penalty_transactions 
DROP CONSTRAINT IF EXISTS driver_penalty_transactions_type_check;

ALTER TABLE public.driver_penalty_transactions 
ADD CONSTRAINT driver_penalty_transactions_type_check 
CHECK (type IN ('penalty', 'penalty_paid', 'bonus', 'refund'));
