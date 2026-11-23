import crypto from "node:crypto";
import { createDownloadAuthorization } from "../lib/paypal-download-auth.js";
import { getProductById } from "../lib/tsec-products.js";

function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store"
        }
    });
}

async function getPayPalAccessToken(fetchImpl, apiBase, clientId, clientSecret) {
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

async function getPayPalOrder(fetchImpl, apiBase, accessToken, orderId) {
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

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error("Unable to retrieve PayPal order.");
    }

    return data;
}

function getCompletedCapture(order) {
    const captures =
        order?.purchase_units?.[0]?.payments?.captures || [];

    const completedCaptures = captures.filter(
        capture => capture?.status === "COMPLETED"
    );

    if (completedCaptures.length > 1) {
        throw new Error(
            "PayPal order contains multiple completed captures."
        );
    }

    return completedCaptures[0] || null;
}

function validateOrder(order, product) {
    if (order.intent !== "CAPTURE") {
        return false;
    }

    if (
        !Array.isArray(order.purchase_units) ||
        order.purchase_units.length !== 1
    ) {
        return false;
    }

    const unit = order.purchase_units[0];

    if (
        unit.reference_id !== product.productId ||
        unit.custom_id !== product.productId
    ) {
        return false;
    }

    if (
        unit.amount?.currency_code !== product.currency ||
        unit.amount?.value !== product.amount
    ) {
        return false;
    }

    return true;
}

function validateCapture(capture, product) {
    return Boolean(
        capture &&
        typeof capture.id === "string" &&
        capture.id &&
        capture.status === "COMPLETED" &&
        capture.amount?.currency_code === product.currency &&
        capture.amount?.value === product.amount
    );
}

/**
 * Create an isolated PayPal capture handler.
 * Tests inject all external dependencies; no real PayPal or DB calls are needed.
 */
export function createPayPalCaptureHandler({
    fetchImpl = (...args) => fetch(...args),
    env = process.env,
    lookupProduct = getProductById,
    getBuyerEmail,
    getPendingPayPalOrderEmail = async () => null,
    processCompletedCapture,
    authorizeDownload = createDownloadAuthorization
}) {
    if (
        typeof fetchImpl !== "function" ||
        typeof lookupProduct !== "function" ||
        typeof getBuyerEmail !== "function" ||
        typeof processCompletedCapture !== "function" ||
        typeof authorizeDownload !== "function"
    ) {
        throw new TypeError("Invalid PayPal capture handler dependencies.");
    }

    return async function paypalCaptureHandler(request) {
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
            const downloadTokenSecret = env.PAYPAL_DOWNLOAD_TOKEN_SECRET;

            if (
                !["sandbox", "live"].includes(environment) ||
                !clientId ||
                !clientSecret ||
                typeof downloadTokenSecret !== "string" ||
                !/^[a-f0-9]{64}$/i.test(downloadTokenSecret)
            ) {
                console.error("PAYPAL CONFIGURATION ERROR");

                return jsonResponse(
                    { error: "Payment service unavailable" },
                    500
                );
            }

            const apiBase =
                environment === "sandbox"
                    ? "https://api-m.sandbox.paypal.com"
                    : "https://api-m.paypal.com";

            let body;

            try {
                body = await request.json();
            } catch {
                return jsonResponse(
                    { error: "Invalid JSON request" },
                    400
                );
            }

            const orderId =
                typeof body?.orderId === "string"
                    ? body.orderId.trim()
                    : "";

            if (!/^[A-Z0-9-]{10,40}$/i.test(orderId)) {
                return jsonResponse(
                    { error: "Invalid PayPal order ID" },
                    400
                );
            }

            const accessToken = await getPayPalAccessToken(
                fetchImpl,
                apiBase,
                clientId,
                clientSecret
            );

            let order = await getPayPalOrder(
                fetchImpl,
                apiBase,
                accessToken,
                orderId
            );

            if (order.id !== orderId) {
                return jsonResponse(
                    { error: "PayPal order verification failed" },
                    400
                );
            }

            const productId =
                order.purchase_units?.[0]?.custom_id;

            const product = lookupProduct(productId);

            if (!product) {
                return jsonResponse(
                    { error: "Product not available" },
                    400
                );
            }

            if (!validateOrder(order, product)) {
                console.error(
                    "PAYPAL ORDER VALIDATION FAILED",
                    { orderId }
                );

                return jsonResponse(
                    { error: "Order details do not match TSEC pricing" },
                    400
                );
            }

            let capture = getCompletedCapture(order);

            if (!capture) {
                if (order.status !== "APPROVED") {
                    return jsonResponse(
                        { error: "PayPal order is not approved for capture" },
                        409
                    );
                }

                const captureRequestId = crypto
                    .createHash("sha256")
                    .update(`tsec-paypal-capture:${orderId}`)
                    .digest("hex")
                    .slice(0, 32);

                const captureResponse = await fetchImpl(
                    `${apiBase}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`,
                    {
                        method: "POST",
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                            "Content-Type": "application/json",
                            Accept: "application/json",
                            Prefer: "return=representation",
                            "PayPal-Request-Id": captureRequestId
                        },
                        body: JSON.stringify({})
                    }
                );

                const captureData =
                    await captureResponse.json().catch(() => ({}));

                if (captureResponse.ok) {
                    order = captureData;
                } else {
                    // Recover safely if a concurrent request captured the order.
                    order = await getPayPalOrder(
                        fetchImpl,
                        apiBase,
                        accessToken,
                        orderId
                    );

                    capture = getCompletedCapture(order);

                    if (!capture) {
                        console.error(
                            "PAYPAL CAPTURE ERROR",
                            {
                                status: captureResponse.status,
                                name: captureData.name || "Unknown error",
                                orderId
                            }
                        );

                        return jsonResponse(
                            { error: "Payment capture could not be completed" },
                            502
                        );
                    }
                }

                if (!capture) {
                    capture = getCompletedCapture(order);
                }
            }

            if (
                order.id !== orderId ||
                order.status !== "COMPLETED" ||
                !validateOrder(order, product) ||
                !validateCapture(capture, product)
            ) {
                console.error(
                    "PAYPAL CAPTURE VALIDATION FAILED",
                    { orderId }
                );

                return jsonResponse(
                    { error: "Payment capture verification failed" },
                    409
                );
            }

            const savedDeliveryEmail = await getPendingPayPalOrderEmail({
                orderId,
                productId: product.productId
            });

            const customerEmail =
                savedDeliveryEmail || getBuyerEmail(order);

            const fulfillment = await processCompletedCapture({
                capture,
                orderId,
                product,
                customerEmail
            });

            const downloadAuthorization = authorizeDownload(
                capture.id,
                downloadTokenSecret
            );

            if (fulfillment.emailMissing) {
                console.error(
                    "PAYPAL PAYMENT CAPTURED BUT BUYER EMAIL IS MISSING",
                    {
                        orderId,
                        captureId: capture.id,
                        purchaseId: fulfillment.purchaseId
                    }
                );

                return jsonResponse(
                    {
                        status: "payment_received",
                        fulfillmentStatus: "pending",
                        message: "Payment received. Download preparation requires buyer email verification.",
                        transactionId: capture.id,
                        downloadAuthorization
                    },
                    202
                );
            }

            console.log(
                "PAYPAL PURCHASE FULFILLED",
                {
                    orderId,
                    captureId: capture.id,
                    purchaseId: fulfillment.purchaseId,
                    entitlementId: fulfillment.entitlementId
                }
            );

            return jsonResponse({
                status: "COMPLETED",
                orderId,
                transactionId: capture.id,
                downloadAuthorization,
                productId: product.productId,
                amount: product.amount,
                currency: product.currency,
                fulfillmentStatus: "ready"
            });
        } catch (error) {
            console.error(
                "PAYPAL CAPTURE INTERNAL ERROR:",
                error.message
            );

            return jsonResponse(
                { error: "Internal server error" },
                500
            );
        }
    };
}

// Production handler: load DB-backed fulfillment only when invoked.
let defaultHandler;

export default async function handler(request) {
    try {
        if (!defaultHandler) {
            const fulfillment = await import("../lib/paypal-fulfillment.js");
      defaultHandler = createPayPalCaptureHandler({
        getBuyerEmail: fulfillment.getBuyerEmail,
        getPendingPayPalOrderEmail: fulfillment.getPendingPayPalOrderEmail,
        processCompletedCapture: fulfillment.processCompletedCapture
      });
        }

        return await defaultHandler(request);
    } catch (error) {
        console.error(
            "PAYPAL CAPTURE INITIALIZATION ERROR:",
            error.message
        );

        return jsonResponse(
            { error: "Internal server error" },
            500
        );
    }
}