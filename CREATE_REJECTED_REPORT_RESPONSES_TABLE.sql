-- Create table for manager responses to rejected reports
CREATE TABLE IF NOT EXISTS rejected_report_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES fleet_reports(id) ON DELETE CASCADE,
  manager_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  note TEXT,
  image_url TEXT,
  status VARCHAR(50) DEFAULT 'submitted' CHECK (status IN ('submitted', 'confirmed', 'rejected')),
  confirmed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_report_response UNIQUE (report_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_rejected_report_responses_report_id ON rejected_report_responses(report_id);
CREATE INDEX IF NOT EXISTS idx_rejected_report_responses_manager_id ON rejected_report_responses(manager_id);
CREATE INDEX IF NOT EXISTS idx_rejected_report_responses_status ON rejected_report_responses(status);
CREATE INDEX IF NOT EXISTS idx_rejected_report_responses_created_at ON rejected_report_responses(created_at DESC);

-- Add comment to table
COMMENT ON TABLE rejected_report_responses IS 'Stores manager responses (notes and images) for rejected reports, with accountant confirmation status';

-- Add comments to columns
COMMENT ON COLUMN rejected_report_responses.report_id IS 'Reference to the rejected fleet_report';
COMMENT ON COLUMN rejected_report_responses.manager_id IS 'Manager who submitted the response';
COMMENT ON COLUMN rejected_report_responses.note IS 'Manager notes about the rejected report';
COMMENT ON COLUMN rejected_report_responses.image_url IS 'URL to uploaded image file';
COMMENT ON COLUMN rejected_report_responses.status IS 'Status: submitted (pending), confirmed (by accountant), or rejected';
COMMENT ON COLUMN rejected_report_responses.confirmed_by IS 'Accountant who confirmed the response';
COMMENT ON COLUMN rejected_report_responses.confirmed_at IS 'Timestamp when accountant confirmed';

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_rejected_report_responses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_rejected_report_responses_updated_at
  BEFORE UPDATE ON rejected_report_responses
  FOR EACH ROW
  EXECUTE FUNCTION update_rejected_report_responses_updated_at();
