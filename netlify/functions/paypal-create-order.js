
import { randomUUID } from "node:crypto";
import { getProductById } from "../lib/tsec-products.js";

/**
 * TSEC — PayPal Create Order
 *
 * Creates a PayPal Checkout order using the
 * authoritative private TSEC product catalog.
 *
 * The browser cannot determine the payment amount.
 */

function jsonResponse(data, status = 200) {
    return new Response(
        JSON.stringify(data),
        {
            status,
            headers: {
                "Content-Type": "application/json",
                "Cache-Control": "no-store"
            }
        }
    );
}

export default async (request) => {

    try {

        // =====================================================
        // METHOD
        // =====================================================

        if (request.method !== "POST") {
            return jsonResponse(
                { error: "Method not allowed" },
                405
            );
        }

        // =====================================================
        // ENVIRONMENT AND CREDENTIALS
        // =====================================================

        const paypalEnvironment =
            process.env.PAYPAL_ENV;

        const clientId =
            process.env.PAYPAL_CLIENT_ID;

        const clientSecret =
            process.env.PAYPAL_CLIENT_SECRET;

        if (
            !["sandbox", "live"].includes(paypalEnvironment) ||
            !clientId ||
            !clientSecret
        ) {
            console.error(
                "PAYPAL CONFIGURATION ERROR"
            );

            return jsonResponse(
                { error: "Payment service unavailable" },
                500
            );
        }

        const apiBase =
            paypalEnvironment === "sandbox"
                ? "https://api-m.sandbox.paypal.com"
                : "https://api-m.paypal.com";

        // =====================================================
        // REQUEST BODY
        // =====================================================

        let body;

        try {
            body = await request.json();
        } catch {
            return jsonResponse(
                { error: "Invalid JSON request" },
                400
            );
        }

        const productId =
            typeof body?.productId === "string"
                ? body.productId.trim()
                : "";

        if (!productId) {
            return jsonResponse(
                { error: "productId is required" },
                400
            );
        }

        const deliveryEmail =
            typeof body?.deliveryEmail === "string"
                ? body.deliveryEmail.trim().toLowerCase()
                : "";

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(deliveryEmail)) {
            return jsonResponse(
                { error: "A valid delivery email is required" },
                400
            );
        }

        // =====================================================
        // PRIVATE PRODUCT CATALOG
        // =====================================================

        const product =
            getProductById(productId);

        if (!product) {
            return jsonResponse(
                { error: "Product not available" },
                404
            );
        }

        // =====================================================
        // AUTHORITATIVE PRICE VALIDATION
        // =====================================================

        if (
            !/^\d+\.\d{2}$/.test(product.amount) ||
            product.currency !== "USD"
        ) {
            console.error(
                "INVALID PRIVATE PRODUCT PRICE:",
                productId
            );

            return jsonResponse(
                { error: "Product pricing unavailable" },
                500
            );
        }

        // =====================================================
        // PAYPAL OAUTH ACCESS TOKEN
        // =====================================================

        const credentials = Buffer.from(
            `${clientId}:${clientSecret}`
        ).toString("base64");

        const tokenResponse = await fetch(
            `${apiBase}/v1/oauth2/token`,
            {
                method: "POST",
                headers: {
                    "Authorization": `Basic ${credentials}`,
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Accept": "application/json"
                },
                body: "grant_type=client_credentials"
            }
        );

        const tokenData =
            await tokenResponse.json().catch(() => ({}));

        if (
            !tokenResponse.ok ||
            !tokenData.access_token
        ) {
            console.error(
                "PAYPAL OAUTH ERROR:",
                tokenResponse.status,
                tokenData.error || "Unable to obtain access token"
            );

            return jsonResponse(
                { error: "Payment authentication failed" },
                502
            );
        }

        // =====================================================
        // CREATE PAYPAL ORDER
        // =====================================================

        const orderPayload = {
            intent: "CAPTURE",

            purchase_units: [
                {
                    reference_id: product.productId,

                    custom_id: product.productId,

                    description: product.productName,

                    amount: {
                        currency_code: product.currency,
                        value: product.amount
                    }
                }
            ]
        };

        const orderResponse = await fetch(
            `${apiBase}/v2/checkout/orders`,
            {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${tokenData.access_token}`,
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Prefer": "return=representation",
                    "PayPal-Request-Id": randomUUID()
                },
                body: JSON.stringify(orderPayload)
            }
        );

        const orderData =
            await orderResponse.json().catch(() => ({}));

        if (
            !orderResponse.ok ||
            !orderData.id
        ) {
            console.error(
                "PAYPAL CREATE ORDER ERROR:",
                orderResponse.status,
                orderData.name || "Unknown PayPal error",
                orderData.message || ""
            );

            return jsonResponse(
                { error: "Unable to create payment order" },
                502
            );
        }

        // =====================================================
        // SAVE DELIVERY EMAIL AGAINST THE PAYPAL ORDER
        // =====================================================

        const { savePendingPayPalOrder } =
            await import("../lib/paypal-fulfillment.js");

        await savePendingPayPalOrder({
            orderId: orderData.id,
            productId: product.productId,
            customerEmail: deliveryEmail
        });

        // =====================================================
        // SUCCESS
        // =====================================================

        return jsonResponse({
            id: orderData.id,
            status: orderData.status,
            productId: product.productId,
            amount: product.amount,
            currency: product.currency
        });

    } catch (error) {

        console.error(
            "PAYPAL CREATE ORDER INTERNAL ERROR:",
            error.message
        );

        return jsonResponse(
            { error: "Internal server error" },
            500
        );
    }
};
