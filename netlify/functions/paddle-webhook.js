// ============================================================
// TSEC — Paddle Webhook
// P1.9 Fulfillment / Provisioning
// Signature Verification
// ============================================================

import crypto from "crypto";


// ============================================================
// MAIN HANDLER
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
    // Read raw request body
    //
    // IMPORTANT:
    // Do not parse JSON before signature verification.
    // Paddle signs the raw request body.
    // --------------------------------------------------------

    const rawBody = await request.text();


    // --------------------------------------------------------
    // Get Paddle signature
    // --------------------------------------------------------

    const paddleSignature =
        request.headers.get("paddle-signature");


    if (!paddleSignature) {

        console.error(
            "❌ Paddle-Signature header is missing"
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
    // Get webhook secret from Netlify environment
    // --------------------------------------------------------

    const secretKey =
        process.env.PADDLE_WEBHOOK_SECRET;


    if (!secretKey) {

        console.error(
            "❌ PADDLE_WEBHOOK_SECRET is not configured"
        );

        return new Response(
            JSON.stringify({
                error: "Server misconfigured"
            }),
            {
                status: 500,
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );

    }


    // --------------------------------------------------------
    // Parse Paddle-Signature
    //
    // Expected format:
    //
    // ts=1234567890;h1=abcdef123456...
    // --------------------------------------------------------

    const signatureParts =
        paddleSignature.split(";");


    let timestamp = null;
    let receivedSignature = null;


    for (const part of signatureParts) {

        const [key, value] =
            part.split("=");


        if (key === "ts") {

            timestamp = value;

        }


        if (key === "h1") {

            receivedSignature = value;

        }

    }


    if (!timestamp || !receivedSignature) {

        console.error(
            "❌ Invalid Paddle-Signature format"
        );

        return new Response(
            JSON.stringify({
                error: "Invalid Paddle signature"
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
    // Validate timestamp
    //
    // Paddle recommends a short tolerance to help prevent
    // replay attacks.
    // --------------------------------------------------------

    const timestampSeconds =
        Number(timestamp);


    if (!Number.isFinite(timestampSeconds)) {

        console.error(
            "❌ Invalid Paddle timestamp"
        );

        return new Response(
            JSON.stringify({
                error: "Invalid timestamp"
            }),
            {
                status: 400,
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );

    }


    const currentTimestamp =
        Math.floor(Date.now() / 1000);


    const timestampDifference =
        Math.abs(
            currentTimestamp - timestampSeconds
        );


    if (timestampDifference > 5) {

        console.error(
            "❌ Paddle webhook timestamp outside tolerance"
        );

        return new Response(
            JSON.stringify({
                error: "Webhook timestamp expired"
            }),
            {
                status: 408,
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );

    }


    // --------------------------------------------------------
    // Build signed payload
    //
    // Paddle signs:
    //
    // timestamp + ":" + rawBody
    // --------------------------------------------------------

    const signedPayload =
        `${timestamp}:${rawBody}`;


    // --------------------------------------------------------
    // Calculate HMAC SHA-256
    // --------------------------------------------------------

    const expectedSignature =
        crypto
            .createHmac(
                "sha256",
                secretKey
            )
            .update(
                signedPayload,
                "utf8"
            )
            .digest("hex");


    // --------------------------------------------------------
    // Timing-safe signature comparison
    // --------------------------------------------------------

    const receivedBuffer =
        Buffer.from(
            receivedSignature,
            "hex"
        );


    const expectedBuffer =
        Buffer.from(
            expectedSignature,
            "hex"
        );


    if (
        receivedBuffer.length !==
        expectedBuffer.length
    ) {

        console.error(
            "❌ Paddle signature length mismatch"
        );

        return new Response(
            JSON.stringify({
                error: "Invalid signature"
            }),
            {
                status: 401,
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );

    }


    if (
        !crypto.timingSafeEqual(
            receivedBuffer,
            expectedBuffer
        )
    ) {

        console.error(
            "❌ Paddle signature verification failed"
        );

        return new Response(
            JSON.stringify({
                error: "Invalid signature"
            }),
            {
                status: 401,
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );

    }


    // --------------------------------------------------------
    // Signature verified
    // --------------------------------------------------------

    console.log(
        "✅ Paddle webhook signature verified"
    );


    // --------------------------------------------------------
    // Parse verified event
    // --------------------------------------------------------

    let event;


    try {

        event =
            JSON.parse(rawBody);

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
    // Identify event
    // --------------------------------------------------------

    const eventType =
        event?.event_type || "unknown";


    const eventId =
        event?.event_id || "unknown";


    console.log(
        "Paddle event type:",
        eventType
    );


    console.log(
        "Paddle event ID:",
        eventId
    );


    // --------------------------------------------------------
    // Transaction completed
    // --------------------------------------------------------

    if (
        eventType ===
        "transaction.completed"
    ) {

        const transactionId =
            event?.data?.id || "unknown";


        console.log(
            "✅ Transaction completed:",
            transactionId
        );


        // ----------------------------------------------------
        // P1.9.4 — Fulfillment will be added here
        // ----------------------------------------------------

        console.log(
            "📦 Fulfillment processing will be added next."
        );

    }


    // --------------------------------------------------------
    // Acknowledge webhook
    // --------------------------------------------------------

    return new Response(
        JSON.stringify({
            received: true,
            verified: true,
            event_type: eventType
        }),
        {
            status: 200,
            headers: {
                "Content-Type": "application/json"
            }
        }
    );

}
