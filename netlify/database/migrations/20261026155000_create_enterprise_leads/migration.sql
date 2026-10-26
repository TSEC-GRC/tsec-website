
-- ============================================================
-- TSEC — Enterprise Leads
-- Enterprise quote requests
-- ============================================================

CREATE TABLE IF NOT EXISTS enterprise_leads (
    id BIGSERIAL PRIMARY KEY,

    company TEXT NOT NULL,
    industry TEXT NOT NULL,

    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT,

    services TEXT[] NOT NULL DEFAULT '{}',
    requirements TEXT,

    status TEXT NOT NULL DEFAULT 'new'
        CHECK (
            status IN (
                'new',
                'contacted',
                'qualified',
                'closed',
                'spam'
            )
        ),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_enterprise_leads_email
    ON enterprise_leads (email);

CREATE INDEX IF NOT EXISTS idx_enterprise_leads_status
    ON enterprise_leads (status);

CREATE INDEX IF NOT EXISTS idx_enterprise_leads_created_at
    ON enterprise_leads (created_at DESC);

