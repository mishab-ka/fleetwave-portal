-- Add account details and DOB fields to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS account_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS ifsc_code VARCHAR(20),
ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS date_of_birth DATE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_account_number ON public.users(account_number);
CREATE INDEX IF NOT EXISTS idx_users_date_of_birth ON public.users(date_of_birth);

-- Add comments for documentation
COMMENT ON COLUMN public.users.account_number IS 'Bank account number for salary transfers';
COMMENT ON COLUMN public.users.ifsc_code IS 'IFSC code for bank account';
COMMENT ON COLUMN public.users.bank_name IS 'Name of the bank';
COMMENT ON COLUMN public.users.date_of_birth IS 'Date of birth for age verification and compliance'; 