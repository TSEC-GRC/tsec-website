-- ============================================================
-- TSEC — Purchases
-- Paddle transaction records
-- ============================================================

CREATE TABLE IF NOT EXISTS purchases (
    id BIGSERIAL PRIMARY KEY,

    -- Paddle identifiers
    event_id TEXT NOT NULL UNIQUE,
    transaction_id TEXT NOT NULL UNIQUE,

    -- Customer
    customer_email TEXT,

    -- Product
    product_id TEXT NOT NULL,
    price_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,

    -- Payment
    amount NUMERIC(12, 2),
    currency TEXT,

    -- Status
    payment_status TEXT NOT NULL DEFAULT 'completed',
    fulfillment_status TEXT NOT NULL DEFAULT 'pending',

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_purchases_customer_email
    ON purchases (customer_email);

CREATE INDEX IF NOT EXISTS idx_purchases_product_id
    ON purchases (product_id);

CREATE INDEX IF NOT EXISTS idx_purchases_created_at
    ON purchases (created_at);