-- Create events table
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create event options (candidate dates/times)
CREATE TABLE event_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    option_text TEXT NOT NULL, -- e.g., "2024-02-10 18:00"
    display_order INTEGER DEFAULT 0
);

-- Create event responses (participants)
CREATE TABLE event_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create availability (the matrix data)
CREATE TABLE availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    response_id UUID REFERENCES event_responses(id) ON DELETE CASCADE,
    option_id UUID REFERENCES event_options(id) ON DELETE CASCADE,
    status TEXT NOT NULL, -- 'yes' (◯), 'maybe' (△), 'no' (✕)
    UNIQUE(response_id, option_id)
);

-- --- Security & Billing Safety (RLS Policies) ---

-- Enable RLS for all tables
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read data (to view events and responses)
CREATE POLICY "Public Read Access" ON events FOR SELECT USING (true);
CREATE POLICY "Public Read Access" ON event_options FOR SELECT USING (true);
CREATE POLICY "Public Read Access" ON event_responses FOR SELECT USING (true);
CREATE POLICY "Public Read Access" ON availability FOR SELECT USING (true);

-- Allow anyone to create data (to create new events and respond)
CREATE POLICY "Public Insert Access" ON events FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Insert Access" ON event_options FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Insert Access" ON event_responses FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Insert Access" ON availability FOR INSERT WITH CHECK (true);

-- Admin Delete (For now, allow anyone with the link to delete as implemented in UI)
-- In real production with sensitive data, we would use Auth here.
CREATE POLICY "Public Delete Access" ON events FOR DELETE USING (true);
CREATE POLICY "Public Delete Access" ON event_responses FOR DELETE USING (true);
