-- Complete Fix for Finance Module Schema
-- This script creates all missing tables and relationships

-- ============================================================================
-- 1. CREATE ACCOUNTS TABLE WITH ALL REQUIRED COLUMNS
-- ============================================================================

-- Drop and recreate accounts table with all required columns
DROP TABLE IF EXISTS accounts CASCADE;

CREATE TABLE accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    account_code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('Asset', 'Liability', 'Equity', 'Income', 'Expense')),
    parent_account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    account_level INTEGER DEFAULT 0,
    account_path TEXT,
    is_active BOOLEAN DEFAULT true,
    normal_balance VARCHAR(10) NOT NULL CHECK (normal_balance IN ('Debit', 'Credit')),
    balance DECIMAL(15,2) DEFAULT 0, -- This was missing!
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_accounts_type ON accounts(type);
CREATE INDEX idx_accounts_parent_id ON accounts(parent_account_id);
CREATE INDEX idx_accounts_code ON accounts(account_code);
CREATE INDEX idx_accounts_active ON accounts(is_active);

-- ============================================================================
-- 2. CREATE TRANSACTIONS TABLE WITH PROPER FOREIGN KEYS
-- ============================================================================

-- Drop and recreate transactions table with proper foreign keys
DROP TABLE IF EXISTS transactions CASCADE;

CREATE TABLE transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    description TEXT NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('income', 'expense', 'asset', 'liability')),
    date DATE NOT NULL,
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE, -- Proper foreign key
    category_id UUID, -- Will reference categories table
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_transactions_account ON transactions(account_id);
CREATE INDEX idx_transactions_category ON transactions(category_id);
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_transactions_type ON transactions(type);

-- ============================================================================
-- 3. CREATE CATEGORIES TABLE
-- ============================================================================

-- Drop and recreate categories table
DROP TABLE IF EXISTS categories CASCADE;

CREATE TABLE categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('income', 'expense', 'asset', 'liability')),
    parent_category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    category_level INTEGER DEFAULT 0,
    category_path TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_categories_type ON categories(type);
CREATE INDEX idx_categories_parent ON categories(parent_category_id);
CREATE INDEX idx_categories_active ON categories(is_active);

-- ============================================================================
-- 4. CREATE JOURNAL ENTRIES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS journal_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    journal_no VARCHAR(50) NOT NULL UNIQUE,
    date DATE NOT NULL,
    description TEXT NOT NULL,
    reference_no VARCHAR(100),
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'posted', 'reversed')),
    total_debit DECIMAL(15,2) DEFAULT 0,
    total_credit DECIMAL(15,2) DEFAULT 0,
    created_by UUID REFERENCES auth.users(id),
    approved_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 5. CREATE JOURNAL LINES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS journal_lines (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE CASCADE,
    account_id UUID REFERENCES accounts(id),
    vehicle_id UUID, -- Reference to vehicle if applicable
    cost_center VARCHAR(100),
    description TEXT,
    debit DECIMAL(15,2) DEFAULT 0,
    credit DECIMAL(15,2) DEFAULT 0,
    tax_code VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 6. CREATE OTHER FINANCE TABLES
-- ============================================================================

-- Vendors table
CREATE TABLE IF NOT EXISTS vendors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    gst_no VARCHAR(20),
    contact_person VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    bank_details JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AP Invoices table
CREATE TABLE IF NOT EXISTS ap_invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    vendor_id UUID REFERENCES vendors(id),
    invoice_no VARCHAR(100) NOT NULL,
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    tax_rate DECIMAL(5,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'overdue')),
    description TEXT,
    attachment_urls TEXT[],
    created_by UUID REFERENCES auth.users(id),
    approved_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AP Payments table
CREATE TABLE IF NOT EXISTS ap_payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ap_invoice_id UUID REFERENCES ap_invoices(id),
    payment_date DATE NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('bank_transfer', 'cash', 'cheque', 'card')),
    reference VARCHAR(100),
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Banks table
CREATE TABLE IF NOT EXISTS banks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    account_no VARCHAR(50) NOT NULL,
    branch VARCHAR(255),
    ifsc_code VARCHAR(20),
    current_balance DECIMAL(15,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 7. INSERT SAMPLE DATA
-- ============================================================================

-- Insert basic Chart of Accounts
INSERT INTO accounts (account_code, name, type, normal_balance, description) VALUES
-- Assets
('1000', 'Current Assets', 'Asset', 'Debit', 'All current assets'),
('1100', 'Cash and Bank', 'Asset', 'Debit', 'Cash and bank balances'),
('1200', 'Accounts Receivable', 'Asset', 'Debit', 'Money owed by customers'),
('1300', 'Inventory', 'Asset', 'Debit', 'Vehicle parts and supplies'),
('1400', 'Prepaid Expenses', 'Asset', 'Debit', 'Prepaid insurance, rent, etc.'),
('1500', 'Fixed Assets', 'Asset', 'Debit', 'Vehicles and equipment'),
('1600', 'Accumulated Depreciation', 'Asset', 'Credit', 'Depreciation on fixed assets'),

-- Liabilities
('2000', 'Current Liabilities', 'Liability', 'Credit', 'All current liabilities'),
('2100', 'Accounts Payable', 'Liability', 'Credit', 'Money owed to vendors'),
('2200', 'Accrued Expenses', 'Liability', 'Credit', 'Accrued salaries, taxes, etc.'),
('2300', 'Short-term Loans', 'Liability', 'Credit', 'Short-term borrowings'),

-- Equity
('3000', 'Owner Equity', 'Equity', 'Credit', 'Owner capital and retained earnings'),
('3100', 'Capital', 'Equity', 'Credit', 'Owner capital contributions'),
('3200', 'Retained Earnings', 'Equity', 'Credit', 'Accumulated profits'),

-- Income
('4000', 'Operating Income', 'Income', 'Credit', 'Revenue from operations'),
('4100', 'Freight Revenue', 'Income', 'Credit', 'Revenue from freight services'),
('4200', 'Other Income', 'Income', 'Credit', 'Other sources of income'),

-- Expenses
('5000', 'Operating Expenses', 'Expense', 'Debit', 'All operating expenses'),
('5100', 'Fuel Expenses', 'Expense', 'Debit', 'Vehicle fuel costs'),
('5200', 'Maintenance Expenses', 'Expense', 'Debit', 'Vehicle maintenance costs'),
('5300', 'Insurance Expenses', 'Expense', 'Debit', 'Vehicle and business insurance'),
('5400', 'Salary Expenses', 'Expense', 'Debit', 'Employee salaries'),
('5500', 'Depreciation Expenses', 'Expense', 'Debit', 'Asset depreciation'),
('5600', 'Administrative Expenses', 'Expense', 'Debit', 'Office and admin costs');

-- Insert sample categories
INSERT INTO categories (name, type) VALUES
-- Income categories
('Freight Revenue', 'income'),
('Other Income', 'income'),

-- Expense categories
('Fuel Expenses', 'expense'),
('Maintenance Expenses', 'expense'),
('Insurance Expenses', 'expense'),
('Salary Expenses', 'expense'),
('Administrative Expenses', 'expense'),

-- Asset categories
('Cash and Bank', 'asset'),
('Accounts Receivable', 'asset'),
('Fixed Assets', 'asset'),

-- Liability categories
('Accounts Payable', 'liability'),
('Accrued Expenses', 'liability'),
('Short-term Loans', 'liability');

-- Insert sample bank
INSERT INTO banks (name, account_no, branch, ifsc_code, current_balance) VALUES
('Main Business Account', '1234567890', 'Main Branch', 'SBIN0001234', 100000.00);

-- Insert sample vendor
INSERT INTO vendors (name, gst_no, contact_person, email, phone, address) VALUES
('ABC Fuel Station', '29ABCDE1234F1Z5', 'John Doe', 'john@abcfuel.com', '9876543210', '123 Main Street, City');

-- ============================================================================
-- 8. ENABLE RLS AND CREATE POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE ap_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE ap_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE banks ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Finance data is viewable by authenticated users" ON accounts FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Finance data is viewable by authenticated users" ON transactions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Finance data is viewable by authenticated users" ON categories FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Finance data is viewable by authenticated users" ON journal_entries FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Finance data is viewable by authenticated users" ON journal_lines FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Finance data is viewable by authenticated users" ON vendors FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Finance data is viewable by authenticated users" ON ap_invoices FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Finance data is viewable by authenticated users" ON ap_payments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Finance data is viewable by authenticated users" ON banks FOR SELECT USING (auth.role() = 'authenticated');

-- Create policies for admin users
CREATE POLICY "Finance data is editable by admins" ON accounts FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
);
CREATE POLICY "Finance data is editable by admins" ON transactions FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
);
CREATE POLICY "Finance data is editable by admins" ON categories FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
);
CREATE POLICY "Finance data is editable by admins" ON journal_entries FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
);
CREATE POLICY "Finance data is editable by admins" ON journal_lines FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
);
CREATE POLICY "Finance data is editable by admins" ON vendors FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
);
CREATE POLICY "Finance data is editable by admins" ON ap_invoices FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
);
CREATE POLICY "Finance data is editable by admins" ON ap_payments FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
);
CREATE POLICY "Finance data is editable by admins" ON banks FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
);

-- ============================================================================
-- 9. VERIFICATION
-- ============================================================================

-- Check if all tables exist
SELECT 'Tables created:' as info, table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'accounts', 'transactions', 'categories', 'journal_entries', 'journal_lines',
    'vendors', 'ap_invoices', 'ap_payments', 'banks'
);

-- Check if accounts table has balance column
SELECT 'Accounts table columns:' as info, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'accounts' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check foreign key relationships
SELECT 'Foreign keys:' as info, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_schema = 'public'
AND tc.table_name IN ('transactions', 'journal_lines', 'ap_invoices', 'ap_payments');

-- Show success message
SELECT 'SUCCESS: Finance module schema has been created with all required tables and relationships!' as result;

