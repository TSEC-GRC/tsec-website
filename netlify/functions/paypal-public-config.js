/**
 * TSEC — PayPal Public Configuration
 *
 * Exposes only the public PayPal Client ID and environment.
 * Never expose PAYPAL_CLIENT_SECRET to the browser.
 */

function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff"
        }
    });
}

export default async (request) => {
    if (request.method !== "GET") {
        return jsonResponse(
            { error: "Method not allowed" },
            405
        );
    }

    const environment = process.env.PAYPAL_ENV;
    const clientId = process.env.PAYPAL_CLIENT_ID;

    if (
        !["sandbox", "live"].includes(environment) ||
        typeof clientId !== "string" ||
        !clientId.trim()
    ) {
        console.error("PAYPAL PUBLIC CONFIGURATION UNAVAILABLE");

        return jsonResponse(
            { error: "Payment service unavailable" },
            503
        );
    }

    return jsonResponse({
        clientId: clientId.trim(),
        environment
    });
};