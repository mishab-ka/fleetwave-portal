-- Create transaction_modes table for predefined journal entry modes
-- This table stores predefined transaction modes that automatically set Asset/Cash/Liability transactions

CREATE TABLE IF NOT EXISTS transaction_modes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  asset_transaction VARCHAR(20) CHECK (asset_transaction IN ('asset_in', 'asset_out', 'none')),
  cash_transaction VARCHAR(20) CHECK (cash_transaction IN ('cash_in', 'cash_out', 'none')),
  liability_transaction VARCHAR(20) CHECK (liability_transaction IN ('liability_in', 'liability_out', 'none')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_transaction_modes_active ON transaction_modes(is_active);
CREATE INDEX IF NOT EXISTS idx_transaction_modes_name ON transaction_modes(name);

-- Insert default transaction modes
INSERT INTO transaction_modes (name, description, asset_transaction, cash_transaction, liability_transaction) VALUES
('Driver Deposit', 'Collecting deposit from driver - increases asset, cash, and liability', 'asset_in', 'cash_in', 'liability_in'),
('Driver Refund', 'Refunding deposit to driver - decreases asset, cash, and liability', 'asset_out', 'cash_out', 'liability_out'),
('Asset Purchase', 'Buying an asset with cash - increases asset, decreases cash', 'asset_in', 'cash_out', 'none'),
('Asset Sale', 'Selling an asset for cash - decreases asset, increases cash', 'asset_out', 'cash_in', 'none'),
('Loan Received', 'Receiving a loan - increases cash and liability', 'none', 'cash_in', 'liability_in'),
('Loan Payment', 'Making a loan payment - decreases cash and liability', 'none', 'cash_out', 'liability_out'),
('Cash Receipt', 'Receiving cash - increases cash only', 'none', 'cash_in', 'none'),
('Cash Payment', 'Making a cash payment - decreases cash only', 'none', 'cash_out', 'none'),
('Equipment Purchase', 'Buying equipment - increases asset, decreases cash', 'asset_in', 'cash_out', 'none'),
('Equipment Sale', 'Selling equipment - decreases asset, increases cash', 'asset_out', 'cash_in', 'none'),
('Deposit Collection', 'Collecting any type of deposit - increases cash and liability', 'none', 'cash_in', 'liability_in'),
('Deposit Refund', 'Refunding any type of deposit - decreases cash and liability', 'none', 'cash_out', 'liability_out')
ON CONFLICT (name) DO NOTHING;

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_transaction_modes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS trigger_update_transaction_modes_updated_at ON transaction_modes;
CREATE TRIGGER trigger_update_transaction_modes_updated_at
    BEFORE UPDATE ON transaction_modes
    FOR EACH ROW
    EXECUTE FUNCTION update_transaction_modes_updated_at();

-- Verify the table was created and data was inserted
SELECT 
    id,
    name,
    description,
    asset_transaction,
    cash_transaction,
    liability_transaction,
    is_active,
    created_at
FROM transaction_modes 
ORDER BY name;






