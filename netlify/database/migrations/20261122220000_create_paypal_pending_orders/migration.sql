CREATE TABLE paypal_pending_orders (
    order_id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    delivery_email TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_paypal_pending_orders_created_at
    ON paypal_pending_orders (created_at);