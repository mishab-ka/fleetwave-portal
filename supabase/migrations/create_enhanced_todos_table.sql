-- Enhanced todos table for task management
-- Drop existing table if it exists and create new one with all required fields

DROP TABLE IF EXISTS todos CASCADE;

CREATE TABLE todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  completed BOOLEAN DEFAULT FALSE,
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_date DATE,
  assigned_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_vehicle_number VARCHAR(50) REFERENCES vehicles(vehicle_number) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_todos_completed ON todos(completed);
CREATE INDEX idx_todos_priority ON todos(priority);
CREATE INDEX idx_todos_due_date ON todos(due_date);
CREATE INDEX idx_todos_assigned_user ON todos(assigned_user_id);
CREATE INDEX idx_todos_assigned_vehicle ON todos(assigned_vehicle_number);
CREATE INDEX idx_todos_created_at ON todos(created_at);

-- Enable RLS (Row Level Security)
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

-- Create policies for todos access
-- Allow all authenticated users to read todos
CREATE POLICY "Allow authenticated users to view todos" ON todos
  FOR SELECT TO authenticated USING (true);

-- Allow all authenticated users to create todos
CREATE POLICY "Allow authenticated users to create todos" ON todos
  FOR INSERT TO authenticated WITH CHECK (true);

-- Allow all authenticated users to update todos
CREATE POLICY "Allow authenticated users to update todos" ON todos
  FOR UPDATE TO authenticated USING (true);

-- Allow all authenticated users to delete todos
CREATE POLICY "Allow authenticated users to delete todos" ON todos
  FOR DELETE TO authenticated USING (true);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at on todos table
CREATE TRIGGER update_todos_updated_at 
  BEFORE UPDATE ON todos 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample todos for testing
INSERT INTO todos (title, description, priority, due_date) VALUES 
('Vehicle Maintenance Check', 'Perform routine maintenance check on all active vehicles', 'high', CURRENT_DATE + INTERVAL '3 days'),
('Driver Performance Review', 'Review monthly performance metrics for all drivers', 'medium', CURRENT_DATE + INTERVAL '7 days'),
('Update Fleet Insurance', 'Renew insurance policies for the entire fleet', 'urgent', CURRENT_DATE + INTERVAL '1 day'),
('Clean Vehicle Interiors', 'Deep cleaning of all vehicle interiors', 'low', CURRENT_DATE + INTERVAL '14 days'); 