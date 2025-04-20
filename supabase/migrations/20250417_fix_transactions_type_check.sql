
-- Alter the transactions table to modify or remove the existing type check constraint
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_type_check;

-- Add a new constraint with the correct allowed values (assuming income and expense are the valid values)
ALTER TABLE public.transactions ADD CONSTRAINT transactions_type_check 
  CHECK (type IN ('income', 'expense'));

-- Update the fleet_reports table shift check constraint to include 24hr option
ALTER TABLE public.fleet_reports DROP CONSTRAINT IF EXISTS fleet_reports_shift_check;
ALTER TABLE public.fleet_reports ADD CONSTRAINT fleet_reports_shift_check
  CHECK (shift IN ('morning', 'night', '24hr'));
