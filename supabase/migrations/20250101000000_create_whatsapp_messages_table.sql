-- Create WhatsApp messages table
CREATE TABLE IF NOT EXISTS whatsapp_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    phone_number TEXT NOT NULL,
    name TEXT,
    message_type TEXT NOT NULL CHECK (message_type IN ('text', 'image', 'voice', 'document')),
    message_content TEXT NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    media_url TEXT,
    media_id TEXT,
    status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_phone_number ON whatsapp_messages(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_timestamp ON whatsapp_messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_direction ON whatsapp_messages(direction);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_whatsapp_messages_updated_at 
    BEFORE UPDATE ON whatsapp_messages 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (you can restrict this based on your needs)
CREATE POLICY "Allow all operations on whatsapp_messages" ON whatsapp_messages
    FOR ALL USING (true);

-- Create a view for chat summaries
CREATE OR REPLACE VIEW chat_summaries AS
SELECT 
    phone_number,
    name,
    MAX(timestamp) as last_message_time,
    COUNT(*) as total_messages,
    COUNT(CASE WHEN direction = 'incoming' THEN 1 END) as incoming_count,
    COUNT(CASE WHEN direction = 'outgoing' THEN 1 END) as outgoing_count,
    MIN(timestamp) as first_message_time
FROM whatsapp_messages
GROUP BY phone_number, name;

-- Create a function to get chat history for a phone number
CREATE OR REPLACE FUNCTION get_chat_history(p_phone_number TEXT)
RETURNS TABLE (
    id UUID,
    phone_number TEXT,
    name TEXT,
    message_type TEXT,
    message_content TEXT,
    direction TEXT,
    timestamp TIMESTAMP WITH TIME ZONE,
    media_url TEXT,
    media_id TEXT,
    status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        wm.id,
        wm.phone_number,
        wm.name,
        wm.message_type,
        wm.message_content,
        wm.direction,
        wm.timestamp,
        wm.media_url,
        wm.media_id,
        wm.status
    FROM whatsapp_messages wm
    WHERE wm.phone_number = p_phone_number
    ORDER BY wm.timestamp ASC;
END;
$$ LANGUAGE plpgsql; 