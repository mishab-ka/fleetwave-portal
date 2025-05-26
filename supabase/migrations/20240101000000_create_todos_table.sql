-- Create enum type for todo priority levels
CREATE TYPE todo_priority AS ENUM ('low', 'medium', 'high', 'urgent');

-- Create enum type for todo status
CREATE TYPE todo_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');

-- Create todos table
CREATE TABLE IF NOT EXISTS todos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    priority todo_priority DEFAULT 'medium',
    status todo_status DEFAULT 'pending',
    due_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES auth.users(id),
    assigned_to UUID REFERENCES users(id),
    vehicle_id UUID REFERENCES vehicles(id),
    is_recurring BOOLEAN DEFAULT false,
    recurrence_pattern TEXT,
    tags TEXT[],
    attachments JSONB[],
    reminder_date TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    parent_todo_id UUID REFERENCES todos(id),
    is_archived BOOLEAN DEFAULT false
);

-- Create index for common queries
CREATE INDEX todos_assigned_to_idx ON todos(assigned_to);
CREATE INDEX todos_status_idx ON todos(status);
CREATE INDEX todos_due_date_idx ON todos(due_date);
CREATE INDEX todos_priority_idx ON todos(priority);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_todos_updated_at
    BEFORE UPDATE ON todos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add RLS policies
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

-- Policy for viewing todos (admins can see all, users can see assigned to them)
CREATE POLICY "Users can view their assigned todos"
    ON todos FOR SELECT
    USING (
        auth.uid() IN (
            SELECT id FROM users WHERE role = 'admin'
        ) OR
        assigned_to = auth.uid()
    );

-- Policy for inserting todos (admins only)
CREATE POLICY "Only admins can create todos"
    ON todos FOR INSERT
    WITH CHECK (
        auth.uid() IN (
            SELECT id FROM users WHERE role = 'admin'
        )
    );

-- Policy for updating todos (admins can update all, users can update their assigned todos)
CREATE POLICY "Users can update their assigned todos"
    ON todos FOR UPDATE
    USING (
        auth.uid() IN (
            SELECT id FROM users WHERE role = 'admin'
        ) OR
        assigned_to = auth.uid()
    );

-- Policy for deleting todos (admins only)
CREATE POLICY "Only admins can delete todos"
    ON todos FOR DELETE
    USING (
        auth.uid() IN (
            SELECT id FROM users WHERE role = 'admin'
        )
    );