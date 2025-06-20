-- Create vehicle_transactions table for detailed income/expense tracking
CREATE TABLE IF NOT EXISTS vehicle_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_number VARCHAR(50) NOT NULL,
  transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('income', 'expense')),
  amount DECIMAL(10,2) NOT NULL,
  description TEXT NOT NULL,
  transaction_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_vehicle_transactions_vehicle_number ON vehicle_transactions(vehicle_number);
CREATE INDEX IF NOT EXISTS idx_vehicle_transactions_date ON vehicle_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_vehicle_transactions_type ON vehicle_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_vehicle_transactions_vehicle_date ON vehicle_transactions(vehicle_number, transaction_date);

-- Enable RLS
ALTER TABLE vehicle_transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Vehicle transactions are viewable by authenticated users" ON vehicle_transactions
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Vehicle transactions are editable by admins" ON vehicle_transactions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Create trigger for updated_at
CREATE TRIGGER update_vehicle_transactions_updated_at 
  BEFORE UPDATE ON vehicle_transactions 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column(); 