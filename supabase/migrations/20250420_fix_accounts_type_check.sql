
-- Alter the accounts table to modify or remove the existing type check constraint
ALTER TABLE public.accounts DROP CONSTRAINT IF EXISTS accounts_type_check;

-- Add a new constraint with the correct allowed values
ALTER TABLE public.accounts ADD CONSTRAINT accounts_type_check 
  CHECK (type IN ('bank', 'cash', 'card'));
