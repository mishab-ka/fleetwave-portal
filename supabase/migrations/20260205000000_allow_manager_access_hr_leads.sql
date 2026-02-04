-- Allow managers (fleet managers) to access hr_leads for Joining Reports page
-- Admins see data; managers were getting empty results due to missing RLS policy

-- hr_leads: Managers can SELECT, INSERT, UPDATE (same as admins for joining reports)
CREATE POLICY "Managers can manage hr_leads" ON public.hr_leads
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role = 'manager'
    )
  );

-- hr_lead_activities: Managers need to log activities when marking joined/not joined
CREATE POLICY "Managers can manage hr_lead_activities" ON public.hr_lead_activities
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role = 'manager'
    )
  );

-- hr_lead_statuses: Managers need to view status options
CREATE POLICY "Managers can view hr_lead_statuses" ON public.hr_lead_statuses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role = 'manager'
    )
  );

-- hr_staff_assignments: Managers need SELECT when adding leads (lookup staff assignment)
CREATE POLICY "Managers can view hr_staff_assignments" ON public.hr_staff_assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role = 'manager'
    )
  );
