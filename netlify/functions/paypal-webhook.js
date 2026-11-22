import { getProductById } from "../lib/tsec-products.js";

/**
 * TSEC — PayPal Webhook
 *
 * Dependencies are injected for isolated testing.
 * Production fulfillment is loaded lazily by the default handler.
 */

function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store"
        }
    });
}

export function createPayPalWebhookHandler({
    fetchImpl = (...args) => fetch(...args),
    env = process.env,
    lookupProduct = getProductById,
    getBuyerEmail,
    processCompletedCapture
}) {
    if (
        typeof fetchImpl !== "function" ||
        typeof lookupProduct !== "function" ||
        typeof getBuyerEmail !== "function" ||
        typeof processCompletedCapture !== "function"
    ) {
        throw new TypeError("Invalid PayPal webhook dependencies.");
    }

    async function getPayPalAccessToken(
        apiBase,
        clientId,
        clientSecret
    ) {
        const credentials = Buffer.from(
            `${clientId}:${clientSecret}`
        ).toString("base64");

        const response = await fetchImpl(
            `${apiBase}/v1/oauth2/token`,
            {
                method: "POST",
                headers: {
                    Authorization: `Basic ${credentials}`,
                    "Content-Type": "application/x-www-form-urlencoded",
                    Accept: "application/json"
                },
                body: "grant_type=client_credentials"
            }
        );

        const data = await response.json().catch(() => ({}));

        if (!response.ok || !data.access_token) {
            throw new Error("PayPal authentication failed.");
        }

        return data.access_token;
    }

    async function verifyWebhookSignature(
        apiBase,
        accessToken,
        webhookId,
        headers,
        webhookEvent
    ) {
        const requiredHeaders = [
            "paypal-auth-algo",
            "paypal-cert-url",
            "paypal-transmission-id",
            "paypal-transmission-sig",
            "paypal-transmission-time"
        ];

        const transmission = {};

        for (const headerName of requiredHeaders) {
            const value = headers.get(headerName);

            if (!value) {
                return false;
            }

            transmission[headerName] = value;
        }

        const response = await fetchImpl(
            `${apiBase}/v1/notifications/verify-webhook-signature`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                    Accept: "application/json"
                },
                body: JSON.stringify({
                    auth_algo: transmission["paypal-auth-algo"],
                    cert_url: transmission["paypal-cert-url"],
                    transmission_id:
                        transmission["paypal-transmission-id"],
                    transmission_sig:
                        transmission["paypal-transmission-sig"],
                    transmission_time:
                        transmission["paypal-transmission-time"],
                    webhook_id: webhookId,
                    webhook_event: webhookEvent
                })
            }
        );

        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(
                "PayPal signature verification service failed."
            );
        }

        return result.verification_status === "SUCCESS";
    }

    async function getPayPalOrder(
        apiBase,
        accessToken,
        orderId
    ) {
        const response = await fetchImpl(
            `${apiBase}/v2/checkout/orders/${encodeURIComponent(orderId)}`,
            {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    Accept: "application/json"
                }
            }
        );

        const order = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error("Unable to retrieve PayPal order.");
        }

        return order;
    }

    function validateOrder(order, orderId, product, capture) {
        if (
            order.id !== orderId ||
            order.intent !== "CAPTURE" ||
            order.status !== "COMPLETED" ||
            !Array.isArray(order.purchase_units) ||
            order.purchase_units.length !== 1
        ) {
            return false;
        }

        const unit = order.purchase_units[0];

        if (
            unit.reference_id !== product.productId ||
            unit.custom_id !== product.productId ||
            unit.amount?.currency_code !== product.currency ||
            unit.amount?.value !== product.amount
        ) {
            return false;
        }

        const captures = unit.payments?.captures || [];

        const completedCaptures = captures.filter(
            item => item?.status === "COMPLETED"
        );

        if (completedCaptures.length !== 1) {
            return false;
        }

        const matchingCaptures = completedCaptures.filter(
            item => item.id === capture.id
        );

        if (matchingCaptures.length !== 1) {
            return false;
        }

        const verifiedCapture = matchingCaptures[0];

        return Boolean(
            verifiedCapture.status === "COMPLETED" &&
            verifiedCapture.amount?.currency_code === product.currency &&
            verifiedCapture.amount?.value === product.amount
        );
    }

    return async function paypalWebhookHandler(request) {
        try {
            if (request.method !== "POST") {
                return jsonResponse(
                    { error: "Method not allowed" },
                    405
                );
            }

            const environment = env.PAYPAL_ENV;
            const clientId = env.PAYPAL_CLIENT_ID;
            const clientSecret = env.PAYPAL_CLIENT_SECRET;
            const webhookId = env.PAYPAL_WEBHOOK_ID;

            if (
                !["sandbox", "live"].includes(environment) ||
                !clientId ||
                !clientSecret ||
                !webhookId
            ) {
                console.error("PAYPAL WEBHOOK CONFIGURATION ERROR");

                return jsonResponse(
                    { error: "Webhook service unavailable" },
                    500
                );
            }

            const apiBase =
                environment === "sandbox"
                    ? "https://api-m.sandbox.paypal.com"
                    : "https://api-m.paypal.com";

            const rawBody = await request.text();

            if (!rawBody || rawBody.length > 1024 * 1024) {
                return jsonResponse(
                    { error: "Invalid webhook payload" },
                    400
                );
            }

            let event;

            try {
                event = JSON.parse(rawBody);
            } catch {
                return jsonResponse(
                    { error: "Invalid JSON payload" },
                    400
                );
            }

            if (
                !event ||
                typeof event !== "object" ||
                Array.isArray(event) ||
                typeof event.id !== "string" ||
                typeof event.event_type !== "string" ||
                !event.resource ||
                typeof event.resource !== "object"
            ) {
                return jsonResponse(
                    { error: "Invalid webhook event structure" },
                    400
                );
            }

            const accessToken = await getPayPalAccessToken(
                apiBase,
                clientId,
                clientSecret
            );

            const signatureValid = await verifyWebhookSignature(
                apiBase,
                accessToken,
                webhookId,
                request.headers,
                event
            );

            if (!signatureValid) {
                console.error(
                    "PAYPAL WEBHOOK SIGNATURE VERIFICATION FAILED"
                );

                return jsonResponse(
                    { error: "Invalid webhook signature" },
                    401
                );
            }

            if (event.event_type !== "PAYMENT.CAPTURE.COMPLETED") {
                return jsonResponse({
                    received: true,
                    processed: false,
                    reason: "Event type not handled"
                });
            }

            const capture = event.resource;

            if (
                typeof capture.id !== "string" ||
                capture.status !== "COMPLETED" ||
                typeof capture.amount?.value !== "string" ||
                typeof capture.amount?.currency_code !== "string"
            ) {
                return jsonResponse(
                    { error: "Invalid completed capture event" },
                    400
                );
            }

            const supplementary =
                capture.supplementary_data?.related_ids;

            const orderId = supplementary?.order_id;

            if (
                typeof orderId !== "string" ||
                !/^[A-Z0-9-]{10,40}$/i.test(orderId)
            ) {
                return jsonResponse(
                    { error: "Invalid related PayPal order ID" },
                    400
                );
            }

            const order = await getPayPalOrder(
                apiBase,
                accessToken,
                orderId
            );

            const productId =
                order.purchase_units?.[0]?.custom_id;

            const product = lookupProduct(productId);

            if (!product) {
                console.error(
                    "PAYPAL WEBHOOK UNKNOWN PRODUCT",
                    { orderId }
                );

                return jsonResponse(
                    { error: "Product not available" },
                    400
                );
            }

            if (!validateOrder(order, orderId, product, capture)) {
                console.error(
                    "PAYPAL WEBHOOK ORDER VALIDATION FAILED",
                    { orderId, captureId: capture.id }
                );

                return jsonResponse(
                    { error: "PayPal order verification failed" },
                    409
                );
            }

            const customerEmail = getBuyerEmail(order);

            const fulfillment = await processCompletedCapture({
                capture: order.purchase_units[0].payments.captures.find(
                    item => item.id === capture.id
                ),
                orderId,
                product,
                customerEmail
            });

            if (fulfillment.emailMissing) {
                console.error(
                    "PAYPAL WEBHOOK EMAIL MISSING",
                    {
                        orderId,
                        captureId: capture.id,
                        purchaseId: fulfillment.purchaseId
                    }
                );

                return jsonResponse({
                    received: true,
                    processed: true,
                    fulfillmentStatus: "pending",
                    reason: "Buyer email requires verification"
                }, 202);
            }

            console.log(
                "PAYPAL WEBHOOK FULFILLMENT COMPLETED",
                {
                    eventId: event.id,
                    orderId,
                    captureId: capture.id,
                    purchaseId: fulfillment.purchaseId,
                    entitlementId: fulfillment.entitlementId
                }
            );

            return jsonResponse({
                received: true,
                processed: true,
                fulfillmentStatus: "ready"
            });

        } catch (error) {
            console.error(
                "PAYPAL WEBHOOK INTERNAL ERROR:",
                error.message
            );

            return jsonResponse(
                { error: "Internal server error" },
                500
            );
        }
    };
}

let defaultHandlerPromise;

export default async function handler(request) {
    if (!defaultHandlerPromise) {
        defaultHandlerPromise = import("../lib/paypal-fulfillment.js").then(
            ({
                getBuyerEmail,
                processCompletedCapture
            }) => createPayPalWebhookHandler({
                getBuyerEmail,
                processCompletedCapture
            })
        );
    }

    const webhookHandler = await defaultHandlerPromise;
    return webhookHandler(request);
}