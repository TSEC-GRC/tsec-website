// ============================================================
// TSEC — Paddle Webhook
// P1.9 Fulfillment / Provisioning
// ============================================================

export default async function handler(request) {

    // --------------------------------------------------------
    // Only POST requests are accepted
    // --------------------------------------------------------

    if (request.method !== "POST") {

        return new Response(
            JSON.stringify({
                error: "Method Not Allowed"
            }),
            {
                status: 405,
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );

    }


    // --------------------------------------------------------
    // Read raw webhook body
    // --------------------------------------------------------

    const rawBody = await request.text();


    // --------------------------------------------------------
    // Read Paddle signature
    // --------------------------------------------------------

    const signature =
        request.headers.get("paddle-signature");


    if (!signature) {

        console.error(
            "❌ Missing Paddle-Signature header"
        );

        return new Response(
            JSON.stringify({
                error: "Missing Paddle signature"
            }),
            {
                status: 400,
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );

    }


    // --------------------------------------------------------
    // Temporary development logging
    // --------------------------------------------------------

    console.log(
        "📩 Paddle webhook received"
    );

    console.log(
        "Signature received:",
        signature
    );


    // --------------------------------------------------------
    // Parse event
    // --------------------------------------------------------

    let event;

    try {

        event = JSON.parse(rawBody);

    } catch (error) {

        console.error(
            "❌ Invalid JSON payload:",
            error
        );

        return new Response(
            JSON.stringify({
                error: "Invalid JSON"
            }),
            {
                status: 400,
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );

    }


    // --------------------------------------------------------
    // Identify event type
    // --------------------------------------------------------

    const eventType =
        event?.event_type || "unknown";


    console.log(
        "Paddle event type:",
        eventType
    );


    // --------------------------------------------------------
    // Transaction completed
    // --------------------------------------------------------

    if (eventType === "transaction.completed") {

        console.log(
            "✅ Transaction completed"
        );

        console.log(
            "Transaction ID:",
            event?.data?.id || "unknown"
        );

    }


    // --------------------------------------------------------
    // Acknowledge webhook
    // --------------------------------------------------------

    return new Response(
        JSON.stringify({
            received: true
        }),
        {
            status: 200,
            headers: {
                "Content-Type": "application/json"
            }
        }
    );

}
