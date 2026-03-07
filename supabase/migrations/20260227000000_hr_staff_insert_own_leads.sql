-- Allow HR staff to insert leads that are assigned to themselves (for mobile "Add Lead")
CREATE POLICY "HR Staff can insert leads assigned to themselves" ON public.hr_leads
  FOR INSERT WITH CHECK (assigned_staff_user_id = auth.uid());
