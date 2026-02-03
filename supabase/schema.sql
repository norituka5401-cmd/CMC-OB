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
