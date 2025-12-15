-- Add subcategories support to transaction categories
-- This migration adds parent-child relationships to categories

-- First, add parent_category_id column to existing categories table
ALTER TABLE categories ADD COLUMN parent_category_id UUID REFERENCES categories(id) ON DELETE CASCADE;

-- Add index for better performance
CREATE INDEX idx_categories_parent_id ON categories(parent_category_id);

-- Add a column to track category level (0 = main category, 1 = subcategory)
ALTER TABLE categories ADD COLUMN category_level INTEGER DEFAULT 0;

-- Add a column to track the full path for easier querying
ALTER TABLE categories ADD COLUMN category_path TEXT;

-- Create a function to update category paths
CREATE OR REPLACE FUNCTION update_category_path()
RETURNS TRIGGER AS $$
BEGIN
  -- If this is a main category (no parent), set path to just the name
  IF NEW.parent_category_id IS NULL THEN
    NEW.category_path = NEW.name;
    NEW.category_level = 0;
  ELSE
    -- If this is a subcategory, get parent path and append current name
    SELECT category_path INTO NEW.category_path
    FROM categories 
    WHERE id = NEW.parent_category_id;
    
    NEW.category_path = NEW.category_path || ' > ' || NEW.name;
    NEW.category_level = 1;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update category paths
CREATE TRIGGER update_category_path_trigger
  BEFORE INSERT OR UPDATE ON categories
  FOR EACH ROW
  EXECUTE FUNCTION update_category_path();

-- Update existing categories to have level 0 and proper paths
UPDATE categories SET category_level = 0, category_path = name WHERE parent_category_id IS NULL;

-- Create a view for easier category management
CREATE OR REPLACE VIEW category_hierarchy AS
SELECT 
  c.id,
  c.name,
  c.type,
  c.parent_category_id,
  c.category_level,
  c.category_path,
  p.name as parent_name,
  CASE 
    WHEN c.parent_category_id IS NULL THEN c.name
    ELSE p.name || ' > ' || c.name
  END as display_name
FROM categories c
LEFT JOIN categories p ON c.parent_category_id = p.id
ORDER BY c.type, c.category_level, c.name;

-- Add RLS policies for subcategories
-- Users can view all categories
CREATE POLICY "Users can view all categories" ON categories
  FOR SELECT USING (true);

-- Users can insert categories (both main and subcategories)
CREATE POLICY "Users can insert categories" ON categories
  FOR INSERT WITH CHECK (true);

-- Users can update categories
CREATE POLICY "Users can update categories" ON categories
  FOR UPDATE USING (true);

-- Users can delete categories
CREATE POLICY "Users can delete categories" ON categories
  FOR DELETE USING (true);

-- Create a function to get categories with their subcategories
CREATE OR REPLACE FUNCTION get_categories_with_subcategories()
RETURNS TABLE (
  id UUID,
  name TEXT,
  type TEXT,
  parent_category_id UUID,
  category_level INTEGER,
  category_path TEXT,
  display_name TEXT,
  subcategories JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.type,
    c.parent_category_id,
    c.category_level,
    c.category_path,
    CASE 
      WHEN c.parent_category_id IS NULL THEN c.name
      ELSE p.name || ' > ' || c.name
    END as display_name,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', sub.id,
            'name', sub.name,
            'type', sub.type,
            'category_path', sub.category_path
          )
        )
        FROM categories sub
        WHERE sub.parent_category_id = c.id
        ORDER BY sub.name
      ),
      '[]'::jsonb
    ) as subcategories
  FROM categories c
  LEFT JOIN categories p ON c.parent_category_id = p.id
  WHERE c.parent_category_id IS NULL  -- Only main categories
  ORDER BY c.type, c.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to get subcategories for a specific parent
CREATE OR REPLACE FUNCTION get_subcategories(parent_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  type TEXT,
  category_path TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.type,
    c.category_path
  FROM categories c
  WHERE c.parent_category_id = parent_id
  ORDER BY c.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert some sample subcategories for testing
-- Note: You'll need to replace the UUIDs with actual category IDs from your database

-- Example: Add subcategories to existing categories
-- This is just an example - you'll need to adjust based on your actual category IDs

-- For Expense categories, you might have:
-- INSERT INTO categories (name, type, parent_category_id) VALUES 
-- ('Salary', 'expense', (SELECT id FROM categories WHERE name = 'Employee Costs' LIMIT 1)),
-- ('Ajnas', 'expense', (SELECT id FROM categories WHERE name = 'Salary' LIMIT 1));

-- For Income categories, you might have:
-- INSERT INTO categories (name, type, parent_category_id) VALUES 
-- ('Sales', 'income', (SELECT id FROM categories WHERE name = 'Revenue' LIMIT 1)),
-- ('Service Fees', 'income', (SELECT id FROM categories WHERE name = 'Revenue' LIMIT 1));

-- Note: The above INSERT statements are commented out because they depend on existing category IDs
-- You should run these after checking your actual category structure
