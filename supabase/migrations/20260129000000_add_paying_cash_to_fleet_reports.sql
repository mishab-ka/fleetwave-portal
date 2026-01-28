-- Add paying cash option to fleet_reports (driver indicates paying by cash + amount + manager)
ALTER TABLE public.fleet_reports
  ADD COLUMN IF NOT EXISTS paying_cash BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS cash_amount NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS cash_manager_id UUID REFERENCES public.users(id);

COMMENT ON COLUMN public.fleet_reports.paying_cash IS 'Driver indicated they will pay by cash';
COMMENT ON COLUMN public.fleet_reports.cash_amount IS 'Cash amount driver will pay';
COMMENT ON COLUMN public.fleet_reports.cash_manager_id IS 'Manager selected to receive the cash';
