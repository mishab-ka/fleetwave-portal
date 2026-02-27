-- Table to store total cash in hand
-- = SUM(cash_amount) from fleet_reports (the "cash" table / Cash column)
-- One row: total_amount = total of all cash_amount added in reports

CREATE TABLE IF NOT EXISTS public.cash_in_hand_total (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  total_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.cash_in_hand_total IS 'Total of fleet_reports.cash_amount (Cash column). One row, updated by trigger.';

-- Recalculate: count total from fleet_reports.cash_amount and store in cash_in_hand_total
CREATE OR REPLACE FUNCTION public.recalculate_cash_in_hand_total()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_total NUMERIC(14, 2);
BEGIN
  -- Sum all cash_amount in fleet_reports (cash table) and store as total
  SELECT COALESCE(SUM(CAST(cash_amount AS NUMERIC)), 0)
  INTO new_total
  FROM public.fleet_reports
  WHERE cash_amount IS NOT NULL AND cash_amount > 0;

  DELETE FROM public.cash_in_hand_total;
  INSERT INTO public.cash_in_hand_total (total_amount, updated_at)
  VALUES (new_total, NOW());
END;
$$;

-- Trigger on fleet_reports: after insert, update, delete
CREATE OR REPLACE FUNCTION public.fleet_reports_cash_in_hand_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.recalculate_cash_in_hand_total();
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trigger_recalculate_cash_in_hand ON public.fleet_reports;
CREATE TRIGGER trigger_recalculate_cash_in_hand
  AFTER INSERT OR UPDATE OF cash_amount, paying_cash OR DELETE
  ON public.fleet_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.fleet_reports_cash_in_hand_trigger();

-- Initialize: populate the single row with current total
SELECT public.recalculate_cash_in_hand_total();

-- RLS: allow read for authenticated users
ALTER TABLE public.cash_in_hand_total ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read cash_in_hand_total for authenticated" ON public.cash_in_hand_total;
CREATE POLICY "Allow read cash_in_hand_total for authenticated"
  ON public.cash_in_hand_total
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow service_role and trigger (SECURITY DEFINER) to manage
DROP POLICY IF EXISTS "Allow service role to manage cash_in_hand_total" ON public.cash_in_hand_total;
CREATE POLICY "Allow service role to manage cash_in_hand_total"
  ON public.cash_in_hand_total
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
