-- Create admin_settings table for dynamic configuration
CREATE TABLE IF NOT EXISTS admin_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_type VARCHAR(50) NOT NULL,
  setting_key VARCHAR(100) NOT NULL,
  setting_value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE(setting_type, setting_key)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_admin_settings_type_key ON admin_settings(setting_type, setting_key);

-- Insert default fleet rent expense slabs
INSERT INTO admin_settings (setting_type, setting_key, setting_value, description) VALUES
('fleet_expense', 'rent_slabs', '[
  {"min_trips": 0, "max_trips": 63, "amount": 980},
  {"min_trips": 64, "max_trips": 79, "amount": 830},
  {"min_trips": 80, "max_trips": 109, "amount": 740},
  {"min_trips": 110, "max_trips": 124, "amount": 560},
  {"min_trips": 125, "max_trips": 139, "amount": 410},
  {"min_trips": 140, "max_trips": null, "amount": 290}
]', 'Fleet rent expense calculation based on trip count'),

-- Insert default company earnings slabs
('company_earnings', 'earnings_slabs', '[
  {"min_trips": 0, "max_trips": 4, "amount": 795},
  {"min_trips": 5, "max_trips": 7, "amount": 745},
  {"min_trips": 8, "max_trips": 9, "amount": 715},
  {"min_trips": 10, "max_trips": 10, "amount": 635},
  {"min_trips": 11, "max_trips": 11, "amount": 585},
  {"min_trips": 12, "max_trips": null, "amount": 535}
]', 'Company earnings calculation based on trip count'),

-- Insert general settings
('general', 'company_info', '{
  "company_name": "Fleet Management",
  "contact_email": "admin@fleetmanagement.com",
  "contact_phone": "+91 1234567890"
}', 'General company information'),

-- Insert notification settings
('notifications', 'preferences', '{
  "email_notifications": true,
  "sms_notifications": false,
  "new_report_notifications": true
}', 'Notification preferences'),

-- Insert system settings
('system', 'config', '{
  "dark_mode": false,
  "debug_mode": false,
  "maintenance_mode": false,
  "api_key": "sk_live_51LcnOx8nJkjGWqKgjGSmAuPbzk5KLHLFD"
}', 'System configuration settings');

-- Enable RLS
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Admin settings are viewable by authenticated users" ON admin_settings
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admin settings are editable by admins" ON admin_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_admin_settings_updated_at 
  BEFORE UPDATE ON admin_settings 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column(); 