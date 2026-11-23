-- ============================================================
-- TSEC — Multi-provider payment support
-- Preserve historical Paddle purchases and support PayPal.
-- ============================================================

ALTER TABLE purchases
    ADD COLUMN payment_provider TEXT NOT NULL DEFAULT 'paddle';

ALTER TABLE purchases
    ADD COLUMN provider_order_id TEXT;

ALTER TABLE purchases
    ADD COLUMN provider_event_id TEXT;

-- Restrict supported payment providers.
ALTER TABLE purchases
    ADD CONSTRAINT purchases_payment_provider_check
    CHECK (payment_provider IN ('paddle', 'paypal'));

-- Prevent processing the same provider event more than once.
CREATE UNIQUE INDEX idx_purchases_provider_event_id
    ON purchases (provider_event_id)
    WHERE provider_event_id IS NOT NULL;

-- Allow lookup of purchases by provider order.
CREATE INDEX idx_purchases_provider_order_id
    ON purchases (payment_provider, provider_order_id)
    WHERE provider_order_id IS NOT NULL;
