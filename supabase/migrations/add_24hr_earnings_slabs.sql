-- Add 24-hour earnings slabs to admin settings
INSERT INTO admin_settings (setting_type, setting_key, setting_value, description) VALUES
('company_earnings', 'earnings_slabs_24hr', '[
  {"min_trips": 0, "max_trips": 9, "amount": 1590},
  {"min_trips": 10, "max_trips": 15, "amount": 1490},
  {"min_trips": 16, "max_trips": 19, "amount": 1430},
  {"min_trips": 20, "max_trips": 21, "amount": 1270},
  {"min_trips": 22, "max_trips": 23, "amount": 1170},
  {"min_trips": 24, "max_trips": null, "amount": 1070}
]', 'Company earnings calculation for 24-hour shifts based on trip count')
ON CONFLICT (setting_type, setting_key) DO NOTHING; 