-- ============================================================
-- CASH IN HAND TOTAL (run this in Supabase SQL Editor)
-- ============================================================
-- 1. Cash table = fleet_reports (the reports table with Cash column)
-- 2. We SUM the cash_amount column from fleet_reports
-- 3. Store that total in cash_in_hand_total (one row)
-- 4. Trigger keeps it updated when reports are added/edited/deleted
-- ============================================================

-- 1. Table: one row holding total_amount = sum of all cash_amount in fleet_reports
CREATE TABLE IF NOT EXISTS public.cash_in_hand_total (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  total_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.cash_in_hand_total IS 'Total of fleet_reports.cash_amount (Cash column). Updated by trigger.';

-- 2. Function: count total from fleet_reports.cash_amount and store in cash_in_hand_total
CREATE OR REPLACE FUNCTION public.recalculate_cash_in_hand_total()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_total NUMERIC(14, 2);
BEGIN
  SELECT COALESCE(SUM(CAST(cash_amount AS NUMERIC)), 0)
  INTO new_total
  FROM public.fleet_reports
  WHERE cash_amount IS NOT NULL AND cash_amount > 0;

  DELETE FROM public.cash_in_hand_total;
  INSERT INTO public.cash_in_hand_total (total_amount, updated_at)
  VALUES (new_total, NOW());
END;
$$;

-- 3. Trigger: when fleet_reports change, update the total
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

-- 4. Set initial total from existing data
SELECT public.recalculate_cash_in_hand_total();

-- 5. RLS: allow authenticated users to read
ALTER TABLE public.cash_in_hand_total ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read cash_in_hand_total for authenticated" ON public.cash_in_hand_total;
CREATE POLICY "Allow read cash_in_hand_total for authenticated"
  ON public.cash_in_hand_total
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow service role to manage cash_in_hand_total" ON public.cash_in_hand_total;
CREATE POLICY "Allow service role to manage cash_in_hand_total"
  ON public.cash_in_hand_total
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Done. Check the value:
-- SELECT * FROM public.cash_in_hand_total;
