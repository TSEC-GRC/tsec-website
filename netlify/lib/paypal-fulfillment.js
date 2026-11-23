
import crypto from "node:crypto";
import { getDatabase } from "@netlify/database";

/**
 * TSEC — PayPal Shared Fulfillment
 *
 * Shared payment fulfillment logic for:
 * - paypal-capture-order.js
 * - paypal-webhook.js
 *
 * This module assumes that the PayPal capture has already
 * been authenticated against PayPal and its order validated.
 *
 * It does NOT verify webhook signatures or call PayPal APIs.
 */



const DOWNLOAD_LIMIT = 5;
const DOWNLOAD_VALIDITY_DAYS = 7;

/**
 * Validate a completed PayPal capture against the
 * authoritative private TSEC product catalog.
 */
export function validateCompletedCapture(capture, product) {

    if (!capture || !product) {
        return false;
    }

    return (
        typeof capture.id === "string" &&
        /^[A-Z0-9]{10,64}$/i.test(capture.id) &&
        capture.status === "COMPLETED" &&
        capture.amount?.currency_code === product.currency &&
        capture.amount?.value === product.amount
    );
}

/**
 * Extract the buyer email from PayPal or Venmo order data.
 */
export function getBuyerEmail(order) {

    const paymentSource = order?.payment_source || {};

    const candidates = [
        order?.payer?.email_address,
        paymentSource?.paypal?.email_address,
        paymentSource?.venmo?.email_address
    ];

    for (const candidate of candidates) {

        if (
            typeof candidate === "string" &&
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate.trim())
        ) {
            return candidate.trim().toLowerCase();
        }
    }

    return null;
}

/**
 * Create or recover the download entitlement.
 *
 * The unique purchase_id constraint is the final protection
 * against concurrent duplicate entitlement creation.
 */

async function createDownloadEntitlement(db, {
    purchaseId,
    customerEmail,
    productId
}) {
    /**
     * Validate entitlement integrity without changing availability.
     *
     * Existing entitlements must never be renewed, reactivated,
     * or have their download history modified during webhook retries.
     */
    function validateExistingEntitlement(entitlement) {
        if (
            !entitlement ||
            !entitlement.id ||
            entitlement.product_id !== productId ||
            typeof entitlement.customer_email !== "string" ||
            entitlement.customer_email.toLowerCase() !==
                customerEmail.toLowerCase()
        ) {
            throw new Error(
                "Existing download entitlement does not match the purchase."
            );
        }

        const downloadCount = Number(entitlement.download_count);
        const maxDownloads = Number(entitlement.max_downloads);

        const validStatuses = [
            "active",
            "expired",
            "revoked"
        ];

        if (
            !Number.isInteger(downloadCount) ||
            !Number.isInteger(maxDownloads) ||
            downloadCount < 0 ||
            maxDownloads <= 0 ||
            downloadCount > maxDownloads ||
            !validStatuses.includes(entitlement.status)
        ) {
            throw new Error(
                "Existing download entitlement has invalid status or download metadata."
            );
        }

        if (
            entitlement.expires_at !== null &&
            entitlement.expires_at !== undefined &&
            !Number.isFinite(
                new Date(entitlement.expires_at).getTime()
            )
        ) {
            throw new Error(
                "Existing download entitlement has an invalid expiration date."
            );
        }

        // Preserve the original entitlement state, expiration and limits.
        // Download endpoints independently enforce actual availability.
        return entitlement.id;
    }

    const existing = await db.sql`
        SELECT
            id,
            customer_email,
            product_id,
            status,
            download_count,
            max_downloads,
            expires_at
        FROM download_entitlements
        WHERE purchase_id = ${purchaseId}
        LIMIT 1
    `;

    if (existing.length > 0) {
        return validateExistingEntitlement(existing[0]);
    }

    const token = crypto.randomBytes(32).toString("hex");

    const expiresAt = new Date(
        Date.now() +
        DOWNLOAD_VALIDITY_DAYS * 24 * 60 * 60 * 1000
    ).toISOString();

    const inserted = await db.sql`
        INSERT INTO download_entitlements (
            purchase_id,
            customer_email,
            product_id,
            download_token,
            download_count,
            max_downloads,
            expires_at,
            status
        )
        VALUES (
            ${purchaseId},
            ${customerEmail},
            ${productId},
            ${token},
            ${0},
            ${DOWNLOAD_LIMIT},
            ${expiresAt},
            ${"active"}
        )
        ON CONFLICT (purchase_id)
        DO NOTHING
        RETURNING id
    `;

    if (inserted.length > 0) {
        return inserted[0].id;
    }

    // Another concurrent request may have created the entitlement.
    const recovered = await db.sql`
        SELECT
            id,
            customer_email,
            product_id,
            status,
            download_count,
            max_downloads,
            expires_at
        FROM download_entitlements
        WHERE purchase_id = ${purchaseId}
        LIMIT 1
    `;

    if (recovered.length === 0) {
        throw new Error(
            "Download entitlement could not be created or recovered."
        );
    }

    // Reuse the original entitlement without changing its state or limits.
    return validateExistingEntitlement(recovered[0]);
}
async function registerPurchase(db, {
    capture,
    orderId,
    product,
    customerEmail
}) {
    const captureId = capture.id;
    const eventId = `paypal_capture:${captureId}`;

    const priceReference =
        `tsec:${product.productId}:${product.currency}:${product.amount}`;

    const inserted = await db.sql`
        INSERT INTO purchases (
            event_id,
            transaction_id,
            customer_email,
            product_id,
            price_id,
            product_name,
            quantity,
            amount,
            currency,
            payment_status,
            fulfillment_status,
            payment_provider,
            provider_order_id,
            provider_event_id
        )
        VALUES (
            ${eventId},
            ${captureId},
            ${customerEmail},
            ${product.productId},
            ${priceReference},
            ${product.productName},
            ${1},
            ${product.amount},
            ${product.currency},
            ${"completed"},
            ${"pending"},
            ${"paypal"},
            ${orderId},
            ${eventId}
        )
        ON CONFLICT DO NOTHING
        RETURNING id
    `;

    let purchase;

    if (inserted.length > 0) {
        purchase = inserted[0];
    } else {
                
	const existing = await db.sql`
            SELECT
                id,
                event_id,
                transaction_id,
		price_id,
                customer_email,
                product_id,
                product_name,
                quantity,
                amount,
                currency,
                payment_status,
                fulfillment_status,
                payment_provider,
                provider_order_id,
                provider_event_id
            FROM purchases
            WHERE transaction_id = ${captureId}
               OR event_id = ${eventId}
               OR provider_event_id = ${eventId}
               OR (
                    payment_provider = ${"paypal"}
                    AND provider_order_id = ${orderId}
               )
            LIMIT 2
        `;

        if (existing.length !== 1) {
            throw new Error(
                "PayPal purchase conflict: no unique matching purchase was found."
            );
        }

        purchase = existing[0];

        if (
            purchase.transaction_id !== captureId ||
            purchase.event_id !== eventId ||
            purchase.price_id !== priceReference ||
            purchase.product_id !== product.productId ||
            purchase.product_name !== product.productName ||
            Number(purchase.quantity) !== 1 ||
            Number(purchase.amount).toFixed(2) !== product.amount ||
            purchase.currency !== product.currency ||
            purchase.payment_status !== "completed" ||
            purchase.payment_provider !== "paypal" ||
            purchase.provider_order_id !== orderId ||
	   (
        	customerEmail &&
                purchase.customer_email &&
                purchase.customer_email.trim() !== "" &&
                purchase.customer_email.trim().toLowerCase() !== customerEmail
	   ) ||
	   purchase.provider_event_id !== eventId
        ) {
            throw new Error(
                "PayPal purchase conflict: existing purchase data does not match the verified capture."
            );
        }
    }

    // Recover a missing buyer email without overwriting an existing one.
    if (customerEmail) {
        await db.sql`
            UPDATE purchases
            SET
                customer_email = COALESCE(NULLIF(TRIM(customer_email), ''), ${customerEmail}),
                updated_at = NOW()
            WHERE id = ${purchase.id}
        `;
    }

    const savedPurchase = await db.sql`
        SELECT
            id,
            customer_email
        FROM purchases
        WHERE id = ${purchase.id}
        LIMIT 1
    `;

    if (savedPurchase.length === 0) {
        throw new Error("PayPal purchase could not be recovered.");
    }

    const savedEmail = savedPurchase[0].customer_email;

    if (!savedEmail) {
        return {
            purchaseId: purchase.id,
            entitlementId: null,
            fulfillmentStatus: "pending",
            emailMissing: true
        };
    }

    const entitlementId = await createDownloadEntitlement(db, {
        purchaseId: purchase.id,
        customerEmail: savedEmail,
        productId: product.productId
    });

    const readyPurchase = await db.sql`
        UPDATE purchases
        SET
            fulfillment_status = 'ready',
            updated_at = NOW()
        WHERE id = ${purchase.id}
          AND payment_status = 'completed'
        RETURNING id
    `;

    if (readyPurchase.length !== 1) {
        throw new Error(
            "PayPal purchase could not be marked as ready."
        );
    }

    return {
        purchaseId: purchase.id,
        entitlementId,
        fulfillmentStatus: "ready",
        emailMissing: false
    };
}


/**
 * Normalize a customer delivery email.
 */
function normalizeDeliveryEmail(email) {
    if (
        typeof email !== "string" ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    ) {
        return null;
    }

    return email.trim().toLowerCase();
}

/**
 * Associate a PayPal order with its requested delivery email.
 * An existing order association cannot be overwritten with
 * a different product or email.
 */
export async function savePendingPayPalOrder({
    orderId,
    productId,
    customerEmail,
    database = null
}) {
    if (
        typeof orderId !== "string" ||
        !/^[A-Z0-9-]{10,40}$/i.test(orderId)
    ) {
        throw new Error("Invalid PayPal order ID.");
    }

    if (typeof productId !== "string" || !productId.trim()) {
        throw new Error("Invalid PayPal product ID.");
    }

    const normalizedEmail = normalizeDeliveryEmail(customerEmail);

    if (!normalizedEmail) {
        throw new Error("Invalid delivery email.");
    }

    const db = database ?? getDatabase();

    const rows = await db.sql`
        INSERT INTO paypal_pending_orders (
            order_id,
            product_id,
            delivery_email
        )
        VALUES (
            ${orderId},
            ${productId.trim()},
            ${normalizedEmail}
        )
        ON CONFLICT (order_id)
        DO UPDATE SET
            updated_at = NOW()
        WHERE
            paypal_pending_orders.product_id = EXCLUDED.product_id
            AND paypal_pending_orders.delivery_email = EXCLUDED.delivery_email
        RETURNING order_id
    `;

    if (!rows || rows.length !== 1) {
        throw new Error(
            "PayPal order is already associated with different checkout details."
        );
    }

    return { orderId, productId: productId.trim(), customerEmail: normalizedEmail };
}

/**
 * Retrieve the delivery email previously associated with
 * a PayPal order. Product mismatch is treated as an error.
 */
export async function getPendingPayPalOrderEmail({
    orderId,
    productId,
    database = null
}) {
    if (
        typeof orderId !== "string" ||
        !/^[A-Z0-9-]{10,40}$/i.test(orderId)
    ) {
        throw new Error("Invalid PayPal order ID.");
    }

    if (typeof productId !== "string" || !productId.trim()) {
        throw new Error("Invalid PayPal product ID.");
    }

    const db = database ?? getDatabase();

    const rows = await db.sql`
        SELECT product_id, delivery_email
        FROM paypal_pending_orders
        WHERE order_id = ${orderId}
        LIMIT 1
    `;

    if (!rows || rows.length === 0) {
        return null;
    }

    const saved = rows[0];

    if (saved.product_id !== productId.trim()) {
        throw new Error(
            "PayPal order product does not match its saved checkout association."
        );
    }

    const email = normalizeDeliveryEmail(saved.delivery_email);

    if (!email) {
        throw new Error("Saved PayPal delivery email is invalid.");
    }

    return email;
}

/**
 * Public shared fulfillment entry point.
 */
export async function processCompletedCapture({
    capture,
    orderId,
    product,
    customerEmail,
    database = null
}) {

    if (!validateCompletedCapture(capture, product)) {
        throw new Error(
            "PayPal capture failed fulfillment validation."
        );
    }

    if (
        typeof orderId !== "string" ||
        !/^[A-Z0-9-]{10,40}$/i.test(orderId)
    ) {
        throw new Error("Invalid PayPal order ID.");
    }

    const normalizedEmail =
        typeof customerEmail === "string" &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim())
            ? customerEmail.trim().toLowerCase()
            : null;

    const db = database ?? getDatabase();

    return registerPurchase(db, {
        capture,
        orderId,
        product,
        customerEmail: normalizedEmail
    });
}
