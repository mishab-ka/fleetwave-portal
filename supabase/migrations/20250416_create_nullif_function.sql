
-- Create a nullif_value function to set a value to NULL if it matches
CREATE OR REPLACE FUNCTION public.nullif_value(value uuid)
RETURNS uuid
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN NULL;
END;
$$;
