-- Ensure managers can access fleet_reports for AdminReports, Dashboard, etc.
-- Adds RLS policies so admin, super_admin, manager, and accountant can access fleet_reports.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'fleet_reports') THEN
    ALTER TABLE public.fleet_reports ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Staff can view fleet reports" ON public.fleet_reports;
    DROP POLICY IF EXISTS "Staff can manage fleet reports" ON public.fleet_reports;

    CREATE POLICY "Staff can view fleet reports" ON public.fleet_reports
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.users
          WHERE users.id = auth.uid()
          AND users.role IN ('admin', 'super_admin', 'manager', 'accountant')
        )
      );

    CREATE POLICY "Staff can manage fleet reports" ON public.fleet_reports
      FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.users
          WHERE users.id = auth.uid()
          AND users.role IN ('admin', 'super_admin', 'manager', 'accountant')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.users
          WHERE users.id = auth.uid()
          AND users.role IN ('admin', 'super_admin', 'manager', 'accountant')
        )
      );
  END IF;
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN OTHERS THEN RAISE NOTICE 'Migration skipped or failed: %', SQLERRM;
END $$;
