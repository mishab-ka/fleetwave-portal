-- Create driver refund requests table (R&F payout requests)

CREATE TABLE IF NOT EXISTS public.driver_refund_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_by UUID REFERENCES public.users(id),
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  notes TEXT,
  reviewed_by UUID REFERENCES public.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_driver_refund_requests_driver_id ON public.driver_refund_requests(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_refund_requests_status ON public.driver_refund_requests(status);
CREATE INDEX IF NOT EXISTS idx_driver_refund_requests_requested_at ON public.driver_refund_requests(requested_at);

ALTER TABLE public.driver_refund_requests ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Admins/managers can view refund requests" ON public.driver_refund_requests;
  DROP POLICY IF EXISTS "Admins/managers can create refund requests" ON public.driver_refund_requests;
  DROP POLICY IF EXISTS "Admins/managers can update refund requests" ON public.driver_refund_requests;
  DROP POLICY IF EXISTS "Drivers can view their own refund requests" ON public.driver_refund_requests;
  DROP POLICY IF EXISTS "Drivers can create their own refund requests" ON public.driver_refund_requests;

  CREATE POLICY "Admins/managers can view refund requests" ON public.driver_refund_requests
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
          AND role IN ('admin', 'super_admin', 'manager')
      )
    );

  CREATE POLICY "Admins/managers can create refund requests" ON public.driver_refund_requests
    FOR INSERT WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
          AND role IN ('admin', 'super_admin', 'manager')
      )
    );

  CREATE POLICY "Admins/managers can update refund requests" ON public.driver_refund_requests
    FOR UPDATE USING (
      EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
          AND role IN ('admin', 'super_admin', 'manager')
      )
    );

  CREATE POLICY "Drivers can view their own refund requests" ON public.driver_refund_requests
    FOR SELECT USING (auth.uid() = driver_id);

  CREATE POLICY "Drivers can create their own refund requests" ON public.driver_refund_requests
    FOR INSERT WITH CHECK (
      auth.uid() = driver_id
      AND requested_by = auth.uid()
      AND status = 'pending'
    );
END $$;

COMMENT ON TABLE public.driver_refund_requests IS 'Tracks refund payout requests against a driver''s positive R&F (refund) balance';
COMMENT ON COLUMN public.driver_refund_requests.status IS 'pending | approved | rejected';
