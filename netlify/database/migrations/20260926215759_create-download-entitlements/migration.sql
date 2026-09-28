CREATE TABLE IF NOT EXISTS download_entitlements (
    id BIGSERIAL PRIMARY KEY,

    purchase_id BIGINT NOT NULL
        REFERENCES purchases(id)
        ON DELETE CASCADE,

    customer_email TEXT NOT NULL,

    product_id TEXT NOT NULL,

    download_token TEXT NOT NULL UNIQUE,

    download_count INTEGER NOT NULL DEFAULT 0,

    max_downloads INTEGER NOT NULL DEFAULT 5,

    expires_at TIMESTAMPTZ,

    last_downloaded_at TIMESTAMPTZ,

    status TEXT NOT NULL DEFAULT 'active',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT download_entitlements_status_check
        CHECK (
            status IN (
                'active',
                'expired',
                'revoked'
            )
        ),

    CONSTRAINT download_entitlements_count_check
        CHECK (
            download_count >= 0
        ),

    CONSTRAINT download_entitlements_max_check
        CHECK (
            max_downloads > 0
        ),

    CONSTRAINT download_entitlements_purchase_unique
        UNIQUE (purchase_id)
);


CREATE INDEX IF NOT EXISTS idx_download_entitlements_token
    ON download_entitlements(download_token);


CREATE INDEX IF NOT EXISTS idx_download_entitlements_email
    ON download_entitlements(customer_email);


CREATE INDEX IF NOT EXISTS idx_download_entitlements_product
    ON download_entitlements(product_id);


CREATE INDEX IF NOT EXISTS idx_download_entitlements_status
    ON download_entitlements(status);